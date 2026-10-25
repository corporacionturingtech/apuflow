import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import { apu, insumo, lineaApu } from '../../db/esquema';

export { configuracion, registrarBitacora, type Tx } from '../insumos/repo';
import type { Tx } from '../insumos/repo';

export const listar = (db: Bd, q?: string) => {
  const texto = q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null;
  return db
    .select({ apu, lineas: count(lineaApu.id) })
    .from(apu)
    .leftJoin(lineaApu, eq(lineaApu.apuId, apu.id))
    .where(texto ? or(ilike(apu.codigo, texto), ilike(apu.descripcion, texto)) : undefined)
    .groupBy(apu.id)
    .orderBy(asc(apu.disciplina), asc(apu.codigo));
};

export const buscar = async (db: Bd | Tx, id: string) =>
  (await db.select().from(apu).where(eq(apu.id, id)))[0];

// Las líneas traen su insumo aunque esté en la papelera: el APU no debe romperse por eso.
export const lineas = (db: Bd | Tx, apuId: string) =>
  db
    .select({ linea: lineaApu, insumo })
    .from(lineaApu)
    .innerJoin(insumo, eq(insumo.id, lineaApu.insumoId))
    .where(eq(lineaApu.apuId, apuId))
    .orderBy(asc(lineaApu.orden), asc(insumo.codigo));

export const buscarLinea = async (tx: Tx, apuId: string, id: string) =>
  (
    await tx
      .select()
      .from(lineaApu)
      .where(and(eq(lineaApu.id, id), eq(lineaApu.apuId, apuId)))
  )[0];

export const insumoDeLinea = async (tx: Tx, apuId: string, insumoId: string) =>
  (
    await tx
      .select({ id: lineaApu.id })
      .from(lineaApu)
      .where(and(eq(lineaApu.apuId, apuId), eq(lineaApu.insumoId, insumoId)))
  )[0];

export const buscarInsumo = async (tx: Tx, id: string) =>
  (await tx.select().from(insumo).where(eq(insumo.id, id)))[0];

// El `where version` es el bloqueo optimista: 0 filas = alguien editó antes.
export const actualizar = async (
  tx: Tx,
  id: string,
  version: number,
  cambios: Partial<typeof apu.$inferInsert>,
) =>
  (
    await tx
      .update(apu)
      .set({ ...cambios, version: version + 1, actualizadoEn: new Date() })
      .where(and(eq(apu.id, id), eq(apu.version, version)))
      .returning()
  )[0];

export const insertarLinea = async (tx: Tx, d: typeof lineaApu.$inferInsert) =>
  (await tx.insert(lineaApu).values(d).returning())[0]!;

export const cambiarCantidad = (tx: Tx, id: string, cantidad: string) =>
  tx.update(lineaApu).set({ cantidad }).where(eq(lineaApu.id, id));

export const borrarLinea = (tx: Tx, id: string) => tx.delete(lineaApu).where(eq(lineaApu.id, id));

export const ultimoOrden = async (tx: Tx, apuId: string) =>
  (
    await tx
      .select({ o: lineaApu.orden })
      .from(lineaApu)
      .where(eq(lineaApu.apuId, apuId))
      .orderBy(asc(lineaApu.orden))
  ).at(-1)?.o ?? 0;
