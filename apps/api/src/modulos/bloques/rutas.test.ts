import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import {
  apu,
  bitacora,
  bloque,
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
let capituloId = '';

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
  galletaCotizador = await entrar('cotiza-blq', 'cotizador');
  galletaLector = await entrar('lector-blq', 'lector');
});

// Oferta ficticia con un capítulo de dos rubros (cantidades 10 y 4) para guardarlo como bloque.
beforeEach(async () => {
  await db.delete(bloque).where(like(bloque.nombre, 'TBLQ-%'));
  await db.delete(oferta).where(like(oferta.nombre, 'TBLQ-%'));
  await db.delete(apu).where(like(apu.codigo, 'TBLQ-%'));
  await db.delete(insumo).where(like(insumo.codigo, 'TBLQ-%'));
  const [i] = await db
    .insert(insumo)
    .values({ tipo: 'MO', codigo: 'TBLQ-MO1', descripcion: 'Ayudante', unidad: 'hora', pu: '3' })
    .returning();
  const apus = await db
    .insert(apu)
    .values([
      { codigo: 'TBLQ-1', descripcion: 'Montaje', unidad: 'u', rendimiento: '2' },
      { codigo: 'TBLQ-2', descripcion: 'Cableado', unidad: 'm', rendimiento: '1' },
    ])
    .returning();
  await db
    .insert(lineaApu)
    .values(apus.map((a) => ({ apuId: a.id, insumoId: i!.id, cantidad: '1' })));
  const [o] = await db.insert(oferta).values({ nombre: 'TBLQ-1', tipo: 'privado' }).returning();
  const [c] = await db
    .insert(capitulo)
    .values({ ofertaId: o!.id, nombre: 'Bahía de 230 kV', disciplina: 'Eléctrico' })
    .returning();
  await db.insert(rubro).values([
    {
      ofertaId: o!.id,
      capituloId: c!.id,
      apuId: apus[0]!.id,
      codigo: 'TBLQ-1',
      cantidad: '10',
      orden: 1,
    },
    {
      ofertaId: o!.id,
      capituloId: c!.id,
      apuId: apus[1]!.id,
      codigo: 'TBLQ-2',
      cantidad: '4',
      orden: 2,
    },
  ]);
  ofertaId = o!.id;
  capituloId = c!.id;
});

const pedir = (method: 'GET' | 'POST' | 'DELETE', url: string, galleta: string, payload?: object) =>
  app.inject({ method, url, headers: { cookie: galleta }, payload });

async function guardarBloque(nombre = 'TBLQ-Bahía') {
  const res = await pedir('POST', '/api/bloques', galletaCotizador, { capituloId, nombre });
  return res;
}

test('guardar un capítulo como bloque copia rubros y cantidades, y deja bitácora', async () => {
  const res = await guardarBloque();
  expect(res.statusCode).toBe(201);
  const b = res.json();
  expect(b).toMatchObject({ nombre: 'TBLQ-Bahía', disciplina: 'Eléctrico' });
  expect(b.lineas.map((l: { cantidad: string }) => l.cantidad)).toEqual(['10.000000', '4.000000']);
  const lista = (await pedir('GET', '/api/bloques', galletaLector)).json();
  const mio = lista.items.find((x: { id: string }) => x.id === b.id);
  expect(mio.lineas).toHaveLength(2);
  expect(lista.apus.map((a: { codigo: string }) => a.codigo)).toEqual(
    expect.arrayContaining(['TBLQ-1', 'TBLQ-2']),
  );
  expect(await db.select().from(bitacora).where(eq(bitacora.entidadId, b.id))).toHaveLength(1);
});

test('insertar un bloque crea un capítulo con sus rubros; repetido lleva sufijo (2)', async () => {
  const { id } = (await guardarBloque()).json();
  const uno = await pedir('POST', `/api/ofertas/${ofertaId}/bloques`, galletaCotizador, {
    bloqueId: id,
  });
  expect(uno.statusCode).toBe(201);
  const d = uno.json().oferta;
  const nuevo = d.capitulos.find((c: { id: string }) => c.id === uno.json().capituloId);
  expect(nuevo.nombre).toBe('TBLQ-Bahía');
  expect(d.rubros.filter((r: { capituloId: string }) => r.capituloId === nuevo.id)).toHaveLength(2);
  const dos = await pedir('POST', `/api/ofertas/${ofertaId}/bloques`, galletaCotizador, {
    bloqueId: id,
  });
  const nombres = dos.json().oferta.capitulos.map((c: { nombre: string }) => c.nombre);
  expect(nombres).toContain('TBLQ-Bahía (2)');
  expect(await db.select().from(rubro).where(eq(rubro.ofertaId, ofertaId))).toHaveLength(6);
});

test('el lector no escribe; bloque u oferta inexistente da 404', async () => {
  expect(
    (await pedir('POST', '/api/bloques', galletaLector, { capituloId, nombre: 'x' })).statusCode,
  ).toBe(403);
  const { id } = (await guardarBloque()).json();
  const sinPermiso = await pedir('POST', `/api/ofertas/${ofertaId}/bloques`, galletaLector, {
    bloqueId: id,
  });
  expect(sinPermiso.statusCode).toBe(403);
  const cero = '00000000-0000-4000-8000-000000000000';
  expect(
    (await pedir('POST', `/api/ofertas/${ofertaId}/bloques`, galletaCotizador, { bloqueId: cero }))
      .statusCode,
  ).toBe(404);
  expect(
    (await pedir('POST', `/api/ofertas/${cero}/bloques`, galletaCotizador, { bloqueId: id }))
      .statusCode,
  ).toBe(404);
});

test('borrar un bloque pide la versión (409 si es vieja) y deja bitácora', async () => {
  const b = (await guardarBloque()).json();
  const viejo = await pedir('DELETE', `/api/bloques/${b.id}?version=9`, galletaCotizador);
  expect(viejo.statusCode).toBe(409);
  const ok = await pedir('DELETE', `/api/bloques/${b.id}?version=${b.version}`, galletaCotizador);
  expect(ok.statusCode).toBe(204);
  const lista = (await pedir('GET', '/api/bloques', galletaLector)).json();
  expect(lista.items.find((x: { id: string }) => x.id === b.id)).toBeUndefined();
  expect(await db.select().from(bitacora).where(eq(bitacora.entidadId, b.id))).toHaveLength(2);
});
