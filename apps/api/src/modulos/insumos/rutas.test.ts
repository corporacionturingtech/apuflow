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

test('lista por tipo sin mezclar y trae la herramienta menor', async () => {
  await crear(galletaPrecios, { tipo: 'EQ', codigo: 'T-001', unidad: 'h' });
  const eq = await app.inject({
    method: 'GET',
    url: '/api/insumos?tipo=EQ&q=T-001',
    headers: { cookie: galletaLector },
  });
  expect(eq.json().items).toHaveLength(1);
  expect(eq.json().herramientaMenor.pct).toMatch(/^\d/);
  const ma = await app.inject({
    method: 'GET',
    url: '/api/insumos?tipo=MA&q=T-001',
    headers: { cookie: galletaLector },
  });
  expect(ma.json().items).toEqual([]);
});

const patchHm = (cookie: string, payload: object) =>
  app.inject({ method: 'PATCH', url: '/api/herramienta-menor', headers: { cookie }, payload });
const leerHm = async () =>
  (
    await app.inject({
      method: 'GET',
      url: '/api/insumos?tipo=EQ&q=sin-resultados',
      headers: { cookie: galletaLector },
    })
  ).json().herramientaMenor as { pct: string; version: number };

test('herramienta menor: cambia, deja bitácora y respeta la versión', async () => {
  const antes = await leerHm();
  const nuevo = Number(antes.pct) === 7.5 ? '6' : '7.5';
  const ok = await patchHm(galletaPrecios, { version: antes.version, pct: nuevo });
  expect(ok.statusCode).toBe(200);
  expect(Number(ok.json().pct)).toBe(Number(nuevo));
  expect(ok.json().version).toBe(antes.version + 1);
  const bit = await db.select().from(bitacora).where(eq(bitacora.entidad, 'config_empresa'));
  expect(bit.some((b) => b.campo === 'pctHerramientaMenor')).toBe(true);
  expect((await patchHm(galletaPrecios, { version: antes.version, pct: '9' })).statusCode).toBe(
    409,
  );
});

test('herramienta menor: lector 403 y porcentaje fuera de 0–100 es 400', async () => {
  const hm = await leerHm();
  expect((await patchHm(galletaLector, { version: hm.version, pct: '5' })).statusCode).toBe(403);
  expect((await patchHm(galletaPrecios, { version: hm.version, pct: '101' })).statusCode).toBe(400);
  expect((await patchHm(galletaPrecios, { version: hm.version, pct: 'x' })).statusCode).toBe(400);
});

const accion = (cookie: string, id: string, que: 'eliminar' | 'restaurar', version: number) =>
  app.inject({
    method: 'POST',
    url: `/api/insumos/${id}/${que}`,
    headers: { cookie },
    payload: { version },
  });
const codigos = async (papelera: boolean) =>
  (
    await app.inject({
      method: 'GET',
      url: `/api/insumos?tipo=MA&q=T-001&papelera=${papelera}`,
      headers: { cookie: galletaLector },
    })
  )
    .json()
    .items.map((i: { codigo: string }) => i.codigo);

test('eliminar manda a la papelera, restaurar vuelve, y ambos dejan bitácora', async () => {
  const { id, version } = (await crear(galletaPrecios)).json();
  const el = await accion(galletaPrecios, id, 'eliminar', version);
  expect(el.statusCode).toBe(200);
  expect(el.json().eliminadoEn).not.toBeNull();
  expect(await codigos(false)).toEqual([]);
  expect(await codigos(true)).toEqual(['T-001']);
  const re = await accion(galletaPrecios, id, 'restaurar', el.json().version);
  expect(re.json().eliminadoEn).toBeNull();
  expect(await codigos(false)).toEqual(['T-001']);
  const bit = await db.select().from(bitacora).where(eq(bitacora.entidadId, id));
  expect(bit.filter((b) => b.campo === 'eliminadoEn')).toHaveLength(2);
});

test('eliminar: versión vieja 409, lector 403, inexistente 404', async () => {
  const { id, version } = (await crear(galletaPrecios)).json();
  expect((await accion(galletaLector, id, 'eliminar', version)).statusCode).toBe(403);
  expect((await accion(galletaPrecios, id, 'eliminar', version + 5)).statusCode).toBe(409);
  const nada = '00000000-0000-4000-8000-000000000000';
  expect((await accion(galletaPrecios, nada, 'eliminar', 1)).statusCode).toBe(404);
});

test('código repetido entre activos: 409 al crear y al restaurar', async () => {
  const a = (await crear(galletaPrecios)).json();
  expect((await crear(galletaPrecios)).statusCode).toBe(409);
  const el = await accion(galletaPrecios, a.id, 'eliminar', a.version);
  const b = await crear(galletaPrecios); // el código quedó libre
  expect(b.statusCode).toBe(201);
  const re = await accion(galletaPrecios, a.id, 'restaurar', el.json().version);
  expect(re.statusCode).toBe(409);
});
