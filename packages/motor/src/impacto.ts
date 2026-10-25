import { calcularOferta } from './oferta';
import type { Dec } from './redondeo';
import type { Listas, Oferta, OfertaCalculada } from './tipos';

export interface Cambio {
  lista: keyof Listas;
  id: string;
  precio: number | string;
}

export interface Impacto {
  /** Ids de los APUs que usan el insumo. */
  apus: string[];
  /** Índices (en `oferta.rubros`) de los rubros que usan esos APUs. */
  rubros: number[];
  antes: OfertaCalculada;
  despues: OfertaCalculada;
  /** subtotal después − subtotal antes. */
  diferencia: Dec;
}

/** Aplica el cambio sobre una copia; la oferta recibida no se muta. */
export function aplicarCambio(oferta: Oferta, { lista, id, precio }: Cambio): Oferta {
  const campo = lista === 'materiales' ? 'pu' : 'p';
  if (!oferta.listas[lista].some((i) => i.id === id)) throw new Error(`Insumo de ${lista} no existe: ${id}`);
  const nueva = oferta.listas[lista].map((i) => (i.id === id ? { ...i, [campo]: precio } : i));
  return { ...oferta, listas: { ...oferta.listas, [lista]: nueva } };
}

export function impacto(oferta: Oferta, cambio: Cambio, antes: OfertaCalculada = calcularOferta(oferta)): Impacto {
  const nueva = aplicarCambio(oferta, cambio);
  const afectados = new Set(
    oferta.apus.filter((a) => a[cambio.lista].some(([id]) => id === cambio.id)).map((a) => a.id),
  );
  const rubros = oferta.rubros.flatMap((r, i) => (afectados.has(r.apu) ? [i] : []));
  const despues = calcularOferta(nueva);
  return {
    apus: [...afectados],
    rubros,
    antes,
    despues,
    diferencia: despues.totales.subtotal.minus(antes.totales.subtotal),
  };
}
