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
};

const fila = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

const nombreDe = (f: BitacoraFila) => {
  const d = fila(f.despues) ?? fila(f.antes);
  const n = d?.descripcion ?? d?.nombre ?? d?.nombreUsuario ?? d?.codigo;
  return typeof n === 'string' ? ` «${n}»` : '';
};

const valor = (v: unknown) => {
  const x = fila(v)?.valor;
  if (x === null || x === undefined || x === '') return '—';
  if (typeof x === 'boolean') return x ? 'activo' : 'inactivo';
  if (typeof x === 'string' && /^-?\d+(\.\d+)?$/.test(x)) return qty(Number(x));
  if (Array.isArray(x)) return x.length ? x.join(', ') : '—';
  return String(x);
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
      cambio: `${valor(f.antes)} → ${valor(f.despues)}`,
    };
  }
  if (f.despues === null || f.despues === undefined) {
    return { que: `quitó ${sujeto}${nombreDe(f)}` };
  }
  return { que: `creó ${sujeto}${nombreDe(f)}` };
}
