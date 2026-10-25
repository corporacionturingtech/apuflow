import type { FastifyInstance } from 'fastify';
import type { Bd } from '../../db/conexion';
import { LibroConProblemas, confirmar, revisar } from './servicio';

const MAX_BYTES = 25 * 1024 * 1024;

/** El archivo llega como cuerpo binario; el nombre, en `x-nombre-archivo`. */
export async function rutasImportacion(app: FastifyInstance, { db }: { db: Bd }) {
  const puedeEscribir = app.exigirRol('admin', 'cotizador');
  app.addContentTypeParser(
    [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ],
    { parseAs: 'buffer', bodyLimit: MAX_BYTES },
    (_req, body, done) => done(null, body),
  );

  const archivo = (h: Record<string, unknown>) =>
    decodeURIComponent(String(h['x-nombre-archivo'] ?? 'libro.xlsx'));
  const ilegible = {
    mensaje: 'No pudimos leer el archivo. Compruebe que sea un libro de Excel (.xlsx).',
  };

  app.post('/api/importar/revisar', { preHandler: puedeEscribir }, async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.code(400).send(ilegible);
    try {
      return await revisar(db, new Uint8Array(req.body), archivo(req.headers));
    } catch {
      return res.code(400).send(ilegible);
    }
  });

  app.post('/api/importar/confirmar', { preHandler: puedeEscribir }, async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.code(400).send(ilegible);
    try {
      const ofertaId = await confirmar(
        db,
        req.usuario!.id,
        new Uint8Array(req.body),
        archivo(req.headers),
      );
      return res.code(201).send({ ofertaId });
    } catch (e) {
      if (e instanceof LibroConProblemas)
        return res
          .code(422)
          .send({
            mensaje:
              'El libro tiene problemas que impiden importarlo. Revíselos y vuelva a subirlo.',
          });
      return res.code(400).send(ilegible);
    }
  });
}
