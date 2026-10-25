import { calcularOferta } from 'motor';
import { aEntradaMotor } from '../exportar';
import type { LibroLeido } from './leer';

export interface Cuadra {
  /** Falso si el libro no trae el total en caché: no se afirma nada. */
  hayCache: boolean;
  cuadra: boolean;
  totalExcel: number | null;
  totalApuflow: number;
  rubrosDistintos: { fila: number; descripcion: string; excel: number; apuflow: number }[];
}

const TOLERANCIA = 0.005;

/** Compara los totales en caché del libro con lo que calcula el motor (el caché nunca se usa para calcular). */
export function comprobarCuadra({ libro, cache }: LibroLeido): Cuadra {
  const calc = calcularOferta(aEntradaMotor(libro));
  const totalApuflow = calc.totales.subtotal.toNumber();
  const rubrosDistintos: Cuadra['rubrosDistintos'] = [];
  // cache.rubros va en el mismo orden que libro.rubros (leerPresupuesto los agrega a la par).
  cache.rubros.forEach((c, i) => {
    const mio = calc.rubros[i]?.totalOfertado.toNumber();
    if (c.totalOfertado == null || mio == null) return;
    if (Math.abs(c.totalOfertado - mio) > TOLERANCIA)
      rubrosDistintos.push({
        fila: c.fila,
        descripcion: c.descripcion,
        excel: c.totalOfertado,
        apuflow: mio,
      });
  });
  const hayCache = cache.total != null;
  const cuadra =
    hayCache && Math.abs(cache.total! - totalApuflow) <= TOLERANCIA && !rubrosDistintos.length;
  return { hayCache, cuadra, totalExcel: cache.total, totalApuflow, rubrosDistintos };
}
