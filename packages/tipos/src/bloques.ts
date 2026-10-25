import { z } from 'zod';
import type { ApuDeOferta } from './ofertas';

const idUuid = z.string().uuid();

export const esquemaBloqueCrear = z.object({
  capituloId: idUuid,
  nombre: z.string().trim().min(1),
});
export type BloqueCrear = z.infer<typeof esquemaBloqueCrear>;

export const esquemaBloqueInsertar = z.object({ bloqueId: idUuid });
export type BloqueInsertar = z.infer<typeof esquemaBloqueInsertar>;

export interface BloqueLista {
  id: string;
  nombre: string;
  disciplina: string | null;
  version: number;
  lineas: { apuId: string; cantidad: string }[];
}

export interface BloquesRespuesta {
  iva: string;
  factor: string;
  items: BloqueLista[];
  apus: ApuDeOferta[];
}
