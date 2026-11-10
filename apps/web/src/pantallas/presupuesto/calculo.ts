import { D, brecha, calcularDetalle, type Num } from 'motor';
import type { BloqueLista, BloquesRespuesta, OfertaDetalle } from 'tipos';

/** Arma la entrada del motor desde el detalle: la web no multiplica nada por su cuenta. */
export function calcularPresupuesto(d: OfertaDetalle) {
  const oferta = calcularDetalle(d);
  return {
    ...oferta,
    oferta,
    brecha: d.costoObjetivo ? brecha(oferta, d.costoObjetivo) : null,
  };
}

/** Costo directo de un bloque: se calcula como un capítulo de oferta, con el mismo motor. */
export const costoDirectoBloque = (r: BloquesRespuesta, b: BloqueLista) =>
  totalesBloque(r, b).costoDirecto;

/**
 * Costo directo y ofertado de un bloque con el motor. `factor` escala las cantidades como lo hace
 * la API al añadirlo (6 decimales), así la vista previa coincide con lo que entra a la oferta.
 */
export function totalesBloque(
  r: BloquesRespuesta,
  b: BloqueLista,
  indirectos: OfertaDetalle['indirectos'] = [],
  factor: Num = 1,
) {
  const usados = new Set(b.lineas.map((l) => l.apuId));
  const detalle: OfertaDetalle = {
    id: b.id,
    nombre: b.nombre,
    cliente: null,
    tipo: 'privado',
    estado: 'borrador',
    version: 1,
    iva: r.iva,
    factor: r.factor,
    costoObjetivo: null,
    indirectos,
    capitulos: [{ id: b.id, nombre: b.nombre, disciplina: b.disciplina, version: 1 }],
    rubros: b.lineas.map((l, i) => ({
      id: `${b.id}-${i}`,
      capituloId: b.id,
      apuId: l.apuId,
      codigo: '',
      cantidad: new D(l.cantidad).times(factor).toDecimalPlaces(6).toString(),
      cpc: null,
      origen: null,
      vae: null,
      version: 1,
    })),
    apus: r.apus.filter((a) => usados.has(a.id)),
  };
  const c = calcularPresupuesto(detalle).capitulos[b.id]!;
  return { costoDirecto: c.cuTotal.toNumber(), ofertado: c.totalOfertado.toNumber() };
}
