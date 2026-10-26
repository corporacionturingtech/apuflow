import type { FastifyInstance } from 'fastify';
import { esquemaConsultaBitacora } from 'tipos';
import type { Bd } from '../../db/conexion';
import { pagina } from './servicio';

export async function rutasBitacora(app: FastifyInstance, { db }: { db: Bd }) {
  app.get('/api/bitacora', { preHandler: app.autenticar }, async (req, res) => {
    const c = esquemaConsultaBitacora.safeParse(req.query);
    if (!c.success) return res.code(400).send({ mensaje: 'Revise los filtros del historial' });
    return pagina(db, c.data);
  });
}
