import { and, desc, eq, max } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { calcularDetalle } from 'motor';
import { esquemaVersionOfertaCrear, type OfertaDetalle } from 'tipos';
import type { Bd } from '../../db/conexion';
import { versionOferta } from '../../db/esquema';
import { detalleOferta } from './rutas';
import { registrarBitacora } from './repo';

const esUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const noExiste = { mensaje: 'Esa oferta ya no existe' };

const resumen = (v: typeof versionOferta.$inferSelect) => ({
  id: v.id,
  numero: v.numero,
  nombre: v.nombre,
  emitida: v.emitida,
  total: v.total,
  creadaEn: v.creadaEn.toISOString(),
});

/** Las versiones no se editan ni se borran: son la foto de cómo estaba la oferta. */
export async function rutasVersiones(app: FastifyInstance, { db }: { db: Bd }) {
  const puedeEscribir = app.exigirRol('admin', 'cotizador');

  app.get<{ Params: { id: string } }>(
    '/api/ofertas/:id/versiones',
    { preHandler: app.autenticar },
    async (req, res) => {
      if (!esUuid(req.params.id)) return res.code(404).send(noExiste);
      const filas = await db
        .select()
        .from(versionOferta)
        .where(eq(versionOferta.ofertaId, req.params.id))
        .orderBy(desc(versionOferta.numero));
      return { items: filas.map(resumen) };
    },
  );

  app.get<{ Params: { id: string; vid: string } }>(
    '/api/ofertas/:id/versiones/:vid',
    { preHandler: app.autenticar },
    async (req, res) => {
      if (!esUuid(req.params.id) || !esUuid(req.params.vid)) return res.code(404).send(noExiste);
      const [v] = await db
        .select()
        .from(versionOferta)
        .where(
          and(eq(versionOferta.id, req.params.vid), eq(versionOferta.ofertaId, req.params.id)),
        );
      if (!v) return res.code(404).send({ mensaje: 'Esa versión ya no existe' });
      return { ...resumen(v), snapshot: v.snapshot as OfertaDetalle };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/ofertas/:id/versiones',
    { preHandler: puedeEscribir },
    async (req, res) => {
      const d = esquemaVersionOfertaCrear.safeParse(req.body);
      if (!d.success || !esUuid(req.params.id)) {
        return res
          .code(400)
          .send({ mensaje: 'Revise los datos: escriba un nombre para la versión' });
      }
      const usuarioId = req.usuario!.id;
      const creada = await db.transaction(async (tx) => {
        const snapshot = await detalleOferta(tx, req.params.id);
        if (!snapshot) return null;
        const [ultima] = await tx
          .select({ n: max(versionOferta.numero) })
          .from(versionOferta)
          .where(eq(versionOferta.ofertaId, req.params.id));
        const [v] = await tx
          .insert(versionOferta)
          .values({
            ofertaId: req.params.id,
            numero: (ultima?.n ?? 0) + 1,
            nombre: d.data.nombre,
            snapshot,
            total: calcularDetalle(snapshot).totales.total.toFixed(2),
            creadaPor: usuarioId,
          })
          .returning();
        await registrarBitacora(tx, [
          {
            usuarioId,
            entidad: 'version_oferta',
            entidadId: v!.id,
            campo: null,
            antes: null,
            despues: {
              ofertaId: req.params.id,
              numero: v!.numero,
              nombre: v!.nombre,
              total: v!.total,
            },
          },
        ]);
        return v!;
      });
      if (!creada) return res.code(404).send(noExiste);
      return res.code(201).send(resumen(creada));
    },
  );
}
