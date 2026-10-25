import type { FastifyInstance } from 'fastify';
import {
  esquemaConsultaInsumos,
  esquemaHerramientaMenorCambio,
  esquemaInsumoCambio,
  esquemaInsumoCrear,
  type Insumo,
} from 'tipos';
import type { Bd } from '../../db/conexion';
import type { insumo } from '../../db/esquema';
import * as repo from './repo';
import { ConflictoVersion, NoExiste, cambiarHerramientaMenor, crear, editar } from './servicio';

const aInsumo = (f: typeof insumo.$inferSelect): Insumo => ({
  id: f.id,
  tipo: f.tipo,
  codigo: f.codigo,
  descripcion: f.descripcion,
  unidad: f.unidad,
  pu: f.pu,
  precioAnterior: f.precioAnterior,
  seccion: f.seccion,
  orden: f.orden,
  version: f.version,
});

const datosInvalidos = { mensaje: 'Revise los datos: hay un valor que no es válido' };

export async function rutasInsumos(app: FastifyInstance, { db }: { db: Bd }) {
  const puedeEscribir = app.exigirRol('admin', 'precios');

  app.get('/api/insumos', { preHandler: app.autenticar }, async (req, res) => {
    const c = esquemaConsultaInsumos.safeParse(req.query);
    if (!c.success) return res.code(400).send(datosInvalidos);
    const [filas, config] = await Promise.all([
      repo.listar(db, c.data.tipo, c.data.q),
      repo.configuracion(db),
    ]);
    return {
      items: filas.map(aInsumo),
      factor: config.factorMateriales,
      herramientaMenor: { pct: config.pctHerramientaMenor, version: config.version },
    };
  });

  app.post('/api/insumos', { preHandler: puedeEscribir }, async (req, res) => {
    const d = esquemaInsumoCrear.safeParse(req.body);
    if (!d.success) return res.code(400).send(datosInvalidos);
    return res.code(201).send(aInsumo(await crear(db, req.usuario!.id, d.data)));
  });

  app.patch<{ Params: { id: string } }>(
    '/api/insumos/:id',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaInsumoCambio.safeParse(req.body);
      if (!d.success) return res.code(400).send(datosInvalidos);
      try {
        return aInsumo(await editar(db, req.usuario!.id, req.params.id, d.data));
      } catch (e) {
        if (e instanceof NoExiste)
          return res.code(404).send({ mensaje: 'Ese insumo ya no existe' });
        if (e instanceof ConflictoVersion) {
          return res.code(409).send({
            mensaje: 'Otra persona cambió este insumo. Se actualizó la lista; vuelva a intentarlo.',
          });
        }
        throw e;
      }
    },
  );

  app.patch('/api/herramienta-menor', { preHandler: puedeEscribir }, async (req, res) => {
    const d = esquemaHerramientaMenorCambio.safeParse(req.body);
    if (!d.success) return res.code(400).send(datosInvalidos);
    try {
      const fila = await cambiarHerramientaMenor(db, req.usuario!.id, d.data);
      return { pct: fila.pctHerramientaMenor, version: fila.version };
    } catch (e) {
      if (e instanceof ConflictoVersion) {
        return res.code(409).send({
          mensaje: 'Otra persona cambió este porcentaje. Se actualizó; vuelva a intentarlo.',
        });
      }
      throw e;
    }
  });
}
