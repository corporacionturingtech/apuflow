import { z } from 'zod';

export const esquemaRol = z.enum(['admin', 'precios', 'cotizador', 'lector']);
export type Rol = z.infer<typeof esquemaRol>;

export const esquemaLogin = z.object({
  nombreUsuario: z.string().min(1),
  clave: z.string().min(1),
});
export type Login = z.infer<typeof esquemaLogin>;

export const esquemaUsuarioSesion = z.object({
  id: z.string().uuid(),
  nombreUsuario: z.string(),
  nombre: z.string(),
  rol: esquemaRol,
  disciplinas: z.array(z.string()),
});
export type UsuarioSesion = z.infer<typeof esquemaUsuarioSesion>;
