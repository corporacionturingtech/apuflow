import type { Style, Worksheet } from 'exceljs';

const AMARILLO = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } } as const;
const GRIS = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as const;
const OSCURO = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } } as const;
const MONEDA = '#,##0.00';
const borde = { style: 'thin', color: { argb: 'FFBFBFBF' } } as const;
const caja = { top: borde, bottom: borde, left: borde, right: borde };

export const ST = {
  title: { font: { bold: true, size: 14 } },
  bold: { font: { bold: true } },
  txt: {},
  num: { numFmt: '0.00##' },
  money: { numFmt: MONEDA },
  pct: { numFmt: '0.00%' },
  head: { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: OSCURO, border: caja },
  cap: { font: { bold: true }, fill: GRIS },
  sec: { font: { bold: true }, fill: GRIS },
  label: { font: { italic: true, color: { argb: 'FF7F7F7F' } } },
  boldMoney: { font: { bold: true }, numFmt: MONEDA },
  tot: { font: { bold: true }, numFmt: MONEDA, fill: GRIS, border: caja },
  inMoney: { numFmt: MONEDA, fill: AMARILLO },
  inNum: { numFmt: '0.00##', fill: AMARILLO },
  inPct: { numFmt: '0.00%', fill: AMARILLO },
} satisfies Record<string, Partial<Style>>;

export type Estilo = Partial<Style>;

/** Letra de columna (0 = A). */
export const colL = (i: number): string => String.fromCharCode(65 + i);

/** Escribe un valor; con `formula`, `valor` queda como resultado en caché. */
export function poner(
  ws: Worksheet,
  ref: string,
  valor: string | number,
  estilo: Estilo = ST.txt,
  formula?: string,
) {
  const c = ws.getCell(ref);
  c.value = formula ? { formula, result: valor } : valor;
  Object.assign(c, { style: estilo });
}

export const comillas = (nombre: string) => `'${nombre.replace(/'/g, "''")}'`;
