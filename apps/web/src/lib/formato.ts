/** Formatos como en su Excel: $ 1.313,64 (portado del prototipo, líneas 645–674). */
export function fmt(v: number, min: number, max: number): string {
  const neg = v < 0;
  const s = Math.abs(v).toFixed(max);
  const [ent = '0', dec0] = s.split('.');
  let dec = dec0 ? dec0.replace(/0+$/, '') : '';
  if (dec0) while (dec.length < min) dec += '0';
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + miles + (dec ? ',' + dec : '');
}

export const money = (v: number) => (v < 0 ? '-$ ' : '$ ') + fmt(Math.abs(v), 2, 2);
export const n2 = (v: number) => fmt(v, 2, 2);
export const qty = (v: number) => fmt(v, 0, 4);
export const pct = (v: number, d = 2) => fmt(v, d, d) + ' %';
export const sgn = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + money(Math.abs(v));

/** Acepta "2,40", "2.40", "1.234,56", "1,234.56" y "$ 3,92". */
export function parseNum(str: unknown): number {
  let t = String(str ?? '')
    .trim()
    .replace(/[^0-9.,-]/g, '');
  if (!t || t === '-') return NaN;
  const c = t.lastIndexOf(',');
  const p = t.lastIndexOf('.');
  if (c > -1 && p > -1) {
    t = c > p ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (c > -1) {
    t = (t.match(/,/g) ?? []).length > 1 ? t.replace(/,/g, '') : t.replace(',', '.');
  } else if (p > -1 && (t.match(/\./g) ?? []).length > 1) {
    t = t.replace(/\./g, '');
  }
  return Number(t);
}
