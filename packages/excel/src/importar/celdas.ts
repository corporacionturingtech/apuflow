import type { CellValue, Row, Worksheet } from 'exceljs';

export interface Problema {
  hoja: string;
  fila: number;
  mensaje: string;
  /** Un problema bloqueante impide confirmar la importación. */
  bloqueante: boolean;
}

export const norm = (s: unknown): string =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Valor visible de una celda: de una fórmula se toma el resultado en caché. */
export function valor(v: CellValue | undefined): string | number | null {
  if (v == null) return null;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if ('result' in v) return valor(v.result as CellValue);
  if ('richText' in v) return v.richText.map((t) => t.text).join('');
  if ('text' in v) return String(v.text);
  return null;
}

export const texto = (row: Row, col: number): string =>
  String(valor(row.getCell(col).value) ?? '').trim();

export function numero(row: Row, col: number): number | null {
  const v = valor(row.getCell(col).value);
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || !v.trim()) return null;
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Fórmula de una celda, si la tiene. */
export function formula(row: Row, col: number): string | null {
  const v = row.getCell(col).value;
  return v && typeof v === 'object' && 'formula' in v && v.formula ? v.formula : null;
}

/** Busca la hoja por nombre normalizado, sin importar mayúsculas ni tildes. */
export function hojaPor(
  wb: { worksheets: Worksheet[] },
  ...nombres: string[]
): Worksheet | undefined {
  const buscados = nombres.map(norm);
  return wb.worksheets.find((w) => buscados.includes(norm(w.name)));
}

/** Primera fila (en las primeras 30) cuyos encabezados cumplen `ok`; devuelve las columnas por nombre normalizado. */
export function encabezados(
  ws: Worksheet,
  ok: (cols: string[]) => boolean,
): { fila: number; cols: string[] } | null {
  for (let r = 1; r <= Math.min(ws.rowCount, 30); r++) {
    const row = ws.getRow(r);
    const cols: string[] = [];
    for (let c = 1; c <= Math.max(row.cellCount, 1); c++)
      cols.push(norm(valor(row.getCell(c).value)));
    if (ok(cols)) return { fila: r, cols };
  }
  return null;
}

/** Porcentaje de Excel (0,05) a nuestro 5, sin ruido de coma flotante. */
export const aPorcentaje = (x: number): string => String(+(x * 100).toFixed(6));
