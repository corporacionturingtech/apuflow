import { z } from 'zod';

export const esquemaTipoInsumo = z.enum(['MA', 'EQ', 'MO', 'TR']);
export type TipoInsumo = z.infer<typeof esquemaTipoInsumo>;

// Dinero como texto decimal ("10.4"): el `numeric` de PostgreSQL nunca pasa por float.
const dinero = z.string().regex(/^\d+(\.\d{1,6})?$/, 'Precio no válido');

export const esquemaInsumo = z.object({
  id: z.string().uuid(),
  tipo: esquemaTipoInsumo,
  codigo: z.string(),
  descripcion: z.string(),
  unidad: z.string(),
  pu: dinero,
  precioAnterior: dinero.nullable(),
  seccion: z.string().nullable(),
  orden: z.number().int(),
  version: z.number().int(),
});
export type Insumo = z.infer<typeof esquemaInsumo>;

export const esquemaInsumoCrear = z.object({
  tipo: esquemaTipoInsumo,
  codigo: z.string().trim().min(1),
  descripcion: z.string().trim().min(1),
  unidad: z.string().trim().min(1),
  pu: dinero.default('0'),
  seccion: z.string().trim().min(1).nullable().optional(),
});
export type InsumoCrear = z.infer<typeof esquemaInsumoCrear>;

export const esquemaInsumoCambio = z.object({
  version: z.number().int(),
  codigo: z.string().trim().min(1).optional(),
  descripcion: z.string().trim().min(1).optional(),
  unidad: z.string().trim().min(1).optional(),
  pu: dinero.optional(),
  seccion: z.string().trim().min(1).nullable().optional(),
});
export type InsumoCambio = z.infer<typeof esquemaInsumoCambio>;

export const esquemaConsultaInsumos = z.object({
  tipo: esquemaTipoInsumo.default('MA'),
  q: z.string().trim().optional(),
});

export const esquemaListaInsumos = z.object({
  items: z.array(esquemaInsumo),
  factor: dinero,
});
export type ListaInsumos = z.infer<typeof esquemaListaInsumos>;
