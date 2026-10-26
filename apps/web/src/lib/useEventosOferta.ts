import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Los cambios de otras personas llegan por SSE y se traen de nuevo; los propios se ignoran
// (ya están en el caché). Juntar ráfagas en un solo refetch.
export function useEventosOferta(id: string, yoId: string | undefined) {
  const cliente = useQueryClient();
  useEffect(() => {
    if (!yoId || typeof EventSource === 'undefined') return;
    const fuente = new EventSource(`/api/ofertas/${id}/eventos`);
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
}
