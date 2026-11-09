import type { FastifyInstance } from 'fastify';
import { esquemaCargarDemo } from 'tipos';
import type { Bd } from '../../db/conexion';
import { cargarDemo, ofertaDemoId } from './servicio';

export async function rutasDemo(app: FastifyInstance, { db }: { db: Bd }) {
  app.get('/api/demo', { preHandler: app.autenticar }, async () => ({
    ofertaId: await ofertaDemoId(db),
  }));

  app.post('/api/demo/cargar', { preHandler: app.exigirRol('admin') }, async (req, res) => {
    const d = esquemaCargarDemo.safeParse(req.body ?? {});
    if (!d.success) return res.code(400).send({ mensaje: 'Sector de demo no válido' });
    const r = await cargarDemo(db, req.usuario!.id, d.data.sector);
    return res.code(r.creada ? 201 : 200).send(r);
  });
}
