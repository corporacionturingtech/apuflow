import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import { bloque, lineaBloque } from '../../db/esquema';
import type { Tx } from '../insumos/repo';

export { apusConLineas, buscar as buscarOferta, capitulos, configuracion } from '../ofertas/repo';
export { buscarCapitulo, insertarCapitulo, insertarRubro, rubrosDeCapitulo } from '../ofertas/repo';
export { siguienteOrdenCapitulo, registrarBitacora } from '../ofertas/repo';

export const listar = (db: Bd | Tx, papelera = false) =>
  db
    .select()
    .from(bloque)
    .where(papelera ? isNotNull(bloque.eliminadoEn) : isNull(bloque.eliminadoEn))
    .orderBy(papelera ? desc(bloque.eliminadoEn) : asc(bloque.nombre));

export const lineas = (db: Bd | Tx) =>
  db.select().from(lineaBloque).orderBy(asc(lineaBloque.bloqueId), asc(lineaBloque.orden));

export const buscar = async (db: Bd | Tx, id: string) =>
  (await db.select().from(bloque).where(eq(bloque.id, id)))[0];

export const lineasDe = (db: Bd | Tx, bloqueId: string) =>
  db
    .select()
    .from(lineaBloque)
    .where(eq(lineaBloque.bloqueId, bloqueId))
    .orderBy(asc(lineaBloque.orden));

export const crear = async (tx: Tx, d: typeof bloque.$inferInsert) =>
  (await tx.insert(bloque).values(d).returning())[0]!;

export const insertarLineas = (tx: Tx, d: (typeof lineaBloque.$inferInsert)[]) =>
  tx.insert(lineaBloque).values(d).returning();

// Borrado lógico (papelera): las líneas se conservan para poder restaurar.
export const marcarEliminado = async (
  tx: Tx,
  id: string,
  version: number,
  eliminado: boolean,
  usuarioId: string,
) =>
  (
    await tx
      .update(bloque)
      .set({
        eliminadoEn: eliminado ? new Date() : null,
        version: sql`${bloque.version} + 1`,
        actualizadoPor: usuarioId,
        actualizadoEn: new Date(),
      })
      .where(and(eq(bloque.id, id), eq(bloque.version, version)))
      .returning()
  )[0];
