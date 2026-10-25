import { z } from 'zod';

export const esquemaProblemaImportacion = z.object({
  hoja: z.string(),
  fila: z.number().int(),
  mensaje: z.string(),
  bloqueante: z.boolean(),
});
export type ProblemaImportacion = z.infer<typeof esquemaProblemaImportacion>;

export const esquemaRevisionImportacion = z.object({
  archivo: z.string(),
  proyecto: z.string(),
  resumen: z.object({
    listas: z.number().int(),
    insumos: z.number().int(),
    insumosNuevos: z.number().int(),
    apus: z.number().int(),
    capitulos: z.number().int(),
    rubros: z.number().int(),
  }),
  problemas: z.array(esquemaProblemaImportacion),
  puedeConfirmar: z.boolean(),
});
export type RevisionImportacion = z.infer<typeof esquemaRevisionImportacion>;

export const esquemaResultadoImportacion = z.object({ ofertaId: z.string().uuid() });
export type ResultadoImportacion = z.infer<typeof esquemaResultadoImportacion>;
