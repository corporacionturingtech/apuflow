import type { RubroCambio } from 'tipos';
import { precioATexto } from '../precio';
import type { FilaRubro } from './columnas';

type Cambio = Omit<RubroCambio, 'version'>;

/** Traduce lo escrito en una celda del presupuesto: mensaje si no vale, cambio o nada si no cambió. */
export function cambioDeCelda(
  fila: FilaRubro,
  columna: string,
  texto: string,
): string | Cambio | null {
  const t = texto.trim();
  if (columna === 'cantidad') {
    const valor = precioATexto(texto);
    if (valor === null) return 'Escriba una cantidad válida, por ejemplo 12,5';
    return Number(valor) !== Number(fila.cantidad) ? { cantidad: valor } : null;
  }
  if (columna === 'codigo') {
    if (!t) return 'El código no puede quedar vacío';
    return t !== fila.codigo ? { codigo: t } : null;
  }
  if (columna === 'cpc') return t !== fila.cpc ? { cpc: t || null } : null;
  if (columna === 'origen') {
    const o = t.toUpperCase();
    if (o && !['P', 'ND', 'I'].includes(o)) return 'El origen es P, ND o I';
    return o !== fila.origen ? { origen: (o || null) as 'P' | 'ND' | 'I' | null } : null;
  }
  if (columna === 'vae') {
    const valor = t ? precioATexto(t) : null;
    if (t && (valor === null || Number(valor) > 100)) return 'Escriba un VAE entre 0 y 100';
    return (valor ?? '') !== (fila.vae ? String(Number(fila.vae)) : '') ? { vae: valor } : null;
  }
  return null;
}
