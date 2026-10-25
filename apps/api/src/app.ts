import Fastify from 'fastify';
import type { Bd } from './db/conexion';
import cookie from '@fastify/cookie';
import { instalarAuth } from './modulos/auth/rutas';
import { rutasSalud } from './modulos/salud/rutas';

export function crearApp(db: Bd) {
  const app = Fastify({ logger: false });
  app.register(cookie);
  instalarAuth(app, db);
  app.register(rutasSalud, { db });
  return app;
}
