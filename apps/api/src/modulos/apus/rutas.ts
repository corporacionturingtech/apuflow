import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  esquemaApuCambio,
  esquemaConsultaApus,
  esquemaLineaCambio,
  esquemaLineaCrear,
  esquemaVersionApu,
  type ApuDetalle,
} from 'tipos';
import type { Bd } from '../../db/conexion';
import { usoApu } from '../ofertas/repo';
import * as repo from './repo';
import {
  ConflictoVersion,
  InsumoRepetido,
  NoExiste,
  agregarLinea,
  cambiarLinea,
  editar,
  quitarLinea,
} from './servicio';

const datosInvalidos = { mensaje: 'Revise los datos: hay un valor que no es válido' };

function responderError(e: unknown, res: FastifyReply) {
  if (e instanceof NoExiste)
    return res.code(404).send({ mensaje: 'Ese APU o insumo ya no existe' });
  if (e instanceof InsumoRepetido)
    return res.code(409).send({ mensaje: 'Ese insumo ya está en el APU' });
  if (e instanceof ConflictoVersion) {
    return res.code(409).send({
      mensaje: 'Otra persona cambió este APU. Se actualizó la pantalla; vuelva a intentarlo.',
    });
  }
  throw e;
}

export async function rutasApus(app: FastifyInstance, { db }: { db: Bd }) {
  const puedeEscribir = app.exigirRol('admin', 'precios');

  async function detalle(id: string): Promise<ApuDetalle | null> {
    const a = await repo.buscar(db, id);
    if (!a) return null;
    const [filas, config] = await Promise.all([repo.lineas(db, id), repo.configuracion(db)]);
    return {
      id: a.id,
      codigo: a.codigo,
      descripcion: a.descripcion,
      unidad: a.unidad,
      disciplina: a.disciplina,
      rendimiento: a.rendimiento,
      version: a.version,
      factor: config.factorMateriales,
      // El % propio del APU manda; la empresa es solo el valor con el que nace.
      herramientaMenor: a.pctHerramientaMenor,
      lineasApu: filas.map(({ linea, insumo: i }) => ({
        id: linea.id,
        insumoId: i.id,
        tipo: i.tipo,
        codigo: i.codigo,
        descripcion: i.descripcion,
        unidad: i.unidad,
        pu: i.pu,
        cantidad: linea.cantidad,
        orden: linea.orden,
      })),
    };
  }

  app.get('/api/apus', { preHandler: app.autenticar }, async (req, res) => {
    const c = esquemaConsultaApus.safeParse(req.query);
    if (!c.success) return res.code(400).send(datosInvalidos);
    const filas = await repo.listar(db, c.data.q);
    return {
      items: filas.map(({ apu: a, lineas }) => ({
        id: a.id,
        codigo: a.codigo,
        descripcion: a.descripcion,
        unidad: a.unidad,
        disciplina: a.disciplina,
        rendimiento: a.rendimiento,
        lineas,
        version: a.version,
      })),
    };
  });

  app.get<{ Params: { id: string } }>(
    '/api/apus/:id',
    { preHandler: app.autenticar },
    async (req, res) => {
      if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.code(404).send(datosInvalidos);
      return (
        (await detalle(req.params.id)) ?? res.code(404).send({ mensaje: 'Ese APU ya no existe' })
      );
    },
  );

  app.get<{ Params: { id: string } }>(
    '/api/apus/:id/uso',
    { preHandler: app.autenticar },
    async (req, res) => {
      if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.code(404).send(datosInvalidos);
      return usoApu(db, req.params.id);
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/api/apus/:id',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaApuCambio.safeParse(req.body);
      if (!d.success) return res.code(400).send(datosInvalidos);
      try {
        await editar(db, req.usuario!.id, req.params.id, d.data);
        return await detalle(req.params.id);
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/apus/:id/lineas',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaLineaCrear.safeParse(req.body);
      if (!d.success) return res.code(400).send(datosInvalidos);
      try {
        await agregarLinea(db, req.usuario!.id, req.params.id, d.data);
        return res.code(201).send(await detalle(req.params.id));
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.patch<{ Params: { id: string; lineaId: string } }>(
    '/api/apus/:id/lineas/:lineaId',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaLineaCambio.safeParse(req.body);
      if (!d.success) return res.code(400).send(datosInvalidos);
      try {
        await cambiarLinea(db, req.usuario!.id, req.params.id, req.params.lineaId, d.data);
        return await detalle(req.params.id);
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.post<{ Params: { id: string; lineaId: string } }>(
    '/api/apus/:id/lineas/:lineaId/quitar',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaVersionApu.safeParse(req.body);
      if (!d.success) return res.code(400).send(datosInvalidos);
      try {
        await quitarLinea(db, req.usuario!.id, req.params.id, req.params.lineaId, d.data.version);
        return await detalle(req.params.id);
      } catch (e) {
        return responderError(e, res);
      }
    },
  );
}
