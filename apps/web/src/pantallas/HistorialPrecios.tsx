import { useQuery } from '@tanstack/react-query';
import type { HistorialPrecio } from 'tipos';
import { api } from '../lib/api';
import { money } from '../lib/formato';

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });

/** Quién cambió el precio de un insumo, cuándo y de cuánto a cuánto (ux.md: historial legible). */
export function HistorialPrecios({
  insumoId,
  descripcion,
  alCerrar,
}: {
  insumoId: string;
  descripcion: string;
  alCerrar: () => void;
}) {
  const { data, error } = useQuery({
    queryKey: ['historial-precio', insumoId],
    queryFn: () => api<HistorialPrecio[]>(`/api/insumos/${insumoId}/historial`),
    staleTime: 0,
  });
  return (
    <div
      role="region"
      aria-label="Historial de precios"
      className="mb-2 rounded border bg-white p-3 text-sm"
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 font-medium">Historial de precios · {descripcion}</p>
        <button
          type="button"
          aria-label="Cerrar historial"
          onClick={alCerrar}
          className="text-slate-500"
        >
          ×
        </button>
      </div>
      {error && <p>No pudimos cargar el historial.</p>}
      {!data && !error && <p>Cargando…</p>}
      {data && data.length === 0 && <p>Este precio todavía no se ha cambiado.</p>}
      {data && data.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {data.map((h) => (
            <li key={h.id}>
              {fecha(h.fecha)} · {h.usuario ?? 'Sistema'} ·{' '}
              {h.puAnterior === null ? '—' : <s>{money(Number(h.puAnterior))}</s>} →{' '}
              <b>{money(Number(h.puNuevo))}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
