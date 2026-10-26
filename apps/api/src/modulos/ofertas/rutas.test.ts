import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { calcularDetalle } from 'motor';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import {
  apu,
  bitacora,
  capitulo,
  indirecto,
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

const pedir = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  galleta: string,
  payload?: object,
) => app.inject({ method, url, headers: { cookie: galleta }, payload });

test('lista y detalle traen capítulos, rubros y APUs con sus líneas', async () => {
  const lista = await pedir('GET', '/api/ofertas', galletaLector);
  const item = lista.json().items.find((x: { id: string }) => x.id === ofertaId);
  expect(item.rubros).toBe(1);
  const d = (await pedir('GET', `/api/ofertas/${ofertaId}`, galletaLector)).json();
  expect(item.total).toBe(calcularDetalle(d).totales.total.toFixed(2));
  expect(Number(item.total)).toBeGreaterThan(0);
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

test('editar código, CPC, origen y VAE deja una bitácora por campo', async () => {
  const ok = await pedir('PATCH', `/api/rubros/${rubroId}`, galletaCotizador, {
    version: 1,
    codigo: 'C99',
    cpc: '4682',
    origen: 'ND',
    vae: '12.5',
  });
  expect(ok.statusCode).toBe(200);
  expect(ok.json()).toMatchObject({ codigo: 'C99', origen: 'ND', version: 2 });
  const b = await db.select().from(bitacora).where(eq(bitacora.entidadId, rubroId));
  expect(b.map((x) => x.campo).sort()).toEqual(['codigo', 'cpc', 'origen', 'vae']);
  const mal = await pedir('PATCH', `/api/rubros/${rubroId}`, galletaCotizador, {
    version: 2,
    origen: 'X',
  });
  expect(mal.statusCode).toBe(400);
});

test('añadir rubro usa el código del APU, deja bitácora y pide rol de escritura', async () => {
  const d = (await pedir('GET', `/api/ofertas/${ofertaId}`, galletaLector)).json();
  const body = { capituloId: d.capitulos[0].id, apuId: d.apus[0].id, cantidad: '4' };
  const lector = await pedir('POST', `/api/ofertas/${ofertaId}/rubros`, galletaLector, body);
  expect(lector.statusCode).toBe(403);
  const ok = await pedir('POST', `/api/ofertas/${ofertaId}/rubros`, galletaCotizador, body);
  expect(ok.statusCode).toBe(201);
  expect(ok.json().rubro).toMatchObject({ codigo: 'TOFE-1', cantidad: '4.000000', version: 1 });
  expect(ok.json().apu.lineas).toHaveLength(1);
  const b = await db.select().from(bitacora).where(eq(bitacora.entidadId, ok.json().rubro.id));
  expect(b).toHaveLength(1);
  const otro = await pedir('POST', `/api/ofertas/${ofertaId}/rubros`, galletaCotizador, {
    ...body,
    capituloId: '00000000-0000-4000-8000-000000000000',
  });
  expect(otro.statusCode).toBe(404);
});

test('quitar rubro y capítulo respeta la versión y deja bitácora', async () => {
  const viejo = await pedir('DELETE', `/api/rubros/${rubroId}?version=7`, galletaCotizador);
  expect(viejo.statusCode).toBe(409);
  const ok = await pedir('DELETE', `/api/rubros/${rubroId}?version=1`, galletaCotizador);
  expect(ok.statusCode).toBe(204);
  const d = (await pedir('GET', `/api/ofertas/${ofertaId}`, galletaLector)).json();
  expect(d.rubros).toHaveLength(0);
  const b = await db.select().from(bitacora).where(eq(bitacora.entidadId, rubroId));
  expect(b.some((x) => x.despues === null && x.antes !== null)).toBe(true);
  const cap = await pedir(
    'DELETE',
    `/api/capitulos/${d.capitulos[0].id}?version=1`,
    galletaCotizador,
  );
  expect(cap.statusCode).toBe(204);
  expect(
    (await pedir('GET', `/api/ofertas/${ofertaId}`, galletaLector)).json().capitulos,
  ).toHaveLength(0);
});

test('exportar entrega un .xlsx a cualquier rol y 404 si la oferta no existe', async () => {
  const ok = await pedir('GET', `/api/ofertas/${ofertaId}/exportar`, galletaLector);
  expect(ok.statusCode).toBe(200);
  expect(ok.headers['content-type']).toContain('spreadsheetml.sheet');
  expect(ok.headers['content-disposition']).toContain('TOFE-1.xlsx');
  expect(ok.rawPayload.subarray(0, 2).toString()).toBe('PK');
  const sin = await app.inject({ method: 'GET', url: `/api/ofertas/${ofertaId}/exportar` });
  expect(sin.statusCode).toBe(401);
  const no = await pedir(
    'GET',
    '/api/ofertas/00000000-0000-0000-0000-000000000000/exportar',
    galletaLector,
  );
  expect(no.statusCode).toBe(404);
});

test('editar un indirecto deja bitácora, sube la versión y respeta 409 y rol', async () => {
  const [ind] = await db
    .insert(indirecto)
    .values({ ofertaId, nombre: 'Utilidad', porcentaje: '10', esUtilidad: true })
    .returning();
  const url = `/api/ofertas/${ofertaId}/indirectos/${ind!.id}`;
  const ok = await pedir('PATCH', url, galletaCotizador, { version: 1, porcentaje: '12.5' });
  expect(ok.statusCode).toBe(200);
  expect(ok.json()).toMatchObject({ porcentaje: '12.5000', version: 2 });
  const b = await db.select().from(bitacora).where(eq(bitacora.entidadId, ind!.id));
  expect(b[0]).toMatchObject({ campo: 'porcentaje', despues: { valor: '12.5000' } });
  const d = (await pedir('GET', `/api/ofertas/${ofertaId}`, galletaLector)).json();
  expect(d.indirectos[0]).toMatchObject({ porcentaje: '12.5000', esUtilidad: true, version: 2 });
  const viejo = await pedir('PATCH', url, galletaCotizador, { version: 1, porcentaje: '9' });
  expect(viejo.statusCode).toBe(409);
  const lector = await pedir('PATCH', url, galletaLector, { version: 2, porcentaje: '9' });
  expect(lector.statusCode).toBe(403);
  const malo = await pedir('PATCH', url, galletaCotizador, { version: 2, porcentaje: '150' });
  expect(malo.statusCode).toBe(400);
});

test('el IVA de la oferta reemplaza al de la empresa', async () => {
  const antes = (await pedir('GET', `/api/ofertas/${ofertaId}`, galletaLector)).json();
  const ok = await pedir('PATCH', `/api/ofertas/${ofertaId}`, galletaCotizador, {
    version: 1,
    iva: '8',
  });
  expect(ok.statusCode).toBe(200);
  expect(Number(ok.json().iva)).toBe(8);
  expect(Number(antes.iva)).not.toBe(8);
});

test('el costo objetivo se guarda, deja bitácora y se puede borrar', async () => {
  const url = `/api/ofertas/${ofertaId}`;
  const v = (await pedir('GET', url, galletaLector)).json().version;
  const ok = await pedir('PATCH', url, galletaCotizador, { version: v, costoObjetivo: '1500.5' });
  expect(ok.statusCode).toBe(200);
  expect(Number(ok.json().costoObjetivo)).toBe(1500.5);
  const b = await db.select().from(bitacora).where(eq(bitacora.entidadId, ofertaId));
  expect(b.find((x) => x.campo === 'costoObjetivo')).toMatchObject({ antes: { valor: null } });
  expect(
    (await pedir('PATCH', url, galletaCotizador, { version: v, costoObjetivo: '9' })).statusCode,
  ).toBe(409);
  expect(
    (await pedir('PATCH', url, galletaLector, { version: v + 1, costoObjetivo: '9' })).statusCode,
  ).toBe(403);
  expect(
    (await pedir('PATCH', url, galletaCotizador, { version: v + 1, costoObjetivo: '-5' }))
      .statusCode,
  ).toBe(400);
  const borrado = await pedir('PATCH', url, galletaCotizador, {
    version: v + 1,
    costoObjetivo: null,
  });
  expect(borrado.json().costoObjetivo).toBeNull();
});

// F2-06: dos ofertas comparten el APU; el alcance decide quién ve el cambio.
async function segundaOferta() {
  const r0 = (await db.select().from(rubro).where(eq(rubro.id, rubroId)))[0]!;
  const [o] = await db.insert(oferta).values({ nombre: 'TOFE-2', tipo: 'publico' }).returning();
  const [c] = await db.insert(capitulo).values({ ofertaId: o!.id, nombre: 'Otra' }).returning();
  const [r] = await db
    .insert(rubro)
    .values({ ofertaId: o!.id, capituloId: c!.id, apuId: r0.apuId, codigo: 'C01', cantidad: '1' })
    .returning();
  return { apuId: r0.apuId, otroRubro: r! };
}

test('APU compartido: se informa el uso y editarlo cambia todas las ofertas', async () => {
  const { apuId } = await segundaOferta();
  const uso = await pedir('GET', `/api/apus/${apuId}/uso`, galletaLector);
  expect(uso.json()).toEqual({ rubros: 2, ofertas: 2 });

  const a = (await pedir('GET', `/api/ofertas/${ofertaId}`, galletaLector)).json().apus[0];
  expect(a.id).toBe(apuId);
  await db.update(lineaApu).set({ cantidad: '5' }).where(eq(lineaApu.apuId, apuId));
  for (const id of [
    ofertaId,
    (await db.select().from(oferta).where(like(oferta.nombre, 'TOFE-2')))[0]!.id,
  ]) {
    const d = (await pedir('GET', `/api/ofertas/${id}`, galletaLector)).json();
    expect(d.apus[0].lineas[0].cantidad).toBe('5.000000');
  }
});

test('copia solo para esta oferta: el rubro pasa a una copia y la otra oferta no cambia', async () => {
  const { apuId, otroRubro } = await segundaOferta();
  const antes = (await db.select().from(rubro).where(eq(rubro.id, rubroId)))[0]!;
  const res = await pedir('POST', `/api/rubros/${rubroId}/apu/copia`, galletaCotizador, {
    version: antes.version,
  });
  expect(res.statusCode).toBe(201);
  const { rubro: r, apu: copia } = res.json();
  expect(r).toMatchObject({ id: rubroId, apuId: copia.id, version: antes.version + 1 });
  expect(copia.id).not.toBe(apuId);
  expect(copia.codigo).toBe('TOFE-1 (2)');
  expect(copia.lineas).toHaveLength(1);

  // Editar la copia no toca al original ni al rubro de la otra oferta.
  await db.update(lineaApu).set({ cantidad: '9' }).where(eq(lineaApu.apuId, copia.id));
  const orig = await db.select().from(lineaApu).where(eq(lineaApu.apuId, apuId));
  expect(Number(orig[0]!.cantidad)).toBe(1);
  expect((await db.select().from(rubro).where(eq(rubro.id, otroRubro.id)))[0]!.apuId).toBe(apuId);
  expect((await pedir('GET', `/api/apus/${apuId}/uso`, galletaLector)).json().rubros).toBe(1);

  const reg = await db.select().from(bitacora).where(eq(bitacora.entidadId, rubroId));
  expect(reg.find((b) => b.campo === 'apuId')).toMatchObject({
    antes: { valor: apuId },
    despues: { valor: copia.id },
  });

  // Una segunda copia del original no repite el código.
  const otra = await pedir('POST', `/api/rubros/${otroRubro.id}/apu/copia`, galletaCotizador, {
    version: otroRubro.version,
  });
  expect(otra.json().apu.codigo).toBe('TOFE-1 (3)');
});

test('copia de APU: 409 con versión vieja, 404, 403 y 400', async () => {
  const v = (await db.select().from(rubro).where(eq(rubro.id, rubroId)))[0]!.version;
  const viejo = await pedir('POST', `/api/rubros/${rubroId}/apu/copia`, galletaCotizador, {
    version: v + 5,
  });
  expect(viejo.statusCode).toBe(409);
  expect((await db.select().from(apu).where(like(apu.codigo, 'TOFE-1 (%'))).length).toBe(0);
  const noExiste = '00000000-0000-4000-8000-000000000000';
  expect(
    (await pedir('POST', `/api/rubros/${noExiste}/apu/copia`, galletaCotizador, { version: 1 }))
      .statusCode,
  ).toBe(404);
  expect(
    (await pedir('POST', `/api/rubros/${rubroId}/apu/copia`, galletaLector, { version: v }))
      .statusCode,
  ).toBe(403);
  expect(
    (await pedir('POST', `/api/rubros/${rubroId}/apu/copia`, galletaCotizador, {})).statusCode,
  ).toBe(400);
});
