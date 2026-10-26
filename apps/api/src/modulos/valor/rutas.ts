import type { FastifyInstance } from 'fastify';
import { esquemaConsultaValor, esquemaParametrosValorCambio } from 'tipos';
import type { Bd } from '../../db/conexion';
import { ConflictoVersion } from '../insumos/servicio';
import { cambiarParametros, panelDeValor } from './servicio';

export async function rutasValor(app: FastifyInstance, { db }: { db: Bd }) {
  const soloAdmin = app.exigirRol('admin');

  app.get('/api/valor', { preHandler: soloAdmin }, async (req, res) => {
    const c = esquemaConsultaValor.safeParse(req.query);
    if (!c.success) return res.code(400).send({ mensaje: 'Escriba el mes como AAAA-MM' });
    return panelDeValor(db, c.data.mes);
  });

  app.put('/api/valor/parametros', { preHandler: soloAdmin }, async (req, res) => {
    const d = esquemaParametrosValorCambio.safeParse(req.body);
    if (!d.success) return res.code(400).send({ mensaje: 'Revise los minutos (0 a 240)' });
    try {
      await cambiarParametros(db, req.usuario!.id, d.data);
      return panelDeValor(db);
    } catch (e) {
      if (e instanceof ConflictoVersion)
        return res.code(409).send({ mensaje: 'Otra persona cambió la configuración; recargue' });
      throw e;
    }
  });
}
