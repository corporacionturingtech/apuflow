import type { FastifyInstance } from 'fastify';
import type { Bd } from '../../db/conexion';
import { crearCanal } from './servicio';

const LATIDO_MS = 20_000;

export async function rutasTiempoReal(app: FastifyInstance, { db }: { db: Bd }) {
  const canal = crearCanal(db);
  app.addHook('onClose', () => canal.cerrar());

  // El canal es global; el cliente decide si el cambio afecta a su oferta y refetch.
  app.get('/api/ofertas/:id/eventos', { preHandler: app.autenticar }, async (req, res) => {
    const desuscribir = await canal.suscribir((c) => {
      res.raw.write(`event: cambio\ndata: ${JSON.stringify(c)}\n\n`);
    });
    res.hijack();
    res.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.raw.write(': conectado\n\n');
    const latido = setInterval(() => res.raw.write(': latido\n\n'), LATIDO_MS);
    req.raw.on('close', () => {
      clearInterval(latido);
      desuscribir();
    });
  });
}
