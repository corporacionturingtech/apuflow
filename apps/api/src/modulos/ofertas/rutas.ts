import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  esquemaCapituloCrear,
  esquemaIndirectoCambio,
  esquemaOfertaCambio,
  esquemaOfertaCrear,
  esquemaRubroCambio,
  esquemaRubroCrear,
  esquemaVersionRubro,
  type OfertaDetalle,
} from 'tipos';
import { exportarLibro } from 'excel';
import type { Bd } from '../../db/conexion';
import { armarLibro } from './exportar';
import * as repo from './repo';
import { totalesOfertas } from './totales';
import {
  SinPermisoDisciplina,
  exigirDisciplinaCapitulo,
  exigirDisciplinaNueva,
  exigirDisciplinaRubro,
} from './permisos';
import type { Tx } from './repo';
import {
  ConflictoVersion,
  NoExiste,
  agregarCapitulo,
  agregarRubro,
  cambiarIndirecto,
  cambiarRubro,
  copiarApuDeRubro,
  crear,
  editar,
  quitarCapitulo,
  quitarRubro,
} from './servicio';

const datosInvalidos = { mensaje: 'Revise los datos: hay un valor que no es válido' };
const esUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

function responderError(e: unknown, res: FastifyReply) {
  if (e instanceof SinPermisoDisciplina) {
    return res
      .code(403)
      .send({ mensaje: `No tiene permiso para editar rubros de ${e.disciplina}` });
  }
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

export const apuDto = ({
  apu: a,
  lineas,
}: Awaited<ReturnType<typeof repo.apusConLineas>>[number]) => ({
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

export async function detalleOferta(db: Bd | Tx, id: string): Promise<OfertaDetalle | null> {
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
    iva: o.iva ?? config.iva,
    factor: config.factorMateriales,
    costoObjetivo: o.costoObjetivo,
    indirectos: indirs.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      porcentaje: i.porcentaje,
      esUtilidad: i.esUtilidad,
      version: i.version,
    })),
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

export async function rutasOfertas(app: FastifyInstance, { db }: { db: Bd }) {
  const puedeEscribir = app.exigirRol('admin', 'cotizador');

  const detalle = (id: string) => detalleOferta(db, id);

  app.get('/api/ofertas', { preHandler: app.autenticar }, async () => {
    const filas = await repo.listar(db);
    const totales = await totalesOfertas(
      db,
      filas.map((f) => f.oferta.id),
    );
    return {
      items: filas.map(({ oferta: o, rubros }) => ({
        id: o.id,
        nombre: o.nombre,
        cliente: o.cliente,
        tipo: o.tipo,
        estado: o.estado,
        rubros,
        total: totales.get(o.id) ?? '0.00',
        version: o.version,
      })),
    };
  });

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

  // Sin chequeo de licencia ni de rol de escritura: exportar siempre funciona.
  app.get<{ Params: { id: string } }>(
    '/api/ofertas/:id/exportar',
    { preHandler: app.autenticar },
    async (req, res) => {
      const libro = esUuid(req.params.id) ? await armarLibro(db, req.params.id) : null;
      if (!libro) return res.code(404).send({ mensaje: 'Esa oferta ya no existe' });
      const archivo = libro.datos.proyecto.replace(/[^\w.-]+/g, '_').slice(0, 60) || 'oferta';
      return res
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${archivo}.xlsx"`)
        .send(Buffer.from(await exportarLibro(libro)));
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
        await exigirDisciplinaNueva(db, req.usuario!, d.data.disciplina);
        await agregarCapitulo(db, req.usuario!.id, req.params.id, d.data);
        return res.code(201).send(await detalle(req.params.id));
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.patch<{ Params: { id: string; indId: string } }>(
    '/api/ofertas/:id/indirectos/:indId',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaIndirectoCambio.safeParse(req.body);
      if (!d.success || !esUuid(req.params.id) || !esUuid(req.params.indId)) {
        return res.code(400).send(datosInvalidos);
      }
      try {
        const i = await cambiarIndirecto(
          db,
          req.usuario!.id,
          req.params.id,
          req.params.indId,
          d.data,
        );
        return { id: i.id, porcentaje: i.porcentaje, version: i.version };
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
        await exigirDisciplinaRubro(db, req.usuario!, req.params.id);
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
        await exigirDisciplinaCapitulo(db, req.usuario!, d.data.capituloId);
        const { rubro: r, apu: a } = await agregarRubro(db, req.usuario!.id, req.params.id, d.data);
        return res.code(201).send({ rubro: rubroDto(r), apu: apuDto(a) });
      } catch (e) {
        return responderError(e, res);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/rubros/:id/apu/copia',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaVersionRubro.safeParse(req.body);
      if (!d.success || !esUuid(req.params.id)) return res.code(400).send(datosInvalidos);
      try {
        await exigirDisciplinaRubro(db, req.usuario!, req.params.id);
        const { rubro: r, apu: a } = await copiarApuDeRubro(
          db,
          req.usuario!.id,
          req.params.id,
          d.data.version,
        );
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
        await exigirDisciplinaRubro(db, req.usuario!, req.params.id);
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
        await exigirDisciplinaCapitulo(db, req.usuario!, req.params.id);
        await quitarCapitulo(db, req.usuario!.id, req.params.id, version);
        return res.code(204).send();
      } catch (e) {
        return responderError(e, res);
      }
    },
  );
}
