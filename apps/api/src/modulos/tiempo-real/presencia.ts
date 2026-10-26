import { EventEmitter } from 'node:events';

export type Presente = {
  usuarioId: string;
  nombre: string;
  disciplina: string | null;
  capituloId: string | null;
  capitulo: string | null;
};

// Se considera presente a quien latió hace menos de VIGENCIA_MS (el cliente late cada 20 s).
const VIGENCIA_MS = 45_000;

// En memoria del proceso (ver arquitectura.md): no se persiste, no deja bitácora.
export function crearPresencia() {
  const porOferta = new Map<string, Map<string, Presente & { ts: number }>>();
  const emisor = new EventEmitter();
  emisor.setMaxListeners(0);

  const de = (oferta: string): Presente[] => {
    const m = porOferta.get(oferta);
    if (!m) return [];
    const ahora = Date.now();
    const r: Presente[] = [];
    for (const [k, { ts, ...p }] of m) {
      if (ahora - ts > VIGENCIA_MS) m.delete(k);
      else r.push(p);
    }
    return r;
  };

  return {
    de,
    latir(oferta: string, p: Presente) {
      const m = porOferta.get(oferta) ?? new Map();
      porOferta.set(oferta, m);
      const antes = m.get(p.usuarioId);
      m.set(p.usuarioId, { ...p, ts: Date.now() });
      if (!antes || antes.capituloId !== p.capituloId) emisor.emit(oferta);
    },
    suscribir(oferta: string, fn: () => void) {
      emisor.on(oferta, fn);
      return () => void emisor.off(oferta, fn);
    },
  };
}
