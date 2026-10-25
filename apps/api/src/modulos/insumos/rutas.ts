import type { FastifyInstance } from 'fastify';
import {
  esquemaConsultaImpacto,
  esquemaConsultaInsumos,
  esquemaHerramientaMenorCambio,
  esquemaInsumoCambio,
  esquemaInsumoCrear,
  esquemaInsumoVersion,
  type Insumo,
} from 'tipos';
import type { Bd } from '../../db/conexion';
import type { insumo } from '../../db/esquema';
import { impactoDePrecio } from './impacto';
import * as repo from './repo';
import {
  CodigoRepetido,
  ConflictoVersion,
  NoExiste,
  cambiarHerramientaMenor,
  crear,
  editar,
  eliminar,
  restaurar,
} from './servicio';

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
  eliminadoEn: f.eliminadoEn?.toISOString() ?? null,
  version: f.version,
});

const codigoRepetido = 'Ya existe un insumo de esta lista con ese código';
const datosInvalidos = { mensaje: 'Revise los datos: hay un valor que no es válido' };

export async function rutasInsumos(app: FastifyInstance, { db }: { db: Bd }) {
  const puedeEscribir = app.exigirRol('admin', 'precios');

  app.get('/api/insumos', { preHandler: app.autenticar }, async (req, res) => {
    const c = esquemaConsultaInsumos.safeParse(req.query);
    if (!c.success) return res.code(400).send(datosInvalidos);
    const [filas, config] = await Promise.all([
      repo.listar(db, c.data.tipo, c.data.q, c.data.papelera),
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
    try {
      return res.code(201).send(aInsumo(await crear(db, req.usuario!.id, d.data)));
    } catch (e) {
      if (e instanceof CodigoRepetido) return res.code(409).send({ mensaje: codigoRepetido });
      throw e;
    }
  });

  app.get<{ Params: { id: string } }>(
    '/api/insumos/:id/impacto',
    { preHandler: app.autenticar },
    async (req, res) => {
      const d = esquemaConsultaImpacto.safeParse(req.query);
      if (!d.success || !/^[0-9a-f-]{36}$/i.test(req.params.id))
        return res.code(400).send(datosInvalidos);
      try {
        return await impactoDePrecio(db, req.params.id, d.data.puAnterior);
      } catch (e) {
        if (e instanceof NoExiste)
          return res.code(404).send({ mensaje: 'Ese insumo ya no existe' });
        throw e;
      }
    },
  );

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
        if (e instanceof CodigoRepetido) return res.code(409).send({ mensaje: codigoRepetido });
        if (e instanceof ConflictoVersion) {
          return res.code(409).send({
            mensaje: 'Otra persona cambió este insumo. Se actualizó la lista; vuelva a intentarlo.',
          });
        }
        throw e;
      }
    },
  );

  for (const [accion, hacer] of [
    ['eliminar', eliminar],
    ['restaurar', restaurar],
  ] as const) {
    app.post<{ Params: { id: string } }>(
      `/api/insumos/:id/${accion}`,
      { preHandler: puedeEscribir },
      async (req, res) => {
        const d = esquemaInsumoVersion.safeParse(req.body);
        if (!d.success) return res.code(400).send(datosInvalidos);
        try {
          return aInsumo(await hacer(db, req.usuario!.id, req.params.id, d.data.version));
        } catch (e) {
          if (e instanceof NoExiste)
            return res.code(404).send({ mensaje: 'Ese insumo ya no existe' });
          if (e instanceof CodigoRepetido) return res.code(409).send({ mensaje: codigoRepetido });
          if (e instanceof ConflictoVersion) {
            return res.code(409).send({
              mensaje:
                'Otra persona cambió este insumo. Se actualizó la lista; vuelva a intentarlo.',
            });
          }
          throw e;
        }
      },
    );
  }

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
