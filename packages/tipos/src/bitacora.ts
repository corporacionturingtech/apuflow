import { z } from 'zod';

export const esquemaConsultaBitacora = z.object({
  entidad: z.string().min(1).optional(),
  usuarioId: z.string().uuid().optional(),
  desde: z.string().date().optional(),
  hasta: z.string().date().optional(),
  saltar: z.coerce.number().int().min(0).default(0),
  limite: z.coerce.number().int().min(1).max(200).default(50),
});
export type ConsultaBitacora = z.infer<typeof esquemaConsultaBitacora>;

// `antes`/`despues`: `{ valor }` en un cambio de campo; la fila completa al crear o quitar.
export const esquemaBitacoraFila = z.object({
  id: z.string().uuid(),
  fecha: z.string(),
  usuario: z.string().nullable(),
  entidad: z.string(),
  entidadId: z.string().nullable(),
  campo: z.string().nullable(),
  antes: z.unknown(),
  despues: z.unknown(),
});
export type BitacoraFila = z.infer<typeof esquemaBitacoraFila>;

export type PaginaBitacora = { items: BitacoraFila[]; hayMas: boolean };
