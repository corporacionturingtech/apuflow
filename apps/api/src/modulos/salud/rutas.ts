import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { esquemaSalud } from 'tipos';
import type { Bd } from '../../db/conexion';

export async function rutasSalud(app: FastifyInstance, { db }: { db: Bd }) {
  app.get('/api/salud', async () => {
    await db.execute(sql`select 1`);
    return esquemaSalud.parse({ estado: 'ok', bd: true });
  });
}
