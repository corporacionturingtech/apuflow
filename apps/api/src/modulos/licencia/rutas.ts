import type { FastifyInstance } from 'fastify';
import type { Bd } from '../../db/conexion';
import {
  FirmaInvalida,
  OtraInstalacion,
  cargarLicencia,
  estadoLicencia,
} from '../../licencia/servicio';

export type OpcionesLicencia = { clavePublica?: string; alCargar?: () => void };

export async function rutasLicencia(
  app: FastifyInstance,
  { db, clavePublica, alCargar }: { db: Bd } & OpcionesLicencia,
) {
  app.get('/api/licencia/estado', { preHandler: app.autenticar }, () => estadoLicencia(db));

  app.put('/api/licencia', { preHandler: app.exigirRol('admin') }, async (req, res) => {
    try {
      const estado = await cargarLicencia(db, req.usuario!.id, req.body, clavePublica);
      alCargar?.();
      return estado;
    } catch (e) {
      if (e instanceof FirmaInvalida) {
        return res
          .code(400)
          .send({ mensaje: 'El archivo no es una licencia válida de Turingtech' });
      }
      if (e instanceof OtraInstalacion) {
        return res
          .code(409)
          .send({ mensaje: 'Esta licencia fue emitida para otra instalación de APUflow' });
      }
      throw e;
    }
  });
}
