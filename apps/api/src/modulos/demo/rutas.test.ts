import { afterAll, expect, test } from 'vitest';
import { crearApp } from '../../app';
import { crearBd, type Bd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { crearUsuario } from '../auth/servicio';
import { NOMBRE_DEMO } from './servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

class Deshacer extends Error {}

// En una transacción que se revierte: la demo crea insumos y APUs globales.
test('demo: solo admin, crea oferta y bloques, y repetir no duplica', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      for (const [u, rol] of [
        ['tdemo-admin', 'admin'],
        ['tdemo-cot', 'cotizador'],
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
      const pedir = (cookie: string, method: 'GET' | 'POST', url: string) =>
        app.inject({ method, url, headers: { cookie } });

      expect((await pedir(await entrar('tdemo-cot'), 'POST', '/api/demo/cargar')).statusCode).toBe(
        403,
      );

      const admin = await entrar('tdemo-admin');
      expect((await pedir(admin, 'GET', '/api/demo')).json()).toEqual({ ofertaId: null });
      const a = await pedir(admin, 'POST', '/api/demo/cargar');
      expect(a.statusCode).toBe(201);
      const oferta = (await pedir(admin, 'GET', `/api/ofertas/${a.json().ofertaId}`)).json();
      expect(oferta.nombre).toBe(NOMBRE_DEMO);
      expect(oferta.capitulos).toHaveLength(1);
      expect(oferta.rubros.length).toBeGreaterThan(0);
      const bloques = (await pedir(admin, 'GET', '/api/bloques')).json();
      expect(bloques.items.length).toBeGreaterThanOrEqual(4);

      expect((await pedir(admin, 'GET', '/api/demo')).json()).toEqual({
        ofertaId: a.json().ofertaId,
      });
      const b = await pedir(admin, 'POST', '/api/demo/cargar');
      expect(b.statusCode).toBe(200);
      expect(b.json()).toEqual({ ofertaId: a.json().ofertaId, creada: false });
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});
