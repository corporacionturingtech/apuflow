import { calcularApu, type Listas } from 'motor';
import type { apusConLineas } from '../ofertas/repo';

const LISTA = { EQ: 'equipos', MO: 'manoObra', TR: 'transporte' } as const;

/** Costo unitario directo (sin indirectos) de cada APU, con el mismo motor que su pantalla. */
export function costosUnitarios(
  detalle: Awaited<ReturnType<typeof apusConLineas>>,
  factor: string,
): Map<string, string> {
  const res = new Map<string, string>();
  for (const { apu: a, lineas } of detalle) {
    const listas: { [K in keyof Listas]: Listas[K][number][] } = {
      materiales: [],
      equipos: [],
      manoObra: [],
      transporte: [],
    };
    for (const { insumo: i } of lineas) {
      if (i.tipo === 'MA') listas.materiales.push({ id: i.id, pu: i.pu });
      else listas[LISTA[i.tipo]].push({ id: i.id, p: i.pu });
    }
    const por = (tipo: string) =>
      lineas.filter((l) => l.insumo.tipo === tipo).map((l) => [l.insumo.id, l.cantidad] as const);
    const c = calcularApu(
      {
        id: a.id,
        rendimiento: a.rendimiento,
        equipos: por('EQ'),
        manoObra: por('MO'),
        materiales: por('MA'),
        transporte: por('TR'),
      },
      listas,
      { factor, herramientaMenor: a.pctHerramientaMenor, iva: 0, indirectos: [] },
    );
    res.set(a.id, c.cu.toFixed(2));
  }
  return res;
}
