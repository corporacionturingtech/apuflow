import { readFileSync } from 'node:fs';
import { exportarLibro, type InsumoLibro, type LibroEntrada, type TipoInsumo } from 'excel';
import { and, eq, inArray } from 'drizzle-orm';
import { SECTORES_DEMO, type SectorDemo } from 'tipos';
import type { Bd } from '../../db/conexion';
import { capitulo, oferta, rubro } from '../../db/esquema';
import { crearDesdeCapitulo } from '../bloques/servicio';
import { confirmar } from '../importacion/servicio';

type Linea = (string | number)[];
interface Empresa {
  datosGenerales: { proyecto: string; cliente: string; fecha: string; tipo: string };
  factor: number;
  herramientaMenor: number;
  iva: number;
  indirectos: { id: string; n: string; p: number }[];
  materiales: { id: string; n: string; u: string; pu: number; sec: string }[];
  manoObra: { id: string; n: string; p: number }[];
  equipos: { id: string; n: string; p: number }[];
  transporte: { id: string; n: string; u: string; p: number }[];
  apus: {
    id: string;
    n: string;
    d: string;
    u: string;
    r: number;
    eq: Linea[];
    mo: Linea[];
    ma: Linea[];
    tr: Linea[];
  }[];
  /** `t`: tamaño para el que están las cantidades, p. ej. [100, 'm²']. */
  bloques: { id: string; n: string; r: [string, number][]; t?: [number, string] }[];
  inicial: string[];
}

const leer = (archivo: string) =>
  JSON.parse(readFileSync(new URL(archivo, import.meta.url), 'utf8')) as Empresa;

// Datos ficticios. Eléctrico: copia de `packages/motor/test/fixtures/sedemi-demo.json` sin la
// simulación. Vivienda: generado y calibrado a precios por m² de referencia (ver el test).
const DEMOS: Record<SectorDemo, Empresa> = {
  electrico: leer('./empresa-demo.json'),
  vivienda: leer('./vivienda-demo.json'),
};

export const nombreDemo = (sector: SectorDemo) => DEMOS[sector].datosGenerales.proyecto;
export const NOMBRE_DEMO = nombreDemo('electrico');

/** Todos los bloques entran como capítulos para poder guardarlos como bloques; luego se quitan los no iniciales. */
function libroDemo(datos: Empresa): LibroEntrada {
  const ins = (
    tipo: TipoInsumo,
    xs: { id: string; n: string; u?: string; pu?: number; p?: number; sec?: string }[],
  ): InsumoLibro[] =>
    xs.map((x) => ({
      id: x.id,
      tipo,
      descripcion: x.n,
      unidad: x.u ?? 'hora',
      pu: String(x.pu ?? x.p),
      seccion: x.sec ?? null,
    }));
  return {
    datos: {
      proyecto: datos.datosGenerales.proyecto,
      cliente: datos.datosGenerales.cliente,
      tipo: /p[uú]blic/i.test(datos.datosGenerales.tipo) ? 'publico' : 'privado',
      fecha: datos.datosGenerales.fecha,
      empresa: 'Empresa demo',
    },
    factor: String(datos.factor),
    iva: String(datos.iva),
    herramientaMenor: String(datos.herramientaMenor),
    indirectos: datos.indirectos.map((i) => ({ nombre: i.n, porcentaje: String(i.p) })),
    insumos: [
      ...ins('MA', datos.materiales),
      ...ins('EQ', datos.equipos),
      ...ins('MO', datos.manoObra),
      ...ins('TR', datos.transporte),
    ],
    apus: datos.apus.map((a) => ({
      id: a.id,
      codigo: a.id,
      descripcion: a.n,
      unidad: a.u,
      disciplina: a.d,
      rendimiento: String(a.r),
      herramientaMenor: String(datos.herramientaMenor),
      lineas: [...a.eq, ...a.mo, ...a.ma, ...a.tr].map(([insumoId, c]) => ({
        insumoId: String(insumoId),
        cantidad: String(c),
      })),
    })),
    capitulos: datos.bloques.map((b) => ({ id: b.id, nombre: b.n })),
    rubros: datos.bloques.flatMap((b) =>
      b.r.map(([apuId, q], i) => ({
        capituloId: b.id,
        apuId,
        codigo: `${b.id}-${i + 1}`,
        cantidad: String(q),
        cpc: null,
        origen: null,
        vae: null,
      })),
    ),
  };
}

async function ofertaDe(db: Bd, sector: SectorDemo) {
  const [o] = await db
    .select({ id: oferta.id })
    .from(oferta)
    .where(eq(oferta.nombre, nombreDemo(sector)));
  return o?.id ?? null;
}

/** La oferta de la demo cargada, de cualquier sector (la usan las misiones). */
export async function ofertaDemoId(db: Bd) {
  for (const s of SECTORES_DEMO) {
    const id = await ofertaDe(db, s);
    if (id) return id;
  }
  return null;
}

/** Carga la empresa demo del sector (insumos, APUs, bloques y una oferta de ejemplo). Idempotente. */
export async function cargarDemo(db: Bd, usuarioId: string, sector: SectorDemo = 'electrico') {
  const existente = await ofertaDe(db, sector);
  if (existente) return { ofertaId: existente, creada: false };

  const datos = DEMOS[sector];
  const libro = await exportarLibro(libroDemo(datos));
  const ofertaId = await confirmar(db, usuarioId, libro, 'empresa-demo.xlsx');

  const caps = await db.select().from(capitulo).where(eq(capitulo.ofertaId, ofertaId));
  for (const c of caps) {
    const t = datos.bloques.find((b) => b.n === c.nombre)?.t;
    await crearDesdeCapitulo(db, usuarioId, {
      capituloId: c.id,
      nombre: c.nombre,
      tamano: t ? String(t[0]) : null,
      unidadTamano: t?.[1] ?? null,
    });
  }

  const iniciales = new Set(datos.inicial.map((id) => datos.bloques.find((b) => b.id === id)!.n));
  const sobran = caps.filter((c) => !iniciales.has(c.nombre)).map((c) => c.id);
  if (sobran.length) {
    await db
      .delete(rubro)
      .where(and(eq(rubro.ofertaId, ofertaId), inArray(rubro.capituloId, sobran)));
    await db.delete(capitulo).where(inArray(capitulo.id, sobran));
  }
  return { ofertaId, creada: true };
}
