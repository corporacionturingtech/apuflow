import { z } from 'zod';

/** Sector de la empresa demo: cada uno trae su biblioteca de insumos, APUs y bloques. */
export const SECTORES_DEMO = ['electrico', 'vivienda'] as const;
export const esquemaSectorDemo = z.enum(SECTORES_DEMO);
export type SectorDemo = z.infer<typeof esquemaSectorDemo>;

export const esquemaCargarDemo = z.object({ sector: esquemaSectorDemo.default('electrico') });
