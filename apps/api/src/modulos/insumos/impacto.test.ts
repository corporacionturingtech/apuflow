import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { apu, capitulo, insumo, lineaApu, oferta, rubro, usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

let app: ReturnType<typeof crearApp>;
let galleta = '';
let insumoId = '';
let libreId = '';

beforeAll(async () => {
  app = crearApp(db);
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'lector-imp'));
  await crearUsuario(db, {
    nombreUsuario: 'lector-imp',
    nombre: 'lector-imp',
    clave: 'clave-segura-1',
    rol: 'lector',
  });
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { nombreUsuario: 'lector-imp', clave: 'clave-segura-1' },
  });
  galleta = res.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
});

// Dos ofertas (TIMP-A con 2 rubros y TIMP-B con 1) usan el mismo APU de un ayudante (R=2). El precio
// ya es el nuevo (5); el "antes" que pide el panel es 3.
beforeEach(async () => {
  await db.delete(oferta).where(like(oferta.nombre, 'TIMP-%'));
  await db.delete(apu).where(like(apu.codigo, 'TIMP-%'));
  await db.delete(insumo).where(like(insumo.codigo, 'TIMP-%'));
  const [i, libre] = await db
    .insert(insumo)
    .values([
      { tipo: 'MO', codigo: 'TIMP-MO1', descripcion: 'Ayudante', unidad: 'hora', pu: '5' },
      { tipo: 'MO', codigo: 'TIMP-MO2', descripcion: 'Sin uso', unidad: 'hora', pu: '7' },
    ])
    .returning();
  insumoId = i!.id;
  libreId = libre!.id;
  const [a] = await db
    .insert(apu)
    .values({ codigo: 'TIMP-1', descripcion: 'Montaje', unidad: 'u', rendimiento: '2' })
    .returning();
  await db.insert(lineaApu).values({ apuId: a!.id, insumoId, cantidad: '1' });
  for (const [nombre, n] of [
    ['TIMP-A', 2],
    ['TIMP-B', 1],
  ] as const) {
    const [o] = await db.insert(oferta).values({ nombre, tipo: 'publico' }).returning();
    const [c] = await db.insert(capitulo).values({ ofertaId: o!.id, nombre: 'Cap' }).returning();
    for (let k = 1; k <= n; k++)
      await db.insert(rubro).values({
        ofertaId: o!.id,
        capituloId: c!.id,
        apuId: a!.id,
        codigo: `C0${k}`,
        cantidad: '10',
        orden: k,
      });
  }
});

const pedir = (id: string, puAnterior = '3') =>
  app.inject({
    method: 'GET',
    url: `/api/insumos/${id}/impacto?puAnterior=${puAnterior}`,
    headers: { cookie: galleta },
  });

test('suma APUs, rubros y diferencia de todas las ofertas que usan el insumo', async () => {
  const res = await pedir(insumoId);
  expect(res.statusCode).toBe(200);
  const d = res.json();
  expect(d.apus).toBe(1);
  expect(d.rubros).toBe(3);
  expect(d.ofertas.map((o: { nombre: string }) => o.nombre).sort()).toEqual(['TIMP-A', 'TIMP-B']);
  const dif = d.ofertas.reduce(
    (s: number, o: { antes: string; despues: string }) => s + Number(o.despues) - Number(o.antes),
    0,
  );
  expect(Number(d.diferencia)).toBeCloseTo(dif, 2);
  expect(Number(d.diferencia)).toBeGreaterThan(0);
  // Cada rubro aporta lo mismo: la oferta de 2 rubros mueve el doble que la de 1.
  const [a, b] = ['TIMP-A', 'TIMP-B'].map((n) =>
    d.ofertas.find((o: { nombre: string }) => o.nombre === n),
  );
  expect(Number(a.despues) - Number(a.antes)).toBeCloseTo(
    2 * (Number(b.despues) - Number(b.antes)),
    2,
  );
});

test('un insumo que ninguna oferta usa: sin efecto', async () => {
  const d = (await pedir(libreId, '1')).json();
  expect(d).toMatchObject({ apus: 0, rubros: 0, diferencia: '0.00', ofertas: [] });
});

test('404 si no existe y 400 si falta el precio anterior', async () => {
  expect((await pedir('00000000-0000-4000-8000-000000000000')).statusCode).toBe(404);
  const sin = await app.inject({
    method: 'GET',
    url: `/api/insumos/${insumoId}/impacto`,
    headers: { cookie: galleta },
  });
  expect(sin.statusCode).toBe(400);
});
