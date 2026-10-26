import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { PaginaBitacora } from 'tipos';
import { api } from '../lib/api';
import { describir, ENTIDADES } from './historialTexto';

const LIMITE = 50;
const CAMPO = 'rounded border border-slate-300 px-2 py-1 text-sm';

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });

/** Quién hizo qué, cuándo y de cuánto a cuánto, para toda la empresa (ux.md, regla 7). */
export function Historial() {
  const [entidad, setEntidad] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const q = useInfiniteQuery({
    queryKey: ['bitacora', entidad, desde, hasta],
    initialPageParam: 0,
    staleTime: 0,
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams({ saltar: String(pageParam), limite: String(LIMITE) });
      if (entidad) p.set('entidad', entidad);
      if (desde) p.set('desde', desde);
      if (hasta) p.set('hasta', hasta);
      return api<PaginaBitacora>(`/api/bitacora?${p}`);
    },
    getNextPageParam: (ultima, todas) =>
      ultima.hayMas ? todas.reduce((n, p) => n + p.items.length, 0) : undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section aria-label="Historial">
      <h1 className="mb-1 text-xl font-semibold">Historial</h1>
      <p className="mb-4 text-sm text-slate-600">
        Todo lo que cambió su equipo: quién, qué, cuándo, y de cuánto a cuánto.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          Qué cambió
          <select value={entidad} onChange={(e) => setEntidad(e.target.value)} className={CAMPO}>
            <option value="">Todo</option>
            {ENTIDADES.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className={CAMPO}
          />
        </label>
        <label className="flex flex-col gap-1">
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className={CAMPO}
          />
        </label>
      </div>
      {q.error ? (
        <p role="alert" className="text-red-700">
          No pudimos cargar el historial. Intente de nuevo.
        </p>
      ) : q.isLoading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-center text-slate-500">
          Aún no hay cambios que mostrar con estos filtros. Cuando alguien edite un precio, un APU o
          una oferta, aparecerá aquí.
        </p>
      ) : (
        <ul className="divide-y rounded border bg-white">
          {items.map((f) => {
            const { que, cambio } = describir(f);
            return (
              <li key={f.id} className="flex flex-wrap items-baseline gap-x-2 px-3 py-2 text-sm">
                <span className="font-medium">{f.usuario ?? 'Alguien'}</span>
                <span>{que}</span>
                {cambio && <span className="font-mono text-slate-700">{cambio}</span>}
                <time className="ml-auto text-xs text-slate-500" dateTime={f.fecha}>
                  {fecha(f.fecha)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
      {q.hasNextPage && (
        <button
          type="button"
          onClick={() => q.fetchNextPage()}
          disabled={q.isFetchingNextPage}
          className="mt-3 rounded bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Ver más
        </button>
      )}
    </section>
  );
}
