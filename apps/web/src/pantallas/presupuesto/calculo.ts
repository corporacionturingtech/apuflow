import { calcularOferta, type Apu, type Listas, type Oferta as OfertaMotor } from 'motor';
import type { BloqueLista, BloquesRespuesta, OfertaDetalle } from 'tipos';

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
