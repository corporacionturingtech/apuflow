import { crearApp } from './app';
import { crearBd } from './db/conexion';
import { urlBd } from './db/url';

export const nombre = 'api';

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { db } = crearBd(urlBd());
  const app = crearApp(db);
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
}
