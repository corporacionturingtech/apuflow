import { afterAll, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { crearBd } from './conexion';
import { urlBdPruebas } from './url';
import { usuario } from './esquema';
import { sembrarAdmin } from './seed-admin';

const { db, pool } = crearBd(urlBdPruebas());
afterAll(() => pool.end());

test('sembrarAdmin crea el admin una sola vez', async () => {
  await db.delete(usuario).where(eq(usuario.nombreUsuario, 'admin-seed'));
  expect(await sembrarAdmin(db, { usuario: 'admin-seed', clave: 'una-clave-larga-1' })).toBe(true);
  expect(await sembrarAdmin(db, { usuario: 'admin-seed', clave: 'otra-clave-larga-2' })).toBe(
    false,
  );
  const filas = await db.select().from(usuario).where(eq(usuario.nombreUsuario, 'admin-seed'));
  expect(filas).toHaveLength(1);
  expect(filas[0]).toMatchObject({ rol: 'admin', activo: true });
});
