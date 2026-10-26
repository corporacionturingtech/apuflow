import { EventEmitter } from 'node:events';
import pg from 'pg';
import type { Bd } from '../../db/conexion';

export type CambioEnVivo = {
  entidad: string;
  entidadId: string | null;
  campo: string | null;
  usuarioId: string | null;
  fecha: string;
};

// Una sola conexión LISTEN por proceso, creada con el primer suscriptor (así los tests que no
// usan SSE no dejan conexiones abiertas). pg_notify solo dispara al commit: nunca hay eventos de
// transacciones revertidas.
export function crearCanal(db: Bd) {
  const emisor = new EventEmitter();
  emisor.setMaxListeners(0);
  let cliente: pg.Client | null = null;
  let conectando: Promise<void> | null = null;
  let cerrado = false;

  const conectar = async () => {
    const c = new pg.Client({ connectionString: (db.$client as pg.Pool).options.connectionString });
    c.on('notification', (m) => {
      if (m.channel === 'cambios' && m.payload) emisor.emit('cambio', JSON.parse(m.payload));
    });
    c.on('error', () => {
      cliente = null;
      conectando = null;
      c.end().catch(() => {});
      if (!cerrado && emisor.listenerCount('cambio') > 0) setTimeout(() => void asegurar(), 1000);
    });
    await c.connect();
    await c.query('LISTEN cambios');
    cliente = c;
  };
  const asegurar = async () => {
    if (cliente) return;
    conectando ??= conectar().catch((e) => {
      conectando = null;
      throw e;
    });
    await conectando;
  };

  return {
    async suscribir(fn: (c: CambioEnVivo) => void) {
      await asegurar();
      emisor.on('cambio', fn);
      return () => void emisor.off('cambio', fn);
    },
    async cerrar() {
      cerrado = true;
      await cliente?.end().catch(() => {});
      cliente = null;
    },
  };
}
