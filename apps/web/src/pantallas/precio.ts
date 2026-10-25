import { parseNum } from '../lib/formato';

// Texto decimal que acepta el API ("10.4"); null si no es un precio válido.
export function precioATexto(texto: string): string | null {
  const n = parseNum(texto);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(6).replace(/\.?0+$/, '') || '0';
}
