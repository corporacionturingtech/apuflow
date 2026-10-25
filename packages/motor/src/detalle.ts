import { calcularOferta } from './oferta';
import type { Apu, Listas, Oferta, OfertaCalculada } from './tipos';

/** Forma mínima del detalle de una oferta (la de `tipos`), para que el motor no dependa de zod. */
export interface DetalleCalculable {
  iva: string;
  factor: string;
  indirectos: readonly { porcentaje: string }[];
  capitulos: readonly { id: string }[];
  rubros: readonly { apuId: string; cantidad: string; capituloId: string }[];
  apus: readonly {
    id: string;
    rendimiento: string;
    herramientaMenor: string;
    lineas: readonly { insumoId: string; tipo: string; pu: string; cantidad: string }[];
  }[];
}

/** Arma la entrada del motor desde el detalle de una oferta (o de su snapshot) y la calcula. */
export function calcularDetalle(d: DetalleCalculable): OfertaCalculada {
  const vistos = new Set<string>();
  const listas: { [K in keyof Listas]: Listas[K][number][] } = {
    materiales: [],
    equipos: [],
    manoObra: [],
    transporte: [],
  };
  const apus: Apu[] = d.apus.map((a) => {
    const por = (tipo: string) =>
      a.lineas.filter((l) => l.tipo === tipo).map((l) => [l.insumoId, l.cantidad] as const);
    for (const l of a.lineas) {
      if (vistos.has(l.insumoId)) continue;
      vistos.add(l.insumoId);
      if (l.tipo === 'MA') listas.materiales.push({ id: l.insumoId, pu: l.pu });
      else
        listas[l.tipo === 'EQ' ? 'equipos' : l.tipo === 'MO' ? 'manoObra' : 'transporte'].push({
          id: l.insumoId,
          p: l.pu,
        });
    }
    return {
      id: a.id,
      rendimiento: a.rendimiento,
      herramientaMenor: a.herramientaMenor,
      equipos: por('EQ'),
      manoObra: por('MO'),
      materiales: por('MA'),
      transporte: por('TR'),
    };
  });
  const entrada: Oferta = {
    factor: d.factor,
    herramientaMenor: 0,
    iva: d.iva,
    indirectos: d.indirectos.map((i) => ({ p: i.porcentaje })),
    listas,
    apus,
    capitulos: d.capitulos.map((c) => ({ id: c.id })),
    rubros: d.rubros.map((r) => ({ apu: r.apuId, cantidad: r.cantidad, capitulo: r.capituloId })),
  };
  return calcularOferta(entrada);
}
