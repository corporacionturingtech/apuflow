import { and, eq, gt } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import { sesion, usuario } from '../../db/esquema';

export const buscarUsuario = async (db: Bd, nombreUsuario: string) =>
  (await db.select().from(usuario).where(eq(usuario.nombreUsuario, nombreUsuario)))[0];

export const insertarUsuario = (db: Bd, datos: typeof usuario.$inferInsert) =>
  db.insert(usuario).values(datos);

export const insertarSesion = (db: Bd, datos: typeof sesion.$inferInsert) =>
  db.insert(sesion).values(datos);

export const borrarSesion = (db: Bd, id: string) => db.delete(sesion).where(eq(sesion.id, id));

// Une con usuario para que desactivar a alguien invalide sus sesiones al instante.
export const buscarUsuarioDeSesion = async (db: Bd, id: string) =>
  (
    await db
      .select({ u: usuario })
      .from(sesion)
      .innerJoin(usuario, eq(usuario.id, sesion.usuarioId))
      .where(and(eq(sesion.id, id), gt(sesion.expira, new Date()), eq(usuario.activo, true)))
  )[0]?.u;
