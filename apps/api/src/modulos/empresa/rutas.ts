import type { FastifyInstance } from 'fastify';
import { esquemaEmpresaCambio } from 'tipos';
import type { Bd } from '../../db/conexion';
import { ConflictoVersion } from '../insumos/servicio';
import { cambiarEmpresa, obtenerEmpresa } from './servicio';

export async function rutasEmpresa(app: FastifyInstance, { db }: { db: Bd }) {
  app.get('/api/empresa', { preHandler: app.autenticar }, async () => obtenerEmpresa(db));

  app.put('/api/empresa', { preHandler: app.exigirRol('admin') }, async (req, res) => {
    const d = esquemaEmpresaCambio.safeParse(req.body);
    if (!d.success)
      return res.code(400).send({ mensaje: d.error.issues[0]?.message ?? 'Revise los datos' });
    try {
      await cambiarEmpresa(db, req.usuario!.id, d.data);
      return obtenerEmpresa(db);
    } catch (e) {
      if (e instanceof ConflictoVersion)
        return res.code(409).send({ mensaje: 'Otra persona cambió la configuración; recargue' });
      throw e;
    }
  });
}
