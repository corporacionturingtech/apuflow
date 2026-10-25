import Fastify from 'fastify';
import type { Bd } from './db/conexion';
import { rutasSalud } from './modulos/salud/rutas';

export function crearApp(db: Bd) {
  const app = Fastify({ logger: false });
  app.register(rutasSalud, { db });
  return app;
}
