import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { apu, bitacora, insumo, lineaApu, usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

const clave = 'clave-segura-1';
let app: ReturnType<typeof crearApp>;
let galletaPrecios = '';
let galletaLector = '';
let apuId = '';
let ayudante = '';
let peon = '';

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
  galletaPrecios = await entrar('precios-apu', 'precios');
  galletaLector = await entrar('lector-apu', 'lector');
});

// Receta ficticia: un APU con un ayudante (cantidad 3) y un peón sin usar.
beforeEach(async () => {
  await db.delete(apu).where(like(apu.codigo, 'TAPU-%'));
  await db.delete(insumo).where(like(insumo.codigo, 'TAPU-%'));
  const [a] = await db
    .insert(apu)
    .values({ codigo: 'TAPU-1', descripcion: 'Montaje ficticio', unidad: 'u', rendimiento: '2' })
    .returning();
  const [i1, i2] = await db
    .insert(insumo)
    .values([
      { tipo: 'MO', codigo: 'TAPU-MO1', descripcion: 'Ayudante ficticio', unidad: 'hora', pu: '3' },
      { tipo: 'MO', codigo: 'TAPU-MO2', descripcion: 'Peón ficticio', unidad: 'hora', pu: '2.5' },
    ])
    .returning();
  apuId = a!.id;
  ayudante = i1!.id;
  peon = i2!.id;
  await db.insert(lineaApu).values({ apuId, insumoId: ayudante, cantidad: '3', orden: 1 });
});

const get = (cookie: string, url: string) =>
  app.inject({ method: 'GET', url, headers: { cookie } });
const enviar = (cookie: string, method: 'POST' | 'PATCH', url: string, payload: object) =>
  app.inject({ method, url, headers: { cookie }, payload });

test('sin sesión: 401', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/apus' });
  expect(res.statusCode).toBe(401);
});

test('lista y detalle con líneas, insumo, factor y herramienta menor', async () => {
  const lista = await get(galletaLector, '/api/apus?q=TAPU-1');
  expect(lista.json().items).toMatchObject([
    { codigo: 'TAPU-1', lineas: 1, rendimiento: '2.000000' },
  ]);

  const d = (await get(galletaLector, `/api/apus/${apuId}`)).json();
  expect(d.lineasApu).toMatchObject([{ codigo: 'TAPU-MO1', tipo: 'MO', cantidad: '3.000000' }]);
  expect(d.factor).toBeDefined();
  expect(d.herramientaMenor).toBeDefined();
  expect((await get(galletaLector, '/api/apus/no-es-id')).statusCode).toBe(404);
});

test('cambiar cantidad sube la versión y deja bitácora', async () => {
  const d = (await get(galletaPrecios, `/api/apus/${apuId}`)).json();
  const res = await enviar(
    galletaPrecios,
    'PATCH',
    `/api/apus/${apuId}/lineas/${d.lineasApu[0].id}`,
    {
      version: d.version,
      cantidad: '4',
    },
  );
  expect(res.statusCode).toBe(200);
  expect(res.json()).toMatchObject({
    version: d.version + 1,
    lineasApu: [{ cantidad: '4.000000' }],
  });
  const reg = await db.select().from(bitacora).where(eq(bitacora.entidadId, d.lineasApu[0].id));
  expect(reg).toMatchObject([
    { campo: 'cantidad', antes: { valor: '3.000000' }, despues: { valor: '4' } },
  ]);
});

test('versión vieja: 409; lector: 403', async () => {
  const d = (await get(galletaPrecios, `/api/apus/${apuId}`)).json();
  const url = `/api/apus/${apuId}/lineas/${d.lineasApu[0].id}`;
  expect(
    (await enviar(galletaPrecios, 'PATCH', url, { version: d.version, cantidad: '5' })).statusCode,
  ).toBe(200);
  expect(
    (await enviar(galletaPrecios, 'PATCH', url, { version: d.version, cantidad: '6' })).statusCode,
  ).toBe(409);
  expect(
    (await enviar(galletaLector, 'PATCH', url, { version: d.version + 1, cantidad: '6' }))
      .statusCode,
  ).toBe(403);
});

test('rendimiento: edita y registra; cantidad no válida: 400', async () => {
  const d = (await get(galletaPrecios, `/api/apus/${apuId}`)).json();
  const res = await enviar(galletaPrecios, 'PATCH', `/api/apus/${apuId}`, {
    version: d.version,
    rendimiento: '2.5',
  });
  expect(res.json()).toMatchObject({ rendimiento: '2.500000', version: d.version + 1 });
  const mal = await enviar(galletaPrecios, 'PATCH', `/api/apus/${apuId}`, {
    version: d.version + 1,
    rendimiento: 'abc',
  });
  expect(mal.statusCode).toBe(400);
  const reg = await db.select().from(bitacora).where(eq(bitacora.entidadId, apuId));
  expect(reg).toMatchObject([{ campo: 'rendimiento' }]);
});

test('agregar línea: no repite insumo; quitar la borra', async () => {
  const d = (await get(galletaPrecios, `/api/apus/${apuId}`)).json();
  const nueva = await enviar(galletaPrecios, 'POST', `/api/apus/${apuId}/lineas`, {
    version: d.version,
    insumoId: peon,
    cantidad: '2',
  });
  expect(nueva.statusCode).toBe(201);
  expect(nueva.json().lineasApu).toHaveLength(2);

  const repetida = await enviar(galletaPrecios, 'POST', `/api/apus/${apuId}/lineas`, {
    version: d.version + 1,
    insumoId: peon,
  });
  expect(repetida.statusCode).toBe(409);

  const lineaPeon = nueva.json().lineasApu.find((l: { insumoId: string }) => l.insumoId === peon);
  const quitada = await enviar(
    galletaPrecios,
    'POST',
    `/api/apus/${apuId}/lineas/${lineaPeon.id}/quitar`,
    { version: d.version + 1 },
  );
  expect(quitada.json().lineasApu).toHaveLength(1);
});
