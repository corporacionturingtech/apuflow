import type { FastifyInstance, FastifyReply } from 'fastify';
import { esquemaBloqueCrear, esquemaBloqueInsertar, type BloqueLista } from 'tipos';
import type { Bd } from '../../db/conexion';
import { apuDto, detalleOferta } from '../ofertas/rutas';
import * as repo from './repo';
import {
  SinTamano,
  ConflictoVersion,
  NoExiste,
  borrar,
  crearDesdeCapitulo,
  insertarEnOferta,
  restaurar,
} from './servicio';

const datosInvalidos = { mensaje: 'Revise los datos: hay un valor que no es válido' };
const esUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

function responderError(e: unknown, res: FastifyReply) {
  if (e instanceof NoExiste)
    return res.code(404).send({ mensaje: 'Ese bloque u oferta ya no existe' });
  if (e instanceof SinTamano)
    return res.code(400).send({ mensaje: 'Ese bloque no tiene tamaño: use «veces».' });
  if (e instanceof ConflictoVersion) {
    return res
      .code(409)
      .send({ mensaje: 'Otra persona cambió este bloque. Actualice la pantalla.' });
  }
  throw e;
}

const bloqueDto = (
  b: Awaited<ReturnType<typeof repo.listar>>[number],
  lineas: Awaited<ReturnType<typeof repo.lineas>>,
): BloqueLista => ({
  id: b.id,
  nombre: b.nombre,
  disciplina: b.disciplina,
  tamano: b.tamano,
  unidadTamano: b.unidadTamano,
  version: b.version,
  eliminadoEn: b.eliminadoEn?.toISOString() ?? null,
  lineas: lineas
    .filter((l) => l.bloqueId === b.id)
    .map((l) => ({ apuId: l.apuId, cantidad: l.cantidad })),
});

export async function rutasBloques(app: FastifyInstance, { db }: { db: Bd }) {
  const puedeEscribir = app.exigirRol('admin', 'cotizador');

  // Trae los APUs de todos los bloques una sola vez: la web calcula cada tarjeta con el motor.
  app.get('/api/bloques', { preHandler: app.autenticar }, async (req) => {
    const papelera = (req.query as { papelera?: string }).papelera === '1';
    const [bs, ls, config] = await Promise.all([
      repo.listar(db, papelera),
      repo.lineas(db),
      repo.configuracion(db),
    ]);
    const apus = await repo.apusConLineas(db, [...new Set(ls.map((l) => l.apuId))]);
    return {
      iva: config.iva,
      factor: config.factorMateriales,
      items: bs.map((b) => bloqueDto(b, ls)),
      apus: apus.map(apuDto),
    };
  });

  app.post('/api/bloques', { preHandler: puedeEscribir }, async (req, res) => {
    const d = esquemaBloqueCrear.safeParse(req.body);
    if (!d.success) return res.code(400).send(datosInvalidos);
    try {
      const { bloque, lineas } = await crearDesdeCapitulo(db, req.usuario!.id, d.data);
      return res.code(201).send(bloqueDto(bloque, lineas));
    } catch (e) {
      return responderError(e, res);
    }
  });

  app.post<{ Params: { id: string } }>(
    '/api/ofertas/:id/bloques',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaBloqueInsertar.safeParse(req.body);
      if (!d.success || !esUuid(req.params.id)) return res.code(400).send(datosInvalidos);
      try {
        const cap = await insertarEnOferta(db, req.usuario!.id, req.params.id, d.data);
        return res
          .code(201)
          .send({ capituloId: cap.id, oferta: await detalleOferta(db, req.params.id) });
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/bloques/:id',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const version = Number((req.query as { version?: string }).version);
      if (!Number.isInteger(version) || !esUuid(req.params.id))
        return res.code(400).send(datosInvalidos);
      try {
        const b = await borrar(db, req.usuario!.id, req.params.id, version);
        return bloqueDto(b, []);
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/bloques/:id/restaurar',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const version = Number((req.body as { version?: unknown } | undefined)?.version);
      if (!Number.isInteger(version) || !esUuid(req.params.id))
        return res.code(400).send(datosInvalidos);
      try {
        const b = await restaurar(db, req.usuario!.id, req.params.id, version);
        return bloqueDto(b, await repo.lineasDe(db, b.id));
      } catch (e) {
        return responderError(e, res);
      }
    },
  );
}
