import { z } from 'zod';
import { esquemaTipoInsumo } from './insumos';

// Cantidades y rendimiento como texto decimal, igual que el dinero: nunca float en el cable.
const decimal = z.string().regex(/^\d+(\.\d{1,6})?$/, 'Cantidad no válida');

export const esquemaApu = z.object({
  id: z.string().uuid(),
  codigo: z.string(),
  descripcion: z.string(),
  unidad: z.string(),
  disciplina: z.string().nullable(),
  rendimiento: decimal,
  lineas: z.number().int(),
  version: z.number().int(),
});
export type Apu = z.infer<typeof esquemaApu>;

export const esquemaLineaApu = z.object({
  id: z.string().uuid(),
  insumoId: z.string().uuid(),
  tipo: esquemaTipoInsumo,
  codigo: z.string(),
  descripcion: z.string(),
  unidad: z.string(),
  pu: decimal,
  cantidad: decimal,
  orden: z.number().int(),
});
export type LineaApu = z.infer<typeof esquemaLineaApu>;

export const esquemaApuDetalle = esquemaApu.omit({ lineas: true }).extend({
  lineasApu: z.array(esquemaLineaApu),
  factor: decimal,
  herramientaMenor: decimal,
});
export type ApuDetalle = z.infer<typeof esquemaApuDetalle>;

export const esquemaConsultaApus = z.object({ q: z.string().trim().optional() });

export const esquemaApuCambio = z.object({
  version: z.number().int(),
  rendimiento: decimal.optional(),
  descripcion: z.string().trim().min(1).optional(),
  unidad: z.string().trim().min(1).optional(),
});
export type ApuCambio = z.infer<typeof esquemaApuCambio>;

export const esquemaLineaCrear = z.object({
  version: z.number().int(),
  insumoId: z.string().uuid(),
  cantidad: decimal.default('1'),
});
export type LineaCrear = z.infer<typeof esquemaLineaCrear>;

export const esquemaLineaCambio = z.object({ version: z.number().int(), cantidad: decimal });
export type LineaCambio = z.infer<typeof esquemaLineaCambio>;

export const esquemaVersionApu = z.object({ version: z.number().int() });
