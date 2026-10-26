import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { Apu } from 'tipos';
import { api } from '../lib/api';

export function Apus() {
  const [q, setQ] = useState('');
  const { data, isPending, error } = useQuery({
    queryKey: ['apus', q],
    queryFn: () => api<{ items: Apu[] }>(`/api/apus?q=${encodeURIComponent(q)}`),
    placeholderData: (previo) => previo,
  });
  const grupos = new Map<string, Apu[]>();
  for (const a of data?.items ?? []) {
    const d = a.disciplina ?? 'Sin disciplina';
    grupos.set(d, [...(grupos.get(d) ?? []), a]);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Análisis de precios unitarios</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cada APU se arma una vez y lo reutilizan todos los rubros que lo usan. Elija uno para verlo
        completo.
      </p>
      <input
        type="search"
        aria-label="Buscar APU"
        placeholder="Buscar APU por código o nombre"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-3 w-96 rounded border border-slate-300 px-2 py-1 text-sm"
      />
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          No pudimos cargar los APUs.
        </p>
      )}
      {isPending && <p className="mt-3 text-slate-500">Cargando…</p>}
      {data && data.items.length === 0 && (
        <p className="mt-4 text-slate-600">No hay APUs que coincidan con su búsqueda.</p>
      )}
      {[...grupos].map(([disciplina, items]) => (
        <section key={disciplina} aria-label={disciplina}>
          <h2 className="mb-2 mt-5 font-semibold">{disciplina}</h2>
          <ul className="grid grid-cols-2 gap-2">
            {items.map((a) => (
              <li key={a.id}>
                <Link
                  to="/apus/$id"
                  params={{ id: a.id }}
                  data-guia={a.id === data?.items[0]?.id ? 'apu-primero' : undefined}
                  className="block rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <code className="mr-2 text-xs">{a.codigo}</code>
                  <b>{a.descripcion}</b>
                  <span className="block text-xs text-slate-500">
                    {a.unidad} · {a.lineas} insumos
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
