import { D, r2, type Dec, type Num } from './redondeo';
import type { OfertaCalculada, RubroCalculado } from './tipos';

export interface Brecha {
  /** r2(subtotal − costo objetivo); positiva = falta bajar. */
  brecha: Dec;
  /** brecha / objetivo × 100; 0 si no hay objetivo. */
  pct: Dec;
  llego: boolean;
}

export function brecha(calculada: OfertaCalculada, costoObjetivo: Num): Brecha {
  const objetivo = new D(costoObjetivo);
  const b = r2(calculada.totales.subtotal.minus(objetivo));
  return { brecha: b, pct: objetivo.isZero() ? new D(0) : b.div(objetivo).times(100), llego: b.lte(0) };
}

/** Mayor `cuTotal` primero (= mayor peso); en empates conserva el orden de la oferta. */
export function rubrosQueMasPesan(calculada: OfertaCalculada, n = 8): RubroCalculado[] {
  return calculada.rubros
    .map((r, i) => ({ r, i }))
    .sort((a, b) => b.r.cuTotal.comparedTo(a.r.cuTotal) || a.i - b.i)
    .slice(0, n)
    .map((x) => x.r);
}
