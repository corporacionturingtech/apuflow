import { and, asc, eq, ilike, or } from 'drizzle-orm';
import type { TipoInsumo } from 'tipos';
import type { Bd } from '../../db/conexion';
import { bitacora, configEmpresa, historialPrecio, insumo } from '../../db/esquema';

export type Tx = Parameters<Parameters<Bd['transaction']>[0]>[0];

export const listar = (db: Bd, tipo: TipoInsumo, q?: string) => {
  const texto = q ? `%${q.replace(/[%_\\]/g, '\\$&')}%` : null;
  return db
    .select()
    .from(insumo)
    .where(
      and(
        eq(insumo.tipo, tipo),
        texto
          ? or(
              ilike(insumo.codigo, texto),
              ilike(insumo.descripcion, texto),
              ilike(insumo.seccion, texto),
            )
          : undefined,
      ),
    )
    .orderBy(asc(insumo.orden), asc(insumo.codigo));
};

// Una sola fila de configuración por instalación; se crea con los valores por defecto si falta.
export const configuracion = async (db: Bd | Tx) =>
  (await db.select().from(configEmpresa).limit(1))[0] ??
  (await db.insert(configEmpresa).values({ nombre: 'Mi empresa' }).returning())[0]!;

export const actualizarConfiguracion = async (
  tx: Tx,
  id: string,
  version: number,
  cambios: Partial<typeof configEmpresa.$inferInsert>,
) =>
  (
    await tx
      .update(configEmpresa)
      .set({ ...cambios, version: version + 1, actualizadoEn: new Date() })
      .where(and(eq(configEmpresa.id, id), eq(configEmpresa.version, version)))
      .returning()
  )[0];

export const insertar = async (tx: Tx, datos: typeof insumo.$inferInsert) =>
  (await tx.insert(insumo).values(datos).returning())[0]!;

export const buscar = async (tx: Tx, id: string) =>
  (await tx.select().from(insumo).where(eq(insumo.id, id)))[0];

// El `where version` es el bloqueo optimista: 0 filas = alguien editó antes.
export const actualizar = async (
  tx: Tx,
  id: string,
  version: number,
  cambios: Partial<typeof insumo.$inferInsert>,
) =>
  (
    await tx
      .update(insumo)
      .set({ ...cambios, version: version + 1, actualizadoEn: new Date() })
      .where(and(eq(insumo.id, id), eq(insumo.version, version)))
      .returning()
  )[0];

export const registrarPrecio = (tx: Tx, d: typeof historialPrecio.$inferInsert) =>
  tx.insert(historialPrecio).values(d);

export const registrarBitacora = (tx: Tx, d: (typeof bitacora.$inferInsert)[]) =>
  d.length ? tx.insert(bitacora).values(d) : Promise.resolve();
