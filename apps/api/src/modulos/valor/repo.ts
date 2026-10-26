import { and, eq, gte, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import {
  bitacora,
  historialPrecio,
  lineaApu,
  oferta,
  rubro,
  versionOferta,
} from '../../db/esquema';

export type Rango = { desde: Date; hasta: Date };

export const ofertasCreadas = async (db: Bd, r: Rango) =>
  (
    await db
      .select({ n: sql<number>`count(*)::int` })
      .from(bitacora)
      .where(
        and(
          eq(bitacora.entidad, 'oferta'),
          isNull(bitacora.campo),
          isNull(bitacora.antes),
          gte(bitacora.fecha, r.desde),
          lt(bitacora.fecha, r.hasta),
        ),
      )
  )[0]!.n;

/** Última versión emitida de cada oferta con alguna emisión en el mes. */
export const emitidas = (db: Bd, r: Rango) =>
  db
    .selectDistinctOn([versionOferta.ofertaId], {
      ofertaId: versionOferta.ofertaId,
      total: versionOferta.total,
    })
    .from(versionOferta)
    .where(
      and(
        eq(versionOferta.emitida, true),
        gte(versionOferta.creadaEn, r.desde),
        lt(versionOferta.creadaEn, r.hasta),
      ),
    )
    .orderBy(versionOferta.ofertaId, sql`${versionOferta.numero} desc`);

/** Rubros vivos cuyo APU usa un insumo con cambio de precio en el mes. */
export const rubrosRecalculados = async (db: Bd, r: Rango) => {
  const cambiados = db
    .select({ id: historialPrecio.insumoId })
    .from(historialPrecio)
    .where(
      and(
        isNotNull(historialPrecio.puAnterior),
        gte(historialPrecio.fecha, r.desde),
        lt(historialPrecio.fecha, r.hasta),
      ),
    );
  const apus = db
    .selectDistinct({ id: lineaApu.apuId })
    .from(lineaApu)
    .where(inArray(lineaApu.insumoId, cambiados));
  return (
    await db
      .select({ n: sql<number>`count(*)::int` })
      .from(rubro)
      .where(inArray(rubro.apuId, apus))
  )[0]!.n;
};

export const aplicacionesDeBloque = (db: Bd, r: Rango) =>
  db
    .select({ despues: bitacora.despues })
    .from(bitacora)
    .where(
      and(
        eq(bitacora.entidad, 'capitulo'),
        isNull(bitacora.campo),
        isNull(bitacora.antes),
        sql`${bitacora.despues} ->> 'bloqueId' is not null`,
        gte(bitacora.fecha, r.desde),
        lt(bitacora.fecha, r.hasta),
      ),
    );

/** Ofertas con costo objetivo que se tocaron en el mes. */
export const idsConObjetivo = async (db: Bd, r: Rango) =>
  (
    await db
      .select({ id: oferta.id })
      .from(oferta)
      .where(
        and(
          isNotNull(oferta.costoObjetivo),
          gte(oferta.actualizadoEn, r.desde),
          lt(oferta.actualizadoEn, r.hasta),
        ),
      )
  ).map((o) => o.id);
