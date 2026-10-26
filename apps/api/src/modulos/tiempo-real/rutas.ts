import type { FastifyInstance } from 'fastify';
import type { Bd } from '../../db/conexion';
import { crearCanal } from './servicio';
import { crearPresencia } from './presencia';

const LATIDO_MS = 20_000;

export async function rutasTiempoReal(app: FastifyInstance, { db }: { db: Bd }) {
  const canal = crearCanal(db);
  app.addHook('onClose', () => canal.cerrar());
  const presencia = crearPresencia();

  // Latido de presencia: dónde está cada persona. Sin esquema zod compartido: solo dos textos.
  app.post<{
    Params: { id: string };
    Body: { capituloId?: string | null; capitulo?: string | null };
  }>('/api/ofertas/:id/presencia', { preHandler: app.autenticar }, async (req, res) => {
    const u = req.usuario!;
    const b = req.body ?? {};
    presencia.latir(req.params.id, {
      usuarioId: u.id,
      nombre: u.nombre,
      disciplina: u.disciplinas[0] ?? null,
      capituloId: typeof b.capituloId === 'string' ? b.capituloId : null,
      capitulo: typeof b.capitulo === 'string' ? b.capitulo.slice(0, 120) : null,
    });
    return res.code(204).send();
  });

  // El canal es global; el cliente decide si el cambio afecta a su oferta y refetch.
  app.get<{ Params: { id: string } }>(
    '/api/ofertas/:id/eventos',
    { preHandler: app.autenticar },
    async (req, res) => {
      const id = req.params.id;
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
      const enviarPresencia = () =>
        res.raw.write(`event: presencia\ndata: ${JSON.stringify(presencia.de(id))}\n\n`);
      const quitarPresencia = presencia.suscribir(id, enviarPresencia);
      enviarPresencia();
      const latido = setInterval(() => {
        res.raw.write(': latido\n\n');
        enviarPresencia(); // también retira a quien dejó de latir
      }, LATIDO_MS);
      req.raw.on('close', () => {
        clearInterval(latido);
        quitarPresencia();
        desuscribir();
      });
    },
  );
}
