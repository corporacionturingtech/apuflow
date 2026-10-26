import { afterAll, beforeAll, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { bitacora, usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

let app: ReturnType<typeof crearApp>;
let galleta = '';
let uid = '';

beforeAll(async () => {
  app = crearApp(db);
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'lector-bit'));
  await crearUsuario(db, {
    nombreUsuario: 'lector-bit',
    nombre: 'Lola Lectora',
    clave: 'clave-segura-1',
    rol: 'lector',
  });
  const [u] = await db.select().from(usuario).where(eq(usuario.nombreUsuario, 'lector-bit'));
  uid = u!.id;
  await db.delete(bitacora).where(like(bitacora.entidad, 'tbit_%'));
  await db.insert(bitacora).values(
    [1, 2, 3].map((n) => ({
      usuarioId: uid,
      entidad: n === 3 ? 'tbit_otra' : 'tbit_cosa',
      campo: 'cantidad',
      antes: { valor: String(n) },
      despues: { valor: String(n + 1) },
      fecha: new Date(`2020-01-0${n}T12:00:00`),
    })),
  );
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { nombreUsuario: 'lector-bit', clave: 'clave-segura-1' },
  });
  galleta = res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
});

const pedir = (q: string) =>
  app.inject({
    method: 'GET',
    url: `/api/bitacora?usuarioId=${uid}${q}`,
    headers: { cookie: galleta },
  });

test('pide sesión', async () => {
  expect((await app.inject({ method: 'GET', url: '/api/bitacora' })).statusCode).toBe(401);
});

test('lista lo más reciente primero, con el nombre de quien lo hizo', async () => {
  const j = (await pedir('')).json();
  expect(j.items.map((x: { entidad: string }) => x.entidad)).toEqual([
    'tbit_otra',
    'tbit_cosa',
    'tbit_cosa',
  ]);
  expect(j.items[0].usuario).toBe('Lola Lectora');
  expect(j.hayMas).toBe(false);
});

test('filtra por entidad y por rango de fechas', async () => {
  expect((await pedir('&entidad=tbit_cosa')).json().items).toHaveLength(2);
  const r = (await pedir('&desde=2020-01-02&hasta=2020-01-02')).json();
  expect(r.items).toHaveLength(1);
  expect(r.items[0].antes).toEqual({ valor: '2' });
});

test('pagina con limite y saltar', async () => {
  const a = (await pedir('&limite=2')).json();
  expect(a.items).toHaveLength(2);
  expect(a.hayMas).toBe(true);
  const b = (await pedir('&limite=2&saltar=2')).json();
  expect(b.items).toHaveLength(1);
  expect(b.hayMas).toBe(false);
  expect((await pedir('&limite=0')).statusCode).toBe(400);
});
