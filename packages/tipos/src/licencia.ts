import { z } from 'zod';

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha en formato AAAA-MM-DD');

export const esquemaLicenciaContenido = z.object({
  cliente: z.string().min(1),
  plan: z.string().min(1),
  maxUsuarios: z.number().int().positive(),
  modulos: z.array(z.string()),
  emitida: fecha,
  vence: fecha,
  instalacion: z.string().min(1),
});
export type LicenciaContenido = z.infer<typeof esquemaLicenciaContenido>;

export const esquemaLicenciaArchivo = z.object({
  contenido: esquemaLicenciaContenido,
  firma: z.string().min(1),
});
export type LicenciaArchivo = z.infer<typeof esquemaLicenciaArchivo>;

export const esquemaEstadoLicencia = z.enum([
  'sin_licencia',
  'vigente',
  'por_vencer',
  'gracia',
  'solo_lectura',
]);
export type EstadoLicencia = z.infer<typeof esquemaEstadoLicencia>;

export type LicenciaEstado = {
  estado: EstadoLicencia;
  /** Días hasta el vencimiento (negativo si ya venció); null sin licencia. */
  diasParaVencer: number | null;
  /** Días de gracia que quedan (solo en estado `gracia`). */
  diasDeGracia: number | null;
  cliente: string | null;
  plan: string | null;
  vence: string | null;
  maxUsuarios: number | null;
  usuariosActivos: number;
  instalacion: string;
};
