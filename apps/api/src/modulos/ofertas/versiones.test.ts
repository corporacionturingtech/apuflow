import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import {
  apu,
  bitacora,
  capitulo,
  insumo,
  lineaApu,
  oferta,
  rubro,
  usuario,
} from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

const clave = 'clave-segura-1';
let app: ReturnType<typeof crearApp>;
let galletaCotizador = '';
let galletaLector = '';
let ofertaId = '';
let rubroId = '';

async function entrar(nombreUsuario: string, rol: 'cotizador' | 'lector') {
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
  galletaCotizador = await entrar('cotiza-ver', 'cotizador');
  galletaLector = await entrar('lector-ver', 'lector');
});

// Oferta ficticia: un capítulo con un rubro de un APU de un ayudante (3 $/h, R=2) × 10 unidades.
beforeEach(async () => {
  await db.delete(oferta).where(like(oferta.nombre, 'TVER-%'));
  await db.delete(apu).where(like(apu.codigo, 'TVER-%'));
  await db.delete(insumo).where(like(insumo.codigo, 'TVER-%'));
  const [i] = await db
    .insert(insumo)
    .values({ tipo: 'MO', codigo: 'TVER-MO1', descripcion: 'Ayudante', unidad: 'hora', pu: '3' })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({ codigo: 'TVER-1', descripcion: 'Montaje', unidad: 'u', rendimiento: '2' })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: i!.id, cantidad: '1' });
  const [o] = await db.insert(oferta).values({ nombre: 'TVER-1', tipo: 'publico' }).returning();
  const [c] = await db.insert(capitulo).values({ ofertaId: o!.id, nombre: 'Bahía' }).returning();
  const [r] = await db
    .insert(rubro)
    .values({ ofertaId: o!.id, capituloId: c!.id, apuId: a!.id, codigo: 'C01', cantidad: '10' })
    .returning();
  ofertaId = o!.id;
  rubroId = r!.id;
});

const pedir = (method: 'GET' | 'POST' | 'PATCH', url: string, galleta: string, payload?: object) =>
  app.inject({ method, url, headers: { cookie: galleta }, payload });

test('guarda versiones numeradas con su total; el snapshot conserva los precios de entonces', async () => {
  const v1 = await pedir('POST', `/api/ofertas/${ofertaId}/versiones`, galletaCotizador, {
    nombre: 'Inicial',
  });
  expect(v1.statusCode).toBe(201);
  // 10 u × (3 $/h ÷ R 2) = 15; sin indirectos ni IVA propios de la semilla, IVA de la empresa
  expect(v1.json()).toMatchObject({ numero: 1, nombre: 'Inicial', emitida: false });

  await pedir('PATCH', `/api/rubros/${rubroId}`, galletaCotizador, { version: 1, cantidad: '20' });
  const v2 = await pedir('POST', `/api/ofertas/${ofertaId}/versiones`, galletaCotizador, {
    nombre: 'Más cantidad',
  });
  expect(v2.json().numero).toBe(2);
  expect(Number(v2.json().total)).toBeCloseTo(Number(v1.json().total) * 2, 2);

  const lista = (await pedir('GET', `/api/ofertas/${ofertaId}/versiones`, galletaLector)).json();
  expect(lista.items.map((x: { numero: number }) => x.numero)).toEqual([2, 1]);
  const det = (
    await pedir('GET', `/api/ofertas/${ofertaId}/versiones/${v1.json().id}`, galletaLector)
  ).json();
  expect(det.snapshot.rubros[0].cantidad).toBe('10.000000');
  expect(det.total).toBe(v1.json().total);

  const b = await db.select().from(bitacora).where(eq(bitacora.entidadId, v1.json().id));
  expect(b).toHaveLength(1);
  expect(b[0]).toMatchObject({ entidad: 'version_oferta', despues: { numero: 1 } });
});

test('pide rol de escritura, nombre válido y oferta existente', async () => {
  const url = `/api/ofertas/${ofertaId}/versiones`;
  expect((await pedir('POST', url, galletaLector, { nombre: 'x' })).statusCode).toBe(403);
  expect((await pedir('POST', url, galletaCotizador, { nombre: ' ' })).statusCode).toBe(400);
  const nada = '00000000-0000-4000-8000-000000000000';
  expect(
    (await pedir('POST', `/api/ofertas/${nada}/versiones`, galletaCotizador, { nombre: 'x' }))
      .statusCode,
  ).toBe(404);
  const otra = await pedir('GET', `/api/ofertas/${ofertaId}/versiones/${nada}`, galletaLector);
  expect(otra.statusCode).toBe(404);
});
