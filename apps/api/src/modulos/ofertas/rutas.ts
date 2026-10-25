import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  esquemaCapituloCrear,
  esquemaOfertaCambio,
  esquemaOfertaCrear,
  esquemaRubroCambio,
  esquemaRubroCrear,
  type OfertaDetalle,
} from 'tipos';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';
import {
  ConflictoVersion,
  NoExiste,
  agregarCapitulo,
  agregarRubro,
  cambiarRubro,
  crear,
  editar,
  quitarCapitulo,
  quitarRubro,
} from './servicio';

const datosInvalidos = { mensaje: 'Revise los datos: hay un valor que no es válido' };
const esUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

function responderError(e: unknown, res: FastifyReply) {
  if (e instanceof NoExiste) return res.code(404).send({ mensaje: 'Esa oferta ya no existe' });
  if (e instanceof ConflictoVersion) {
    return res.code(409).send({
      mensaje: 'Otra persona cambió esta oferta. Se actualizó la pantalla; vuelva a intentarlo.',
    });
  }
  throw e;
}

const rubroDto = (r: Awaited<ReturnType<typeof repo.buscarRubro>> & object) => ({
  id: r.id,
  capituloId: r.capituloId,
  apuId: r.apuId,
  codigo: r.codigo,
  cantidad: r.cantidad,
  cpc: r.cpc,
  origen: r.origen,
  vae: r.vae,
  version: r.version,
});

const apuDto = ({ apu: a, lineas }: Awaited<ReturnType<typeof repo.apusConLineas>>[number]) => ({
  id: a.id,
  codigo: a.codigo,
  descripcion: a.descripcion,
  unidad: a.unidad,
  disciplina: a.disciplina,
  rendimiento: a.rendimiento,
  herramientaMenor: a.pctHerramientaMenor,
  lineas: lineas.map((l) => ({
    insumoId: l.insumo.id,
    tipo: l.insumo.tipo,
    pu: l.insumo.pu,
    cantidad: l.cantidad,
  })),
});

export async function rutasOfertas(app: FastifyInstance, { db }: { db: Bd }) {
  const puedeEscribir = app.exigirRol('admin', 'cotizador');

  async function detalle(id: string): Promise<OfertaDetalle | null> {
    const o = await repo.buscar(db, id);
    if (!o) return null;
    const [caps, rubs, indirs, config] = await Promise.all([
      repo.capitulos(db, id),
      repo.rubros(db, id),
      repo.indirectos(db, id),
      repo.configuracion(db),
    ]);
    const apus = await repo.apusConLineas(db, [...new Set(rubs.map((r) => r.apuId))]);
    return {
      id: o.id,
      nombre: o.nombre,
      cliente: o.cliente,
      tipo: o.tipo,
      estado: o.estado,
      version: o.version,
      iva: config.iva,
      factor: config.factorMateriales,
      costoObjetivo: o.costoObjetivo,
      indirectos: indirs.map((i) => ({ id: i.id, nombre: i.nombre, porcentaje: i.porcentaje })),
      capitulos: caps.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        disciplina: c.disciplina,
        version: c.version,
      })),
      rubros: rubs.map(rubroDto),
      apus: apus.map(apuDto),
    };
  }

  app.get('/api/ofertas', { preHandler: app.autenticar }, async () => ({
    items: (await repo.listar(db)).map(({ oferta: o, rubros }) => ({
      id: o.id,
      nombre: o.nombre,
      cliente: o.cliente,
      tipo: o.tipo,
      estado: o.estado,
      rubros,
      version: o.version,
    })),
  }));

  app.post('/api/ofertas', { preHandler: puedeEscribir }, async (req, res) => {
    const d = esquemaOfertaCrear.safeParse(req.body);
    if (!d.success) return res.code(400).send(datosInvalidos);
    const o = await crear(db, req.usuario!.id, d.data);
    return res.code(201).send(await detalle(o.id));
  });

  app.get<{ Params: { id: string } }>(
    '/api/ofertas/:id',
    { preHandler: app.autenticar },
    async (req, res) => {
      if (!esUuid(req.params.id)) return res.code(404).send(datosInvalidos);
      return (
        (await detalle(req.params.id)) ?? res.code(404).send({ mensaje: 'Esa oferta ya no existe' })
      );
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/api/ofertas/:id',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaOfertaCambio.safeParse(req.body);
      if (!d.success || !esUuid(req.params.id)) return res.code(400).send(datosInvalidos);
      try {
        await editar(db, req.usuario!.id, req.params.id, d.data);
        return await detalle(req.params.id);
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/ofertas/:id/capitulos',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaCapituloCrear.safeParse(req.body);
      if (!d.success || !esUuid(req.params.id)) return res.code(400).send(datosInvalidos);
      try {
        await agregarCapitulo(db, req.usuario!.id, req.params.id, d.data);
        return res.code(201).send(await detalle(req.params.id));
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  // Devuelve solo el rubro: reenviar la oferta de 1.500 rubros por cada tecla sería el lag que se evita.
  app.patch<{ Params: { id: string } }>(
    '/api/rubros/:id',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaRubroCambio.safeParse(req.body);
      if (!d.success || !esUuid(req.params.id)) return res.code(400).send(datosInvalidos);
      try {
        const r = await cambiarRubro(db, req.usuario!.id, req.params.id, d.data);
        return {
          id: r.id,
          cantidad: r.cantidad,
          codigo: r.codigo,
          cpc: r.cpc,
          origen: r.origen,
          vae: r.vae,
          version: r.version,
        };
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  // Responde el rubro y su APU: la web lo suma al caché sin recargar toda la oferta.
  app.post<{ Params: { id: string } }>(
    '/api/ofertas/:id/rubros',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaRubroCrear.safeParse(req.body);
      if (!d.success || !esUuid(req.params.id)) return res.code(400).send(datosInvalidos);
      try {
        const { rubro: r, apu: a } = await agregarRubro(db, req.usuario!.id, req.params.id, d.data);
        return res.code(201).send({ rubro: rubroDto(r), apu: apuDto(a) });
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  const versionDe = (q: unknown) => Number((q as { version?: string }).version);

  app.delete<{ Params: { id: string } }>(
    '/api/rubros/:id',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const version = versionDe(req.query);
      if (!Number.isInteger(version) || !esUuid(req.params.id))
        return res.code(400).send(datosInvalidos);
      try {
        await quitarRubro(db, req.usuario!.id, req.params.id, version);
        return res.code(204).send();
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/api/capitulos/:id',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const version = versionDe(req.query);
      if (!Number.isInteger(version) || !esUuid(req.params.id))
        return res.code(400).send(datosInvalidos);
      try {
        await quitarCapitulo(db, req.usuario!.id, req.params.id, version);
        return res.code(204).send();
      } catch (e) {
        return responderError(e, res);
      }
    },
  );
}
