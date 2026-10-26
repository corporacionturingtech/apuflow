import { z } from 'zod';
import { esquemaRol } from './auth';

const disciplinas = z.array(z.string().trim().min(1)).max(20);

export const esquemaUsuarioCrear = z.object({
  nombreUsuario: z
    .string()
    .trim()
    .min(3)
    .regex(/^[a-z0-9._-]+$/i, 'Solo letras, números, punto, guion y guion bajo'),
  nombre: z.string().trim().min(1),
  clave: z.string().min(8, 'La clave debe tener al menos 8 caracteres'),
  rol: esquemaRol,
  disciplinas: disciplinas.default([]),
});
export type UsuarioCrear = z.infer<typeof esquemaUsuarioCrear>;

export const esquemaUsuarioCambio = z.object({
  version: z.number().int().positive(),
  nombre: z.string().trim().min(1).optional(),
  clave: z.string().min(8).optional(),
  rol: esquemaRol.optional(),
  disciplinas: disciplinas.optional(),
  activo: z.boolean().optional(),
});
export type UsuarioCambio = z.infer<typeof esquemaUsuarioCambio>;

export const esquemaUsuarioFila = z.object({
  id: z.string().uuid(),
  nombreUsuario: z.string(),
  nombre: z.string(),
  rol: esquemaRol,
  disciplinas: z.array(z.string()),
  activo: z.boolean(),
  version: z.number().int(),
});
export type UsuarioFila = z.infer<typeof esquemaUsuarioFila>;

export const esquemaDisciplina = z.object({
  nombre: z.string().trim().min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Color en formato #rrggbb'),
});
export type Disciplina = z.infer<typeof esquemaDisciplina>;

export const esquemaDisciplinasCambio = z.object({
  version: z.number().int().positive(),
  disciplinas: z.array(esquemaDisciplina).max(20),
  restringir: z.boolean(),
});
export type DisciplinasCambio = z.infer<typeof esquemaDisciplinasCambio>;

export type DisciplinasEmpresa = {
  disciplinas: Disciplina[];
  restringir: boolean;
  version: number;
};
