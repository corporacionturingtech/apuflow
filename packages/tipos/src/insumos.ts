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
  eliminadoEn: z.string().nullable(),
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
  papelera: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export const esquemaInsumoVersion = z.object({ version: z.number().int() });

export const esquemaHerramientaMenor = z.object({
  pct: dinero,
  version: z.number().int(),
});
export type HerramientaMenor = z.infer<typeof esquemaHerramientaMenor>;

export const esquemaHerramientaMenorCambio = z.object({
  version: z.number().int(),
  pct: dinero.refine((v) => Number(v) <= 100, 'Debe estar entre 0 y 100'),
});
export type HerramientaMenorCambio = z.infer<typeof esquemaHerramientaMenorCambio>;

export const esquemaListaInsumos = z.object({
  items: z.array(esquemaInsumo),
  factor: dinero,
  herramientaMenor: esquemaHerramientaMenor,
});
export type ListaInsumos = z.infer<typeof esquemaListaInsumos>;

// Efecto de un cambio de precio sobre las ofertas (panel de impacto). Dinero como texto.
export const esquemaImpactoPrecio = z.object({
  insumoId: z.string().uuid(),
  puAnterior: z.string(),
  puNuevo: z.string(),
  apus: z.number().int(),
  rubros: z.number().int(),
  diferencia: z.string(),
  ofertas: z.array(
    z.object({
      id: z.string().uuid(),
      nombre: z.string(),
      apus: z.number().int(),
      rubros: z.number().int(),
      antes: z.string(),
      despues: z.string(),
    }),
  ),
});
export type ImpactoPrecio = z.infer<typeof esquemaImpactoPrecio>;

export const esquemaConsultaImpacto = z.object({ puAnterior: dinero });

// Una fila del historial de precios de un insumo (más reciente primero).
export const esquemaHistorialPrecio = z.object({
  id: z.string().uuid(),
  puAnterior: z.string().nullable(),
  puNuevo: z.string(),
  usuario: z.string().nullable(),
  fecha: z.string(),
});
export type HistorialPrecio = z.infer<typeof esquemaHistorialPrecio>;
