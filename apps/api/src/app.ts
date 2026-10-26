import Fastify from 'fastify';
import type { Bd } from './db/conexion';
import cookie from '@fastify/cookie';
import estatico from '@fastify/static';
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
import { rutasTiempoReal } from './modulos/tiempo-real/rutas';
import { rutasDemo } from './modulos/demo/rutas';
import { rutasValor } from './modulos/valor/rutas';
import { rutasLicencia, type OpcionesLicencia } from './modulos/licencia/rutas';
import { rutasEmpresa } from './modulos/empresa/rutas';
import { estadoLicencia } from './licencia/servicio';

const TTL_ESTADO_MS = 60_000;
const MENSAJE_SOLO_LECTURA =
  'La licencia está vencida: puede ver y exportar, pero no editar. Renueve la licencia.';

export function crearApp(
  db: Bd,
  opciones: Pick<OpcionesLicencia, 'clavePublica'> & { webDist?: string } = {},
) {
  const { webDist, ...opcionesLicencia } = opciones;
  const app = Fastify({ logger: false });
  app.register(cookie);
  instalarAuth(app, db);

  // Licencia vencida (pasada la gracia): solo lectura. Exportar es GET, por eso sigue funcionando.
  let enCache: { solo: boolean; hasta: number } | null = null;
  app.addHook('onRequest', async (req, res) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return;
    if (req.url.startsWith('/api/auth/') || req.url.startsWith('/api/licencia')) return;
    if (!enCache || enCache.hasta < Date.now()) {
      enCache = {
        solo: (await estadoLicencia(db)).estado === 'solo_lectura',
        hasta: Date.now() + TTL_ESTADO_MS,
      };
    }
    if (enCache.solo) return res.code(403).send({ mensaje: MENSAJE_SOLO_LECTURA });
  });
  app.register(rutasSalud, { db });
  app.register(rutasLicencia, { db, ...opcionesLicencia, alCargar: () => (enCache = null) });
  app.register(rutasUsuarios, { db });
  app.register(rutasInsumos, { db });
  app.register(rutasApus, { db });
  app.register(rutasOfertas, { db });
  app.register(rutasVersiones, { db });
  app.register(rutasBloques, { db });
  app.register(rutasImportacion, { db });
  app.register(rutasBitacora, { db });
  app.register(rutasTiempoReal, { db });
  app.register(rutasDemo, { db });
  app.register(rutasValor, { db });
  app.register(rutasEmpresa, { db });
  if (webDist) {
    // Instalación en servidor: la API también sirve el build de web (con vuelta a index.html para el router).
    app.register(estatico, { root: webDist });
    app.setNotFoundHandler((req, res) => {
      if (req.url.startsWith('/api')) return res.code(404).send({ mensaje: 'No encontrado' });
      return res.sendFile('index.html');
    });
  }
  return app;
}
