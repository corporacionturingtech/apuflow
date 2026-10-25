import { useSyncExternalStore } from 'react';

export interface Totales {
  subtotal: number;
  iva: number;
  total: number;
}

// La oferta abierta publica aquí sus totales; la barra fija del Layout los muestra (ux.md regla 1).
let actual: Totales | null = null;
const oyentes = new Set<() => void>();

export function fijarTotales(t: Totales | null) {
  actual = t;
  oyentes.forEach((o) => o());
}

export const useTotales = () =>
  useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => actual,
  );
