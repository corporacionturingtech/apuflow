import { eq } from 'drizzle-orm';
import { crearBd, type Bd } from './conexion';
import { usuario } from './esquema';
import { urlBd } from './url';
import { crearUsuario } from '../modulos/auth/servicio';

// Devuelve false si el usuario ya existe: no pisa la clave de un admin ya configurado.
export async function sembrarAdmin(db: Bd, d: { usuario: string; clave: string }) {
  const existe = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(eq(usuario.nombreUsuario, d.usuario));
  if (existe.length) return false;
  await crearUsuario(db, {
    nombreUsuario: d.usuario,
    nombre: 'Administrador',
    clave: d.clave,
    rol: 'admin',
  });
  return true;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { ADMIN_USUARIO, ADMIN_CLAVE } = process.env;
  if (!ADMIN_USUARIO || !ADMIN_CLAVE) {
    console.error('Defina ADMIN_USUARIO y ADMIN_CLAVE para crear el administrador.');
    process.exit(1);
  }
  const { db, pool } = crearBd(urlBd());
  const creado = await sembrarAdmin(db, { usuario: ADMIN_USUARIO, clave: ADMIN_CLAVE });
  console.log(creado ? 'Administrador creado' : 'El administrador ya existe');
  await pool.end();
}
