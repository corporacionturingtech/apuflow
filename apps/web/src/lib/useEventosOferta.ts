import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

// Los cambios de otras personas llegan por SSE y se traen de nuevo; los propios se ignoran
// (ya están en el caché). Juntar ráfagas en un solo refetch.
export type Presente = {
  usuarioId: string;
  nombre: string;
  disciplina: string | null;
  capituloId: string | null;
  capitulo: string | null;
};

const LATIDO_MS = 20_000;

// Devuelve a las demás personas presentes en la oferta; `ubicacion` es el capítulo donde estoy.
export function useEventosOferta(
  id: string,
  yoId: string | undefined,
  ubicacion: { capituloId: string | null; capitulo: string | null } = {
    capituloId: null,
    capitulo: null,
  },
) {
  const cliente = useQueryClient();
  const [presentes, setPresentes] = useState<Presente[]>([]);
  const ubic = useRef(ubicacion);
  ubic.current = ubicacion;
  const lat = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!yoId) return;
    const latir = () =>
      void fetch(`/api/ofertas/${id}/presencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ubic.current),
      }).catch(() => {});
    lat.current = latir;
    latir();
    const t = setInterval(latir, LATIDO_MS);
    return () => clearInterval(t);
  }, [id, yoId]);
  // Al cambiar de capítulo se avisa de inmediato, sin esperar al latido.
  useEffect(() => lat.current?.(), [ubicacion.capituloId]);

  useEffect(() => {
    if (!yoId || typeof EventSource === 'undefined') return;
    const fuente = new EventSource(`/api/ofertas/${id}/eventos`);
    fuente.addEventListener('presencia', (e) => {
      const todos = JSON.parse((e as MessageEvent<string>).data) as Presente[];
      setPresentes(todos.filter((p) => p.usuarioId !== yoId));
    });
    let t: ReturnType<typeof setTimeout> | undefined;
    fuente.addEventListener('cambio', (e) => {
      const c = JSON.parse((e as MessageEvent<string>).data) as { usuarioId: string | null };
      if (c.usuarioId === yoId) return;
      clearTimeout(t);
      t = setTimeout(() => void cliente.invalidateQueries({ queryKey: ['oferta', id] }), 100);
    });
    return () => {
      clearTimeout(t);
      fuente.close();
    };
  }, [id, yoId, cliente]);
  return presentes;
}
