import Decimal from 'decimal.js';

// Clon propio: no depende de la configuración global de decimal.js ni la altera.
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dec = Decimal;
export type Num = number | string | Dec;

// ROUND(x;2) de Excel: mitad hacia arriba (en magnitud).
export const r2 = (v: Num): Dec => new D(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export const suma = <T>(xs: readonly T[], f: (x: T) => Dec): Dec =>
  xs.reduce((s, x) => s.plus(f(x)), new D(0));
