import { D, r2, suma, type Dec, type Num } from './redondeo';
import type {
  Apu,
  ApuCalculado,
  LineaCalculada,
  LineaEntrada,
  Listas,
  Parametros,
} from './tipos';

export const pctIndirectos = (p: Pick<Parametros, 'indirectos'>): Dec =>
  r2(suma(p.indirectos, (i) => new D(i.p)));

/** Precio de materiales: B = r2(PU × FACTOR). */
export const precioMaterial = (pu: Num, factor: Num): Dec => r2(new D(pu).times(factor));

function buscar<T extends { id: string }>(lista: readonly T[], id: string, que: string): T {
  const x = lista.find((i) => i.id === id);
  if (!x) throw new Error(`Insumo de ${que} no existe: ${id}`);
  return x;
}

function linea(
  [id, a]: LineaEntrada,
  precio: Dec,
  importe: (A: Dec, B: Dec) => Dec,
): LineaCalculada {
  const cantidad = new D(a);
  return { id, cantidad, precio, importe: importe(cantidad, precio) };
}

// Orden de redondeo = el del Excel; no reordenar (cambia centavos).
export function calcularApu(apu: Apu, listas: Listas, p: Parametros): ApuCalculado {
  const R = new D(apu.rendimiento);
  const porRendimiento = (A: Dec, B: Dec) => r2(A.times(B).times(R));
  const porCantidad = (A: Dec, B: Dec) => r2(A.times(B));

  const equipos = apu.equipos.map((l) =>
    linea(l, new D(buscar(listas.equipos, l[0], 'equipos').p), porRendimiento),
  );
  const manoObra = apu.manoObra.map((l) =>
    linea(l, new D(buscar(listas.manoObra, l[0], 'mano de obra').p), porRendimiento),
  );
  const materiales = apu.materiales.map((l) =>
    linea(l, precioMaterial(buscar(listas.materiales, l[0], 'materiales').pu, p.factor), porCantidad),
  );
  const transporte = apu.transporte.map((l) =>
    linea(l, new D(buscar(listas.transporte, l[0], 'transporte').p), porCantidad),
  );

  const mo = r2(suma(manoObra, (l) => l.importe));
  const hm = r2(mo.times(apu.herramientaMenor ?? p.herramientaMenor).div(100));
  const eq = r2(suma(equipos, (l) => l.importe).plus(hm));
  const ma = r2(suma(materiales, (l) => l.importe));
  const tra = r2(suma(transporte, (l) => l.importe));
  const cu = r2(eq.plus(mo).plus(ma).plus(tra));
  const pct = pctIndirectos(p);
  const puOfertado = r2(cu.times(new D(1).plus(pct.div(100))));

  return { equipos, manoObra, materiales, transporte, hm, eq, mo, ma, tra, cu, pctIndirectos: pct, puOfertado };
}
