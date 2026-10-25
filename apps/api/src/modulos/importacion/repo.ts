import { and, isNull } from 'drizzle-orm';
import { apu, indirecto, insumo, lineaApu } from '../../db/esquema';
import type { Bd } from '../../db/conexion';
import type { Tx } from '../insumos/repo';

export {
  configuracion,
  registrarBitacora,
  insertar as insertarInsumo,
  codigoEnUso,
  ultimoOrden,
} from '../insumos/repo';
export { crear as crearOferta, insertarCapitulo, insertarRubro } from '../ofertas/repo';
export type { Tx };

export const insumosActivos = (db: Bd | Tx) =>
  db
    .select()
    .from(insumo)
    .where(and(isNull(insumo.eliminadoEn)));

export const apusExistentes = (db: Bd | Tx) => db.select({ codigo: apu.codigo }).from(apu);

export const insertarApu = async (tx: Tx, d: typeof apu.$inferInsert) =>
  (await tx.insert(apu).values(d).returning())[0]!;

export const insertarLineas = (tx: Tx, d: (typeof lineaApu.$inferInsert)[]) =>
  d.length ? tx.insert(lineaApu).values(d) : Promise.resolve();

export const insertarIndirectos = (tx: Tx, d: (typeof indirecto.$inferInsert)[]) =>
  d.length ? tx.insert(indirecto).values(d).returning() : Promise.resolve([]);
