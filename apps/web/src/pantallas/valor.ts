import { money, parseNum } from '../lib/formato';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const nombreMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  return `${MESES[m - 1]} de ${a}`;
};

export const horas = (h: number) => `${h.toLocaleString('es-EC', { maximumFractionDigits: 1 })} h`;

export const dinero = (monto: string) => money(Number(monto));

/** Minutos escritos por la persona (`2,5` o `2.5`); null si no sirven. */
export const minutos = (texto: string) => {
  const n = parseNum(texto);
  return Number.isFinite(n) && n >= 0 && n <= 240 ? n : null;
};

export const fraseFormula = (p: { minutosPorRubro: number; minutosPorRecalculo: number }) =>
  `Horas ahorradas = (rubros que entraron por bloque × ${p.minutosPorRubro} min + rubros recalculados por cambio de precio × ${p.minutosPorRecalculo} min) ÷ 60`;
