import { z } from 'zod';
import { esquemaTipoOferta } from './ofertas';

const MAX_LOGO = 200_000;

// Lo que cambia entre empresas y países se configura aquí, no se bifurca el código.
export const esquemaEmpresaCambio = z.object({
  version: z.number().int().positive(),
  nombre: z.string().trim().min(1, 'Escriba el nombre de la empresa').max(120),
  iva: z
    .string()
    .regex(/^\d{1,3}(\.\d{1,4})?$/, 'Porcentaje no válido')
    .refine((v) => Number(v) <= 100, 'El IVA debe estar entre 0 y 100'),
  moneda: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Use el código de 3 letras (USD, PEN…)'),
  formatoNumero: z.enum(['es', 'en']),
  acento: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color no válido'),
  logo: z
    .string()
    .regex(/^data:image\/(png|jpeg|svg\+xml);base64,[A-Za-z0-9+/=]+$/, 'Suba un PNG, JPG o SVG')
    .max(MAX_LOGO, 'El logo pesa más de 200 KB')
    .nullable(),
  tipoOfertaDefecto: esquemaTipoOferta,
});
export type EmpresaCambio = z.infer<typeof esquemaEmpresaCambio>;

export type Empresa = EmpresaCambio;
