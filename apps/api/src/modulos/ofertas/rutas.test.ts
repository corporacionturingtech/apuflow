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
  galletaCotizador = await entrar('cotiza-ofe', 'cotizador');
  galletaLector = await entrar('lector-ofe', 'lector');
});

// Oferta ficticia: un capítulo con un rubro de un APU de un ayudante (3 $/h, R=2) × 10 unidades.
beforeEach(async () => {
  await db.delete(oferta).where(like(oferta.nombre, 'TOFE-%'));
  await db.delete(apu).where(like(apu.codigo, 'TOFE-%'));
  await db.delete(insumo).where(like(insumo.codigo, 'TOFE-%'));
  const [i] = await db
    .insert(insumo)
    .values({ tipo: 'MO', codigo: 'TOFE-MO1', descripcion: 'Ayudante', unidad: 'hora', pu: '3' })
    .returning();
  const [a] = await db
    .insert(apu)
    .values({ codigo: 'TOFE-1', descripcion: 'Montaje', unidad: 'u', rendimiento: '2' })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId: i!.id, cantidad: '1' });
  const [o] = await db.insert(oferta).values({ nombre: 'TOFE-1', tipo: 'publico' }).returning();
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

test('lista y detalle traen capítulos, rubros y APUs con sus líneas', async () => {
  const lista = await pedir('GET', '/api/ofertas', galletaLector);
  expect(lista.json().items.find((x: { id: string }) => x.id === ofertaId).rubros).toBe(1);
  const d = (await pedir('GET', `/api/ofertas/${ofertaId}`, galletaLector)).json();
  expect(d.tipo).toBe('publico');
  expect(d.capitulos).toHaveLength(1);
  expect(d.rubros[0]).toMatchObject({ codigo: 'C01', cantidad: '10.000000' });
  expect(d.apus[0].lineas[0]).toMatchObject({ tipo: 'MO', pu: '3.000000' });
});

test('crear oferta pide rol de escritura', async () => {
  const mal = await pedir('POST', '/api/ofertas', galletaLector, { nombre: 'TOFE-2' });
  expect(mal.statusCode).toBe(403);
  const ok = await pedir('POST', '/api/ofertas', galletaCotizador, { nombre: 'TOFE-2' });
  expect(ok.statusCode).toBe(201);
  expect(ok.json().tipo).toBe('privado');
});

test('cambiar cantidad deja bitácora y sube la versión; versión vieja da 409', async () => {
  const ok = await pedir('PATCH', `/api/rubros/${rubroId}`, galletaCotizador, {
    version: 1,
    cantidad: '12.5',
  });
  expect(ok.statusCode).toBe(200);
  expect(ok.json()).toMatchObject({ version: 2 });
  const b = await db.select().from(bitacora).where(eq(bitacora.entidadId, rubroId));
  expect(b).toHaveLength(1);
  expect(b[0]).toMatchObject({ campo: 'cantidad', despues: { valor: '12.5' } });
  const viejo = await pedir('PATCH', `/api/rubros/${rubroId}`, galletaCotizador, {
    version: 1,
    cantidad: '9',
  });
  expect(viejo.statusCode).toBe(409);
  const lector = await pedir('PATCH', `/api/rubros/${rubroId}`, galletaLector, {
    version: 2,
    cantidad: '9',
  });
  expect(lector.statusCode).toBe(403);
});

test('datos generales y capítulo nuevo', async () => {
  const p = await pedir('PATCH', `/api/ofertas/${ofertaId}`, galletaCotizador, {
    version: 1,
    cliente: 'Cliente ficticio',
    tipo: 'privado',
  });
  expect(p.json()).toMatchObject({ cliente: 'Cliente ficticio', tipo: 'privado', version: 2 });
  const c = await pedir('POST', `/api/ofertas/${ofertaId}/capitulos`, galletaCotizador, {
    nombre: 'Obra civil',
  });
  expect(c.statusCode).toBe(201);
  expect(c.json().capitulos).toHaveLength(2);
  const viejo = await pedir('PATCH', `/api/ofertas/${ofertaId}`, galletaCotizador, {
    version: 1,
    nombre: 'TOFE-x',
  });
  expect(viejo.statusCode).toBe(409);
});
