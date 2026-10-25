import Fastify from 'fastify';
import type { Bd } from './db/conexion';
import cookie from '@fastify/cookie';
import { instalarAuth } from './modulos/auth/rutas';
import { rutasInsumos } from './modulos/insumos/rutas';
import { rutasApus } from './modulos/apus/rutas';
import { rutasOfertas } from './modulos/ofertas/rutas';
import { rutasSalud } from './modulos/salud/rutas';

export function crearApp(db: Bd) {
  const app = Fastify({ logger: false });
  app.register(cookie);
  instalarAuth(app, db);
  app.register(rutasSalud, { db });
  app.register(rutasInsumos, { db });
  app.register(rutasApus, { db });
  app.register(rutasOfertas, { db });
  return app;
}
