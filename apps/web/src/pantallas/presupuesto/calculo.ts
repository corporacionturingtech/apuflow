import { brecha, calcularDetalle } from 'motor';
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
export function costoDirectoBloque(r: BloquesRespuesta, b: BloqueLista) {
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
    indirectos: [],
    capitulos: [{ id: b.id, nombre: b.nombre, disciplina: b.disciplina, version: 1 }],
    rubros: b.lineas.map((l, i) => ({
      id: `${b.id}-${i}`,
      capituloId: b.id,
      apuId: l.apuId,
      codigo: '',
      cantidad: l.cantidad,
      cpc: null,
      origen: null,
      vae: null,
      version: 1,
    })),
    apus: r.apus.filter((a) => usados.has(a.id)),
  };
  return calcularPresupuesto(detalle).capitulos[b.id]!.cuTotal.toNumber();
}
