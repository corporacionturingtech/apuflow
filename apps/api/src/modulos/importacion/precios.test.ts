import { afterAll, beforeAll, expect, test } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { exportarLibro, type LibroEntrada } from 'excel';
import { crearApp } from '../../app';
import { crearBd } from '../../db/conexion';
import { urlBdPruebas } from '../../db/url';
import { apu, historialPrecio, insumo, oferta, usuario } from '../../db/esquema';
import { crearUsuario } from '../auth/servicio';
import { configuracion } from '../insumos/repo';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

const clave = 'clave-segura-1';
const P = 'IPRTEST';
let app: ReturnType<typeof crearApp>;
let galleta = '';
let galletaLector = '';

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

async function limpiar() {
  await db.delete(oferta).where(like(oferta.nombre, `${P}%`));
  await db.delete(apu).where(like(apu.codigo, `${P}%`));
  await db.delete(insumo).where(like(insumo.descripcion, `${P}%`));
}

const enviar = (ruta: string, cuerpo: Uint8Array, cookie = galleta) =>
  app.inject({
    method: 'POST',
    url: ruta,
    headers: {
      cookie,
      'content-type': 'application/octet-stream',
      'x-nombre-archivo': 'precios.xlsx',
    },
    payload: Buffer.from(cuerpo),
  });

let base: LibroEntrada;

/** Libro sin APUs ni rubros que solo trae estos materiales (una lista de precios). */
const soloMateriales = (filas: [string, number][]) =>
  exportarLibro({
    ...base,
    apus: [],
    capitulos: [],
    rubros: [],
    insumos: filas.map(([d, p], i) => ({
      id: `m${i}`,
      tipo: 'MA' as const,
      descripcion: d,
      unidad: 'm',
      pu: String(p),
      seccion: null,
    })),
  });

beforeAll(async () => {
  app = crearApp(db);
  galleta = await entrar('ipr-cotizador', 'cotizador');
  galletaLector = await entrar('ipr-lector', 'lector');
  await limpiar();
  const cfg = await configuracion(db);
  base = {
    datos: {
      proyecto: `${P} Oferta`,
      cliente: 'Ficticio',
      tipo: 'privado',
      fecha: '2026-10-25',
      empresa: 'Demo',
    },
    factor: cfg.factorMateriales,
    iva: cfg.iva,
    herramientaMenor: cfg.pctHerramientaMenor,
    indirectos: [{ nombre: 'Indirectos', porcentaje: '10' }],
    insumos: [
      { id: 'm', tipo: 'MA', descripcion: `${P} Cable`, unidad: 'm', pu: '2', seccion: null },
      { id: 'n', tipo: 'MA', descripcion: `${P} Tubo`, unidad: 'm', pu: '5', seccion: null },
    ],
    apus: [
      {
        id: 'a',
        codigo: `${P}-01`,
        descripcion: `${P} Tendido`,
        unidad: 'm',
        disciplina: null,
        rendimiento: '1',
        herramientaMenor: '0',
        lineas: [
          { insumoId: 'm', cantidad: '10' },
          { insumoId: 'n', cantidad: '1' },
        ],
      },
    ],
    capitulos: [{ id: 'c', nombre: 'Cables' }],
    rubros: [
      {
        capituloId: 'c',
        apuId: 'a',
        codigo: `${P}-01`,
        cantidad: '2',
        cpc: null,
        origen: null,
        vae: null,
      },
    ],
  };
  const res = await enviar('/api/importar/confirmar', await exportarLibro(base));
  expect(res.statusCode).toBe(201);
});
afterAll(limpiar);

test('revisar lista qué cambia, qué no y qué no existe, con su impacto, sin escribir', async () => {
  const libro = await soloMateriales([
    [`${P} Cable`, 3],
    [`${P} Tubo`, 5],
    [`${P} Fantasma`, 9],
  ]);
  const res = await enviar('/api/importar/precios/revisar', libro);
  expect(res.statusCode).toBe(200);
  const r = res.json();
  expect(r.hojas).toBe(4);
  expect(r.cambios).toMatchObject([
    { descripcion: `${P} Cable`, puActual: '2.000000', puNuevo: '3' },
  ]);
  expect(r.sinCambio).toBe(1);
  expect(r.noEncontrados).toEqual([`${P} Fantasma`]);
  // Cable pasa de 2 a 3 con 10 por rubro y 2 rubros de cantidad: +10 × 2 × (1 + 10 %) = +22.
  expect(r.impacto).toMatchObject({ apus: 1, rubros: 1, diferencia: '22.00' });
  expect(r.impacto.ofertas).toHaveLength(1);
  expect(r.puedeConfirmar).toBe(true);
  const [c] = await db
    .select()
    .from(insumo)
    .where(eq(insumo.descripcion, `${P} Cable`));
  expect(Number(c!.pu)).toBe(2);
});

test('confirmar actualiza los precios y deja historial', async () => {
  const libro = await soloMateriales([[`${P} Cable`, 3]]);
  const res = await enviar('/api/importar/precios/confirmar', libro);
  expect(res.statusCode).toBe(201);
  expect(res.json()).toEqual({ actualizados: 1 });
  const [c] = await db
    .select()
    .from(insumo)
    .where(eq(insumo.descripcion, `${P} Cable`));
  expect(Number(c!.pu)).toBe(3);
  const h = await db.select().from(historialPrecio).where(eq(historialPrecio.insumoId, c!.id));
  expect(h.map((x) => Number(x.puNuevo))).toContain(3);
  // Segunda vez: ya no hay nada que cambiar.
  expect((await enviar('/api/importar/precios/confirmar', libro)).statusCode).toBe(422);
});

test('un archivo ilegible da 400 y un lector no puede importar precios (403)', async () => {
  expect((await enviar('/api/importar/precios/revisar', new Uint8Array([1, 2]))).statusCode).toBe(
    400,
  );
  const lector = await enviar(
    '/api/importar/precios/revisar',
    await soloMateriales([[`${P} Cable`, 4]]),
    galletaLector,
  );
  expect(lector.statusCode).toBe(403);
});
