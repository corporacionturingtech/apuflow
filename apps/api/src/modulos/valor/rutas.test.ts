import { afterAll, expect, test } from 'vitest';
import { crearApp } from '../../app';
import { crearBd, type Bd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

class Deshacer extends Error {}

// Transacción que se revierte; las cifras son globales a la BD, así que se comparan diferencias.
test('valor: solo admin, cuenta lo hecho en el mes y las horas siguen a los minutos', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      for (const [u, rol] of [
        ['tval-admin', 'admin'],
        ['tval-cot', 'cotizador'],
      ] as const)
        await crearUsuario(t, { nombreUsuario: u, nombre: u, clave: 'clave-segura-1', rol });
      const app = crearApp(t);
      const entrar = async (u: string) => {
        const r = await app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { nombreUsuario: u, clave: 'clave-segura-1' },
        });
        return r.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      };
      const admin = await entrar('tval-admin');
      const pedir = (
        cookie: string,
        method: 'GET' | 'POST' | 'PUT',
        url: string,
        payload?: object,
      ) => app.inject({ method, url, headers: { cookie }, payload });

      expect((await pedir(await entrar('tval-cot'), 'GET', '/api/valor')).statusCode).toBe(403);
      expect((await pedir(admin, 'GET', '/api/valor?mes=2026-13')).statusCode).toBe(400);

      const antes = (await pedir(admin, 'GET', '/api/valor')).json();
      const lejano = (await pedir(admin, 'GET', '/api/valor?mes=2001-01')).json();
      expect(lejano.ofertasCreadas).toBe(0);
      expect(lejano.horasAhorradas).toBe(0);

      await pedir(admin, 'POST', '/api/demo/cargar');
      const o = (await pedir(admin, 'POST', '/api/ofertas', { nombre: 'OFE-VAL prueba' })).json();
      const bloques = (await pedir(admin, 'GET', '/api/bloques')).json().items;
      const ap = await pedir(admin, 'POST', `/api/ofertas/${o.id}/bloques`, {
        bloqueId: bloques[0].id,
      });
      expect(ap.statusCode).toBe(201);
      expect(
        (
          await pedir(admin, 'POST', `/api/ofertas/${o.id}/versiones`, {
            nombre: 'v1',
            emitir: true,
          })
        ).statusCode,
      ).toBe(201);

      const despues = (await pedir(admin, 'GET', '/api/valor')).json();
      expect(despues.ofertasCreadas).toBeGreaterThan(antes.ofertasCreadas);
      expect(despues.ofertasEmitidas).toBeGreaterThan(antes.ofertasEmitidas);
      expect(despues.bloquesAplicados).toBeGreaterThan(antes.bloquesAplicados);
      expect(despues.rubrosPorBloque).toBeGreaterThan(antes.rubrosPorBloque);
      expect(despues.parametros).toEqual({ minutosPorRubro: 3, minutosPorRecalculo: 2 });

      // Con 60 min por rubro, cada rubro por bloque vale una hora
      const cambio = await pedir(admin, 'PUT', '/api/valor/parametros', {
        version: despues.version,
        minutosPorRubro: 60,
        minutosPorRecalculo: 0,
      });
      expect(cambio.statusCode).toBe(200);
      expect(cambio.json().horasAhorradas).toBeCloseTo(cambio.json().rubrosPorBloque, 1);
      const viejo = await pedir(admin, 'PUT', '/api/valor/parametros', {
        version: despues.version,
        minutosPorRubro: 1,
        minutosPorRecalculo: 1,
      });
      expect(viejo.statusCode).toBe(409);
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});
