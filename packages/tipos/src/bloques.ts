import { z } from 'zod';
import type { ApuDeOferta } from './ofertas';

const idUuid = z.string().uuid();
const positivo = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,6})?$/, 'Número no válido')
  .refine((v) => Number(v) > 0, 'Debe ser mayor que cero');

export const esquemaBloqueCrear = z.object({
  capituloId: idUuid,
  nombre: z.string().trim().min(1),
  /** Para cuánto están las cantidades (100 m², 10 ml…); opcional. */
  tamano: positivo.nullable().optional(),
  unidadTamano: z.string().trim().min(1).max(20).nullable().optional(),
});
export type BloqueCrear = z.infer<typeof esquemaBloqueCrear>;

// `tamano`: el tamaño real (solo si el bloque tiene el suyo); `veces`: multiplicador directo.
export const esquemaBloqueInsertar = z.object({
  bloqueId: idUuid,
  tamano: positivo.optional(),
  veces: positivo.optional(),
});
export type BloqueInsertar = z.infer<typeof esquemaBloqueInsertar>;

export interface BloqueLista {
  id: string;
  nombre: string;
  disciplina: string | null;
  tamano: string | null;
  unidadTamano: string | null;
  version: number;
  lineas: { apuId: string; cantidad: string }[];
}

export interface BloquesRespuesta {
  iva: string;
  factor: string;
  items: BloqueLista[];
  apus: ApuDeOferta[];
}
