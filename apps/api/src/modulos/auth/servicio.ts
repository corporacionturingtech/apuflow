import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { Rol, UsuarioSesion } from 'tipos';
import type { Bd } from '../../db/conexion';
import type { usuario } from '../../db/esquema';
import * as repo from './repo';

export const DURACION_SESION_MS = 8 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const aUsuarioSesion = (u: typeof usuario.$inferSelect): UsuarioSesion => ({
  id: u.id,
  nombreUsuario: u.nombreUsuario,
  nombre: u.nombre,
  rol: u.rol,
  disciplinas: u.disciplinas,
});

export async function crearUsuario(
  db: Bd,
  d: { nombreUsuario: string; nombre: string; clave: string; rol: Rol; activo?: boolean },
) {
  const { clave, ...resto } = d;
  await repo.insertarUsuario(db, { ...resto, claveHash: await argon2.hash(clave) });
}

// Hash de relleno: verificar aunque el usuario no exista evita distinguirlo por el tiempo de respuesta.
const hashRelleno = argon2.hash('relleno-sin-uso');

export async function iniciarSesion(db: Bd, nombreUsuario: string, clave: string) {
  const u = await repo.buscarUsuario(db, nombreUsuario);
  const valido = await argon2.verify(u?.claveHash ?? (await hashRelleno), clave);
  if (!u || !u.activo || !valido) return null;
  const token = randomBytes(32).toString('base64url');
  await repo.insertarSesion(db, {
    id: hashToken(token),
    usuarioId: u.id,
    expira: new Date(Date.now() + DURACION_SESION_MS),
  });
  return { token, usuario: aUsuarioSesion(u) };
}

export async function usuarioDeToken(db: Bd, token: string) {
  const u = await repo.buscarUsuarioDeSesion(db, hashToken(token));
  return u ? aUsuarioSesion(u) : null;
}

export const cerrarSesion = (db: Bd, token: string) => repo.borrarSesion(db, hashToken(token));
