import Fastify from 'fastify';
import type { Bd } from './db/conexion';
import cookie from '@fastify/cookie';
import { instalarAuth } from './modulos/auth/rutas';
import { rutasInsumos } from './modulos/insumos/rutas';
import { rutasApus } from './modulos/apus/rutas';
import { rutasOfertas } from './modulos/ofertas/rutas';
import { rutasBloques } from './modulos/bloques/rutas';
import { rutasImportacion } from './modulos/importacion/rutas';
import { rutasVersiones } from './modulos/ofertas/versiones';
import { rutasUsuarios } from './modulos/usuarios/rutas';
import { rutasBitacora } from './modulos/bitacora/rutas';
import { rutasSalud } from './modulos/salud/rutas';

export function crearApp(db: Bd) {
  const app = Fastify({ logger: false });
  app.register(cookie);
  instalarAuth(app, db);
  app.register(rutasSalud, { db });
  app.register(rutasUsuarios, { db });
  app.register(rutasInsumos, { db });
  app.register(rutasApus, { db });
  app.register(rutasOfertas, { db });
  app.register(rutasVersiones, { db });
  app.register(rutasBloques, { db });
  app.register(rutasImportacion, { db });
  app.register(rutasBitacora, { db });
  return app;
}
