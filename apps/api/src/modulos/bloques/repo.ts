import { and, asc, eq } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import { bloque, lineaBloque } from '../../db/esquema';
import type { Tx } from '../insumos/repo';

export { apusConLineas, buscar as buscarOferta, capitulos, configuracion } from '../ofertas/repo';
export { buscarCapitulo, insertarCapitulo, insertarRubro, rubrosDeCapitulo } from '../ofertas/repo';
export { siguienteOrdenCapitulo, registrarBitacora } from '../ofertas/repo';

export const listar = (db: Bd | Tx) => db.select().from(bloque).orderBy(asc(bloque.nombre));

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

// Las líneas caen por `on delete cascade`.
export const eliminar = async (tx: Tx, id: string, version: number) =>
  (
    await tx
      .delete(bloque)
      .where(and(eq(bloque.id, id), eq(bloque.version, version)))
      .returning()
  )[0];
