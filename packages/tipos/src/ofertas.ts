import { z } from 'zod';
import { esquemaTipoInsumo } from './insumos';

const decimal = z.string().regex(/^\d+(\.\d{1,6})?$/, 'Cantidad no válida');
const idUuid = z.string().uuid();

export const esquemaTipoOferta = z.enum(['publico', 'privado']);
export type TipoOferta = z.infer<typeof esquemaTipoOferta>;

export const esquemaOferta = z.object({
  id: idUuid,
  nombre: z.string(),
  cliente: z.string().nullable(),
  tipo: esquemaTipoOferta,
  estado: z.enum(['borrador', 'emitida']),
  rubros: z.number().int(),
  version: z.number().int(),
});
export type Oferta = z.infer<typeof esquemaOferta>;

export const esquemaOfertaCrear = z.object({
  nombre: z.string().trim().min(1),
  cliente: z.string().trim().min(1).nullable().optional(),
  tipo: esquemaTipoOferta.default('privado'),
});
export type OfertaCrear = z.infer<typeof esquemaOfertaCrear>;

export const esquemaOfertaCambio = z.object({
  version: z.number().int(),
  nombre: z.string().trim().min(1).optional(),
  cliente: z.string().trim().min(1).nullable().optional(),
  tipo: esquemaTipoOferta.optional(),
});
export type OfertaCambio = z.infer<typeof esquemaOfertaCambio>;

export const esquemaCapituloCrear = z.object({
  nombre: z.string().trim().min(1),
  disciplina: z.string().trim().min(1).nullable().optional(),
});
export type CapituloCrear = z.infer<typeof esquemaCapituloCrear>;

export const esquemaRubroCambio = z.object({ version: z.number().int(), cantidad: decimal });
export type RubroCambio = z.infer<typeof esquemaRubroCambio>;

const esquemaRubro = z.object({
  id: idUuid,
  capituloId: idUuid,
  apuId: idUuid,
  codigo: z.string(),
  cantidad: decimal,
  cpc: z.string().nullable(),
  origen: z.enum(['P', 'ND', 'I']).nullable(),
  vae: z.string().nullable(),
  version: z.number().int(),
});
export type Rubro = z.infer<typeof esquemaRubro>;

// Cada APU viaja una sola vez con sus líneas: la web arma la entrada del motor con esto.
const esquemaApuDeOferta = z.object({
  id: idUuid,
  codigo: z.string(),
  descripcion: z.string(),
  unidad: z.string(),
  disciplina: z.string().nullable(),
  rendimiento: decimal,
  herramientaMenor: decimal,
  lineas: z.array(
    z.object({ insumoId: idUuid, tipo: esquemaTipoInsumo, pu: decimal, cantidad: decimal }),
  ),
});
export type ApuDeOferta = z.infer<typeof esquemaApuDeOferta>;

export const esquemaOfertaDetalle = esquemaOferta.omit({ rubros: true }).extend({
  iva: decimal,
  factor: decimal,
  costoObjetivo: z.string().nullable(),
  indirectos: z.array(z.object({ id: idUuid, nombre: z.string(), porcentaje: decimal })),
  capitulos: z.array(
    z.object({ id: idUuid, nombre: z.string(), disciplina: z.string().nullable() }),
  ),
  rubros: z.array(esquemaRubro),
  apus: z.array(esquemaApuDeOferta),
});
export type OfertaDetalle = z.infer<typeof esquemaOfertaDetalle>;
