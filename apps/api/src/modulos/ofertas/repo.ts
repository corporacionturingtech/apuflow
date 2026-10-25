import { and, asc, count, desc, eq, inArray, isNull, max } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import { apu, capitulo, indirecto, insumo, lineaApu, oferta, rubro } from '../../db/esquema';

export { configuracion, registrarBitacora, type Tx } from '../insumos/repo';
import type { Tx } from '../insumos/repo';

export const listar = (db: Bd) =>
  db
    .select({ oferta, rubros: count(rubro.id) })
    .from(oferta)
    .leftJoin(rubro, eq(rubro.ofertaId, oferta.id))
    .groupBy(oferta.id)
    .orderBy(desc(oferta.actualizadoEn));

export const buscar = async (db: Bd | Tx, id: string) =>
  (await db.select().from(oferta).where(eq(oferta.id, id)))[0];

export const crear = async (tx: Tx, d: typeof oferta.$inferInsert) =>
  (await tx.insert(oferta).values(d).returning())[0]!;

// El `where version` es el bloqueo optimista: 0 filas = alguien editó antes.
export const actualizar = async (
  tx: Tx,
  id: string,
  version: number,
  cambios: Partial<typeof oferta.$inferInsert>,
) =>
  (
    await tx
      .update(oferta)
      .set({ ...cambios, version: version + 1, actualizadoEn: new Date() })
      .where(and(eq(oferta.id, id), eq(oferta.version, version)))
      .returning()
  )[0];

export const capitulos = (db: Bd | Tx, ofertaId: string) =>
  db.select().from(capitulo).where(eq(capitulo.ofertaId, ofertaId)).orderBy(asc(capitulo.orden));

export const rubros = (db: Bd | Tx, ofertaId: string) =>
  db
    .select()
    .from(rubro)
    .where(eq(rubro.ofertaId, ofertaId))
    .orderBy(asc(rubro.orden), asc(rubro.codigo));

export const indirectos = (db: Bd | Tx, ofertaId: string) =>
  db.select().from(indirecto).where(eq(indirecto.ofertaId, ofertaId)).orderBy(asc(indirecto.orden));

export const apusConLineas = async (db: Bd | Tx, ids: string[]) => {
  if (!ids.length) return [];
  const apus = await db.select().from(apu).where(inArray(apu.id, ids));
  const lineas = await db
    .select({ apuId: lineaApu.apuId, insumo, cantidad: lineaApu.cantidad })
    .from(lineaApu)
    .innerJoin(insumo, eq(insumo.id, lineaApu.insumoId))
    .where(inArray(lineaApu.apuId, ids))
    .orderBy(asc(lineaApu.orden));
  return apus.map((a) => ({ apu: a, lineas: lineas.filter((l) => l.apuId === a.id) }));
};

export const buscarRubro = async (tx: Tx, id: string) =>
  (await tx.select().from(rubro).where(eq(rubro.id, id)))[0];

export const actualizarRubro = async (
  tx: Tx,
  id: string,
  version: number,
  cambios: Partial<typeof rubro.$inferInsert>,
  por: string,
) =>
  (
    await tx
      .update(rubro)
      .set({ ...cambios, version: version + 1, actualizadoPor: por, actualizadoEn: new Date() })
      .where(and(eq(rubro.id, id), eq(rubro.version, version)))
      .returning()
  )[0];

export const insertarRubro = async (tx: Tx, d: typeof rubro.$inferInsert) =>
  (await tx.insert(rubro).values(d).returning())[0]!;

export const siguienteOrdenRubro = async (tx: Tx, capituloId: string) =>
  ((
    await tx
      .select({ m: max(rubro.orden) })
      .from(rubro)
      .where(eq(rubro.capituloId, capituloId))
  )[0]?.m ?? 0) + 1;

export const eliminarRubro = async (tx: Tx, id: string, version: number) =>
  (
    await tx
      .delete(rubro)
      .where(and(eq(rubro.id, id), eq(rubro.version, version)))
      .returning()
  )[0];

export const buscarCapitulo = async (tx: Tx, id: string) =>
  (await tx.select().from(capitulo).where(eq(capitulo.id, id)))[0];

export const rubrosDeCapitulo = (tx: Tx, capituloId: string) =>
  tx.select().from(rubro).where(eq(rubro.capituloId, capituloId));

// Los rubros caen por `on delete cascade`.
export const eliminarCapitulo = async (tx: Tx, id: string, version: number) =>
  (
    await tx
      .delete(capitulo)
      .where(and(eq(capitulo.id, id), eq(capitulo.version, version)))
      .returning()
  )[0];

export const insertarCapitulo = async (tx: Tx, d: typeof capitulo.$inferInsert) =>
  (await tx.insert(capitulo).values(d).returning())[0]!;

export const siguienteOrdenCapitulo = async (tx: Tx, ofertaId: string) =>
  ((
    await tx
      .select({ m: max(capitulo.orden) })
      .from(capitulo)
      .where(eq(capitulo.ofertaId, ofertaId))
  )[0]?.m ?? 0) + 1;

export const insumosActivos = (db: Bd | Tx) =>
  db
    .select()
    .from(insumo)
    .where(isNull(insumo.eliminadoEn))
    .orderBy(asc(insumo.tipo), asc(insumo.orden), asc(insumo.codigo));
