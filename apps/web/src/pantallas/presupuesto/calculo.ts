import { calcularOferta, type Apu, type Listas, type Oferta as OfertaMotor } from 'motor';
import type { OfertaDetalle } from 'tipos';

/** Arma la entrada del motor desde el detalle: la web no multiplica nada por su cuenta. */
export function calcularPresupuesto(d: OfertaDetalle) {
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
  const entrada: OfertaMotor = {
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
