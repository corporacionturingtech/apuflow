import { z } from 'zod';

export const esquemaConsultaValor = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes en formato AAAA-MM')
    .optional(),
});
export type ConsultaValor = z.infer<typeof esquemaConsultaValor>;

// Minutos que un cotizador tardaría a mano; el cliente los ajusta a su realidad.
export const esquemaParametrosValor = z.object({
  minutosPorRubro: z.number().min(0).max(240),
  minutosPorRecalculo: z.number().min(0).max(240),
});
export type ParametrosValor = z.infer<typeof esquemaParametrosValor>;

export const esquemaParametrosValorCambio = esquemaParametrosValor.extend({
  version: z.number().int().positive(),
});
export type ParametrosValorCambio = z.infer<typeof esquemaParametrosValorCambio>;

export interface PanelValor {
  mes: string;
  empresa: string;
  ofertasCreadas: number;
  ofertasEmitidas: number;
  montoCotizado: string;
  rubrosRecalculados: number;
  bloquesAplicados: number;
  rubrosPorBloque: number;
  ofertasEnObjetivo: number;
  ofertasConObjetivo: number;
  horasAhorradas: number;
  parametros: ParametrosValor;
  version: number;
}
