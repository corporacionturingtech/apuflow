import { generateKeyPairSync, sign } from 'node:crypto';
import { afterAll, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import type { LicenciaContenido } from 'tipos';
import { crearApp } from '../../app';
import { crearBd, type Bd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { bitacora, oferta } from '../../db/esquema';
import { canonico } from '../../licencia/verificar';
import { contenido } from '../../licencia/contenido-prueba';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

const par = generateKeyPairSync('ed25519');
const pem = par.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const firmada = (c: LicenciaContenido) => ({
  contenido: c,
  firma: sign(null, Buffer.from(canonico(c)), par.privateKey).toString('base64'),
});
const isoEn = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

class Deshacer extends Error {}

// Todo ocurre dentro de una transacción que se revierte: la licencia es estado global de la BD
// y los demás archivos de prueba corren en paralelo contra la misma base.
test('licencia: límite de usuarios, solo lectura tras la gracia y exportar siempre', async () => {
  await expect(
    db.transaction(async (tx) => {
      const t = tx as unknown as Bd;
      await crearUsuario(t, {
        nombreUsuario: 'tlic-admin',
        nombre: 'A',
        clave: 'clave-segura-1',
        rol: 'admin',
      });
      const app = crearApp(t, { clavePublica: pem });
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { nombreUsuario: 'tlic-admin', clave: 'clave-segura-1' },
      });
      const galleta = login.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      const pedir = (method: 'GET' | 'PUT' | 'POST' | 'PATCH', url: string, payload?: object) =>
        app.inject({ method, url, headers: { cookie: galleta }, payload });

      const sin = (await pedir('GET', '/api/licencia/estado')).json();
      expect(sin.estado).toBe('sin_licencia');
      const base = { ...contenido, maxUsuarios: 1000, instalacion: sin.instalacion };

      // Firma inválida e instalación ajena
      const mala = firmada(base);
      expect(
        (await pedir('PUT', '/api/licencia', { ...mala, contenido: { ...base, maxUsuarios: 99 } }))
          .statusCode,
      ).toBe(400);
      expect(
        (await pedir('PUT', '/api/licencia', firmada({ ...base, instalacion: 'otra' }))).statusCode,
      ).toBe(409);

      // Vigente con cupo agotado: no deja crear usuarios
      const vigente = await pedir(
        'PUT',
        '/api/licencia',
        firmada({ ...base, maxUsuarios: sin.usuariosActivos, vence: isoEn(60) }),
      );
      expect(vigente.json()).toMatchObject({ estado: 'vigente', cliente: contenido.cliente });
      const nuevo = {
        nombreUsuario: 'tlic-nuevo',
        nombre: 'N',
        clave: 'clave-segura-2',
        rol: 'lector',
      };
      expect((await pedir('POST', '/api/usuarios', nuevo)).statusCode).toBe(409);

      // Estados por fecha
      expect(
        (await pedir('PUT', '/api/licencia', firmada({ ...base, vence: isoEn(5) }))).json().estado,
      ).toBe('por_vencer');
      expect(
        (await pedir('PUT', '/api/licencia', firmada({ ...base, vence: isoEn(-3) }))).json().estado,
      ).toBe('gracia');
      expect((await pedir('POST', '/api/usuarios', nuevo)).statusCode).toBe(201);

      // Vencida pasada la gracia: no edita, sí ve y exporta
      const [o] = await t.insert(oferta).values({ nombre: 'TLIC-1', tipo: 'publico' }).returning();
      const vencida = await pedir('PUT', '/api/licencia', firmada({ ...base, vence: isoEn(-40) }));
      expect(vencida.json().estado).toBe('solo_lectura');
      const editar = await pedir('PATCH', `/api/ofertas/${o!.id}`, { version: 1, nombre: 'X' });
      expect(editar.statusCode).toBe(403);
      expect(editar.json().mensaje).toContain('vencida');
      expect((await pedir('GET', '/api/ofertas')).statusCode).toBe(200);
      expect((await pedir('GET', `/api/ofertas/${o!.id}/exportar`)).statusCode).toBe(200);

      const registros = await t.select().from(bitacora).where(eq(bitacora.entidad, 'licencia'));
      expect(registros.length).toBeGreaterThanOrEqual(4);
      throw new Deshacer();
    }),
  ).rejects.toBeInstanceOf(Deshacer);
});
