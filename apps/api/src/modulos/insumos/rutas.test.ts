import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { bitacora, historialPrecio, insumo, usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

const clave = 'clave-segura-1';
let app: ReturnType<typeof crearApp>;
let galletaPrecios = '';
let galletaLector = '';

async function entrar(nombreUsuario: string, rol: 'precios' | 'lector') {
  await db.delete(usuario).where(eq(usuario.nombreUsuario, nombreUsuario));
  await crearUsuario(db, { nombreUsuario, nombre: nombreUsuario, clave, rol });
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { nombreUsuario, clave },
  });
  return res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

beforeAll(async () => {
  app = crearApp(db);
  galletaPrecios = await entrar('precios-ins', 'precios');
  galletaLector = await entrar('lector-ins', 'lector');
});

beforeEach(async () => {
  const previos = await db.select({ id: insumo.id }).from(insumo).where(eq(insumo.codigo, 'T-001'));
  if (previos.length) {
    await db.delete(bitacora).where(
      inArray(
        bitacora.entidadId,
        previos.map((p) => p.id),
      ),
    );
    await db.delete(insumo).where(
      inArray(
        insumo.id,
        previos.map((p) => p.id),
      ),
    );
  }
});

const crear = (cookie: string, extra = {}) =>
  app.inject({
    method: 'POST',
    url: '/api/insumos',
    headers: { cookie },
    payload: {
      tipo: 'MA',
      codigo: 'T-001',
      descripcion: 'Cable 2/0 AWG de prueba',
      unidad: 'm',
      pu: '9.6',
      ...extra,
    },
  });

test('sin sesión: 401', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/insumos?tipo=MA' });
  expect(res.statusCode).toBe(401);
});

test('crea, lista y filtra por texto; devuelve el factor', async () => {
  const c = await crear(galletaPrecios);
  expect(c.statusCode).toBe(201);
  const lista = await app.inject({
    method: 'GET',
    url: '/api/insumos?tipo=MA&q=2/0',
    headers: { cookie: galletaLector },
  });
  const cuerpo = lista.json();
  expect(cuerpo.items.map((i: { codigo: string }) => i.codigo)).toContain('T-001');
  expect(cuerpo.factor).toMatch(/^\d/);
  const otra = await app.inject({
    method: 'GET',
    url: '/api/insumos?tipo=EQ&q=2/0',
    headers: { cookie: galletaLector },
  });
  expect(otra.json().items).toEqual([]);
});

test('lector no puede crear ni editar: 403', async () => {
  expect((await crear(galletaLector)).statusCode).toBe(403);
});

test('editar el PU guarda precio referencial, historial y bitácora, y sube la versión', async () => {
  const { id, version } = (await crear(galletaPrecios)).json();
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/insumos/${id}`,
    headers: { cookie: galletaPrecios },
    payload: { version, pu: '10.4' },
  });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toMatchObject({ pu: '10.400000', precioAnterior: '9.600000', version: 2 });
  const hist = await db.select().from(historialPrecio).where(eq(historialPrecio.insumoId, id));
  expect(hist).toHaveLength(1);
  const bit = await db.select().from(bitacora).where(eq(bitacora.entidadId, id));
  expect(
    bit.some((b) => b.campo === 'pu' && JSON.stringify(b.antes) === '{"valor":"9.600000"}'),
  ).toBe(true);
});

test('versión vieja: 409 y no cambia nada', async () => {
  const { id, version } = (await crear(galletaPrecios)).json();
  const patch = (pu: string) =>
    app.inject({
      method: 'PATCH',
      url: `/api/insumos/${id}`,
      headers: { cookie: galletaPrecios },
      payload: { version, pu },
    });
  expect((await patch('10')).statusCode).toBe(200);
  const choque = await patch('11');
  expect(choque.statusCode).toBe(409);
  const [fila] = await db.select().from(insumo).where(eq(insumo.id, id));
  expect(fila?.pu).toBe('10.000000');
});

test('precio inválido: 400', async () => {
  const { id, version } = (await crear(galletaPrecios)).json();
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/insumos/${id}`,
    headers: { cookie: galletaPrecios },
    payload: { version, pu: 'abc' },
  });
  expect(res.statusCode).toBe(400);
});
