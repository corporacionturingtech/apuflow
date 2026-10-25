import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { crearBd } from './conexion';
import { urlBd } from './url';

export async function migrarBd(url: string) {
  const { db, pool } = crearBd(url);
  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('./migraciones', import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await migrarBd(urlBd());
  console.log('Migraciones aplicadas');
}
