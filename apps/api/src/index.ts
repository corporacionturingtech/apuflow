import { crearApp } from './app';
import { crearBd } from './db/conexion';
import { urlBd } from './db/url';
import { migrarBd } from './db/migrar';

export const nombre = 'api';

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  if (process.env.MIGRAR_AL_ARRANCAR === '1') await migrarBd(urlBd());
  const { db } = crearBd(urlBd());
  const app = crearApp(db, { webDist: process.env.WEB_DIST });
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
}
