import { asc, and, eq } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import { usuario } from '../../db/esquema';

export {
  configuracion,
  actualizarConfiguracion,
  registrarBitacora,
  type Tx,
} from '../insumos/repo';
import type { Tx } from '../insumos/repo';

export const listar = (db: Bd) => db.select().from(usuario).orderBy(asc(usuario.nombreUsuario));

export const buscar = async (db: Bd | Tx, id: string) =>
  (await db.select().from(usuario).where(eq(usuario.id, id)))[0];

export const buscarPorNombre = async (db: Bd | Tx, nombreUsuario: string) =>
  (await db.select().from(usuario).where(eq(usuario.nombreUsuario, nombreUsuario)))[0];

export const insertar = async (tx: Tx, d: typeof usuario.$inferInsert) =>
  (await tx.insert(usuario).values(d).returning())[0]!;

// El `where version` es el bloqueo optimista: 0 filas = alguien editó antes.
export const actualizar = async (
  tx: Tx,
  id: string,
  version: number,
  cambios: Partial<typeof usuario.$inferInsert>,
) =>
  (
    await tx
      .update(usuario)
      .set({ ...cambios, version: version + 1, actualizadoEn: new Date() })
      .where(and(eq(usuario.id, id), eq(usuario.version, version)))
      .returning()
  )[0];
