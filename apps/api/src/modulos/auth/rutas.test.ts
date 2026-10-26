import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { sesion, usuario } from '../../db/esquema';
import { crearUsuario } from './servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

const base = { nombre: 'Prueba', clave: 'clave-segura-1' };
beforeAll(async () => {
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'ana'));
  await crearUsuario(db, { ...base, nombreUsuario: 'ana', rol: 'cotizador' });
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'inactivo'));
  await crearUsuario(db, { ...base, nombreUsuario: 'inactivo', rol: 'lector', activo: false });
});

function appConRutasProtegidas() {
  const app = crearApp(db);
  app.get('/api/_prueba/precios', { preHandler: app.exigirRol('admin', 'precios') }, async () => ({
    ok: true,
  }));
  app.get('/api/_prueba/sesion', { preHandler: app.autenticar }, async () => ({ ok: true }));
  return app;
}

const login = (app: ReturnType<typeof crearApp>, nombreUsuario: string, clave = base.clave) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: { nombreUsuario, clave } });

const galleta = (res: { cookies: { name: string; value: string }[] }) =>
  res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');

let app: ReturnType<typeof appConRutasProtegidas>;
beforeEach(() => {
  app = appConRutasProtegidas();
});

test('login correcto: cookie httpOnly y /yo devuelve el usuario', async () => {
  const res = await login(app, 'ana');
  expect(res.statusCode).toBe(200);
  expect(res.cookies[0]).toMatchObject({
    name: 'sesion',
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
  });
  const yo = await app.inject({
    method: 'GET',
    url: '/api/auth/yo',
    headers: { cookie: galleta(res) },
  });
  expect(yo.statusCode).toBe(200);
  expect(yo.json()).toMatchObject({ nombreUsuario: 'ana', rol: 'cotizador' });
  expect(yo.json()).not.toHaveProperty('claveHash');
});

test.each([
  ['clave incorrecta', 'ana', 'otra-clave'],
  ['usuario inexistente', 'nadie', base.clave],
  ['usuario inactivo', 'inactivo', base.clave],
])('login rechazado: %s', async (_caso, usuarioNombre, clave) => {
  const res = await login(app, usuarioNombre, clave);
  expect(res.statusCode).toBe(401);
  expect(res.cookies).toHaveLength(0);
  expect(res.json().mensaje).toBe('Usuario o clave incorrectos');
});

test('ruta protegida: 401 sin sesión, 403 con rol insuficiente', async () => {
  expect((await app.inject({ method: 'GET', url: '/api/_prueba/sesion' })).statusCode).toBe(401);
  const res = await login(app, 'ana');
  const headers = { cookie: galleta(res) };
  expect(
    (await app.inject({ method: 'GET', url: '/api/_prueba/sesion', headers })).statusCode,
  ).toBe(200);
  expect(
    (await app.inject({ method: 'GET', url: '/api/_prueba/precios', headers })).statusCode,
  ).toBe(403);
});

test('ruta con rol adecuado responde 200', async () => {
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'precios1'));
  await crearUsuario(db, { ...base, nombreUsuario: 'precios1', rol: 'precios' });
  const res = await login(app, 'precios1');
  const r = await app.inject({
    method: 'GET',
    url: '/api/_prueba/precios',
    headers: { cookie: galleta(res) },
  });
  expect(r.statusCode).toBe(200);
});

test('logout invalida la sesión', async () => {
  const res = await login(app, 'ana');
  const headers = { cookie: galleta(res) };
  expect((await app.inject({ method: 'POST', url: '/api/auth/logout', headers })).statusCode).toBe(
    204,
  );
  expect((await app.inject({ method: 'GET', url: '/api/auth/yo', headers })).statusCode).toBe(401);
});

test('sesión expirada o de usuario desactivado: 401', async () => {
  const res = await login(app, 'ana');
  const headers = { cookie: galleta(res) };
  // Solo las sesiones de ana: otros archivos de prueba corren en paralelo con las suyas.
  const [ana] = await db.select().from(usuario).where(eq(usuario.nombreUsuario, 'ana'));
  await db
    .update(sesion)
    .set({ expira: new Date(Date.now() - 1000) })
    .where(eq(sesion.usuarioId, ana!.id));
  expect((await app.inject({ method: 'GET', url: '/api/auth/yo', headers })).statusCode).toBe(401);

  const res2 = await login(app, 'ana');
  await db.update(usuario).set({ activo: false }).where(eq(usuario.nombreUsuario, 'ana'));
  const r = await app.inject({
    method: 'GET',
    url: '/api/auth/yo',
    headers: { cookie: galleta(res2) },
  });
  expect(r.statusCode).toBe(401);
  await db.update(usuario).set({ activo: true }).where(eq(usuario.nombreUsuario, 'ana'));
});
