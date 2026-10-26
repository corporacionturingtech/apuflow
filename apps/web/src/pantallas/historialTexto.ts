import type { BitacoraFila } from 'tipos';
import { qty } from '../lib/formato';

export const ENTIDADES: [string, string][] = [
  ['insumo', 'Precios'],
  ['apu', 'APUs'],
  ['linea_apu', 'Líneas de APU'],
  ['oferta', 'Ofertas'],
  ['capitulo', 'Capítulos'],
  ['rubro', 'Rubros'],
  ['indirecto', 'Indirectos'],
  ['version_oferta', 'Versiones'],
  ['bloque', 'Bloques'],
  ['usuario', 'Usuarios'],
  ['config_empresa', 'Configuración'],
];

const SINGULAR: Record<string, string> = {
  insumo: 'el insumo',
  apu: 'el APU',
  linea_apu: 'una línea del APU',
  oferta: 'la oferta',
  capitulo: 'el capítulo',
  rubro: 'el rubro',
  indirecto: 'el indirecto',
  version_oferta: 'una versión de la oferta',
  bloque: 'el bloque',
  usuario: 'el usuario',
  config_empresa: 'la configuración',
};

const CAMPOS: Record<string, string> = {
  pu: 'el precio',
  cantidad: 'la cantidad',
  rendimiento: 'el rendimiento',
  porcentaje: 'el porcentaje',
  pctHerramientaMenor: 'la herramienta menor',
  codigo: 'el código',
  cpc: 'el CPC',
  origen: 'el origen',
  vae: 'el VAE',
  costoObjetivo: 'el costo objetivo',
  nombre: 'el nombre',
  cliente: 'el cliente',
  descripcion: 'la descripción',
  unidad: 'la unidad',
  rol: 'el rol',
  activo: 'el estado',
  disciplinas: 'las disciplinas',
  parametrosValor: 'los minutos de ahorro',
  iva: 'el IVA',
  moneda: 'la moneda',
  formatoNumero: 'el formato de números',
  acento: 'el color de acento',
  logo: 'el logo',
  tipoOfertaDefecto: 'el tipo de oferta por defecto',
  apuId: 'el APU',
};

// Valores compuestos (p. ej. `parametrosValor`): cada clave con su etiqueta y unidad.
const PARTES: Record<string, [string, string]> = {
  minutosPorRubro: ['por rubro', ' min'],
  minutosPorRecalculo: ['por recálculo', ' min'],
};

const fila = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

const nombreDe = (f: BitacoraFila) => {
  const d = fila(f.despues) ?? fila(f.antes);
  const n = d?.descripcion ?? d?.nombre ?? d?.nombreUsuario ?? d?.codigo;
  return typeof n === 'string' ? ` «${n}»` : '';
};

const simple = (x: unknown): string => {
  if (x === null || x === undefined || x === '') return '—';
  if (typeof x === 'boolean') return x ? 'activo' : 'inactivo';
  if (typeof x === 'number') return qty(x);
  if (typeof x === 'string' && /^-?\d+(\.\d+)?$/.test(x)) return qty(Number(x));
  if (Array.isArray(x)) return x.length ? x.map(simple).join(', ') : '—';
  const o = fila(x);
  if (o) {
    const partes = Object.entries(o).map(([k, v]) => {
      const [etiqueta, unidad] = PARTES[k] ?? [k, ''];
      return `${etiqueta} ${simple(v)}${unidad}`;
    });
    return partes.length ? partes.join(', ') : '—';
  }
  return String(x);
};

// Casi todo se guarda como `{ valor }`; Configuración › Empresa guarda `{ [campo]: valor }`.
const valor = (v: unknown, campo: string) => {
  const f = fila(v);
  return simple(f && 'valor' in f ? f.valor : f?.[campo]);
};

/** Frase legible de un movimiento de la bitácora (ux.md: nada de «entidad» ni «registro»). */
export function describir(f: BitacoraFila): { que: string; cambio?: string } {
  const sujeto = SINGULAR[f.entidad] ?? 'un dato';
  if (f.campo === 'eliminadoEn') {
    const sale = fila(f.despues)?.valor;
    return { que: `${sale ? 'envió a la papelera' : 'restauró'} ${sujeto}` };
  }
  if (f.campo === 'clave') return { que: `cambió la clave de ${sujeto}` };
  if (f.campo) {
    const campo = CAMPOS[f.campo] ?? `«${f.campo}»`;
    return {
      que: `cambió ${campo} de ${sujeto}${nombreDe(f)}`,
      cambio: `${valor(f.antes, f.campo)} → ${valor(f.despues, f.campo)}`,
    };
  }
  if (f.despues === null || f.despues === undefined) {
    return { que: `quitó ${sujeto}${nombreDe(f)}` };
  }
  return { que: `creó ${sujeto}${nombreDe(f)}` };
}
