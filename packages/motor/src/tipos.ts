import type { Dec } from './redondeo';

// Línea de un APU: [id del insumo, cantidad A].
export type LineaEntrada = readonly [string, number | string];

export interface Material {
  id: string;
  pu: number | string;
}
// Equipos, mano de obra y transporte: `p` es tarifa/hora, jornal/hora o tarifa.
export interface Tarifa {
  id: string;
  p: number | string;
}

export interface Listas {
  materiales: readonly Material[];
  equipos: readonly Tarifa[];
  manoObra: readonly Tarifa[];
  transporte: readonly Tarifa[];
}

export interface Apu {
  id: string;
  rendimiento: number | string;
  /** % propio; si falta, rige el de `Parametros`. */
  herramientaMenor?: number | string;
  equipos: readonly LineaEntrada[];
  manoObra: readonly LineaEntrada[];
  materiales: readonly LineaEntrada[];
  transporte: readonly LineaEntrada[];
}

export interface Parametros {
  factor: number | string;
  /** % de herramienta menor sobre la mano de obra. */
  herramientaMenor: number | string;
  iva: number | string;
  /** % de cada indirecto de la oferta; se suman. */
  indirectos: readonly { p: number | string }[];
}

export interface Rubro {
  apu: string;
  cantidad: number | string;
  capitulo: string;
}

export interface Oferta extends Parametros {
  listas: Listas;
  apus: readonly Apu[];
  capitulos: readonly { id: string }[];
  rubros: readonly Rubro[];
}

export interface LineaCalculada {
  id: string;
  cantidad: Dec;
  precio: Dec;
  /** D (equipos, mano de obra) o C (materiales, transporte): lo que se suma. */
  importe: Dec;
}

export interface ApuCalculado {
  equipos: LineaCalculada[];
  manoObra: LineaCalculada[];
  materiales: LineaCalculada[];
  transporte: LineaCalculada[];
  hm: Dec;
  eq: Dec;
  mo: Dec;
  ma: Dec;
  tra: Dec;
  cu: Dec;
  pctIndirectos: Dec;
  puOfertado: Dec;
}

export interface RubroCalculado {
  rubro: Rubro;
  cantidad: Dec;
  eq: Dec;
  ctEq: Dec;
  mo: Dec;
  ctMo: Dec;
  ma: Dec;
  ctMa: Dec;
  tra: Dec;
  ctTra: Dec;
  cu: Dec;
  cuTotal: Dec;
  puOfertado: Dec;
  totalOfertado: Dec;
  /** cuTotal / cuTotalOferta, sin redondear. */
  peso: Dec;
}

export interface CapituloCalculado {
  cuTotal: Dec;
  totalOfertado: Dec;
  rubros: number;
}

export interface OfertaCalculada {
  apus: Record<string, ApuCalculado>;
  rubros: RubroCalculado[];
  capitulos: Record<string, CapituloCalculado>;
  totales: {
    ctEq: Dec;
    ctMo: Dec;
    ctMa: Dec;
    ctTra: Dec;
    cuTotalOferta: Dec;
    subtotal: Dec;
    indirectos: Dec;
    pctIndirectos: Dec;
    iva: Dec;
    total: Dec;
  };
}
