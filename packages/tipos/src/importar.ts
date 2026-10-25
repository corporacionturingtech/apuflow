import { z } from 'zod';
import { esquemaImpactoPrecio } from './insumos';

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
  cuadra: z
    .object({
      hayCache: z.boolean(),
      cuadra: z.boolean(),
      totalExcel: z.number().nullable(),
      totalApuflow: z.number(),
      rubrosDistintos: z.array(
        z.object({
          fila: z.number().int(),
          descripcion: z.string(),
          excel: z.number(),
          apuflow: z.number(),
        }),
      ),
    })
    .optional(),
  puedeConfirmar: z.boolean(),
});
export type RevisionImportacion = z.infer<typeof esquemaRevisionImportacion>;

export const esquemaResultadoImportacion = z.object({ ofertaId: z.string().uuid() });
export type ResultadoImportacion = z.infer<typeof esquemaResultadoImportacion>;

// Modo «Solo precios»: qué precios cambiarían y con qué efecto en las ofertas.
export const esquemaCambioPrecioImportado = z.object({
  insumoId: z.string().uuid(),
  tipo: z.enum(['MA', 'EQ', 'MO', 'TR']),
  codigo: z.string(),
  descripcion: z.string(),
  puActual: z.string(),
  puNuevo: z.string(),
});
export type CambioPrecioImportado = z.infer<typeof esquemaCambioPrecioImportado>;

export const esquemaImpactoImportacion = esquemaImpactoPrecio.pick({
  apus: true,
  rubros: true,
  diferencia: true,
  ofertas: true,
});

export const esquemaRevisionPrecios = z.object({
  archivo: z.string(),
  hojas: z.number().int(),
  cambios: z.array(esquemaCambioPrecioImportado),
  sinCambio: z.number().int(),
  noEncontrados: z.array(z.string()),
  problemas: z.array(esquemaProblemaImportacion),
  impacto: esquemaImpactoImportacion,
  puedeConfirmar: z.boolean(),
});
export type RevisionPrecios = z.infer<typeof esquemaRevisionPrecios>;

export const esquemaResultadoPrecios = z.object({ actualizados: z.number().int() });
export type ResultadoPrecios = z.infer<typeof esquemaResultadoPrecios>;
