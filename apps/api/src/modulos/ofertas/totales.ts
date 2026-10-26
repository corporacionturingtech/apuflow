import { asc, inArray } from 'drizzle-orm';
import { calcularDetalle } from 'motor';
import type { Bd } from '../../db/conexion';
import { capitulo, indirecto, oferta, rubro } from '../../db/esquema';
import { apusConLineas, configuracion } from './repo';

const agrupar = <T extends { ofertaId: string }>(filas: T[]) => {
  const m = new Map<string, T[]>();
  for (const f of filas) m.set(f.ofertaId, [...(m.get(f.ofertaId) ?? []), f]);
  return m;
};

/**
 * Total (con IVA) de cada oferta para la lista. Se carga todo en pocas consultas: con
 * `detalleOferta` por oferta serían ~5 consultas por cada una (cientos de ofertas en una empresa).
 */
export async function totalesOfertas(db: Bd, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const [ofertas, caps, rubs, indirs, config] = await Promise.all([
    db.select({ id: oferta.id, iva: oferta.iva }).from(oferta).where(inArray(oferta.id, ids)),
    db
      .select({ id: capitulo.id, ofertaId: capitulo.ofertaId })
      .from(capitulo)
      .where(inArray(capitulo.ofertaId, ids))
      .orderBy(asc(capitulo.orden)),
    db
      .select({
        ofertaId: rubro.ofertaId,
        apuId: rubro.apuId,
        cantidad: rubro.cantidad,
        capituloId: rubro.capituloId,
      })
      .from(rubro)
      .where(inArray(rubro.ofertaId, ids)),
    db
      .select({ ofertaId: indirecto.ofertaId, porcentaje: indirecto.porcentaje })
      .from(indirecto)
      .where(inArray(indirecto.ofertaId, ids)),
    configuracion(db),
  ]);
  const apus = (await apusConLineas(db, [...new Set(rubs.map((r) => r.apuId))])).map(
    ({ apu: a, lineas }) => ({
      id: a.id,
      rendimiento: a.rendimiento,
      herramientaMenor: a.pctHerramientaMenor,
      lineas: lineas.map((l) => ({
        insumoId: l.insumo.id,
        tipo: l.insumo.tipo,
        pu: l.insumo.pu,
        cantidad: l.cantidad,
      })),
    }),
  );
  const capsDe = agrupar(caps);
  const rubsDe = agrupar(rubs);
  const indirsDe = agrupar(indirs);
  const totales = new Map<string, string>();
  for (const o of ofertas) {
    const r = calcularDetalle({
      iva: o.iva ?? config.iva,
      factor: config.factorMateriales,
      indirectos: indirsDe.get(o.id) ?? [],
      capitulos: capsDe.get(o.id) ?? [],
      rubros: rubsDe.get(o.id) ?? [],
      apus,
    });
    totales.set(o.id, r.totales.total.toFixed(2));
  }
  return totales;
}
