import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { Apu } from 'tipos';
import { api } from '../../lib/api';

interface Props {
  capitulos: { id: string; nombre: string }[];
  alElegir: (apuId: string, capituloId: string) => void;
  alCerrar: () => void;
}

// Buscador de la biblioteca: se elige el capítulo destino y se toca el APU para añadirlo.
export function AnadirRubro({ capitulos, alElegir, alCerrar }: Props) {
  const [q, setQ] = useState('');
  const [capituloId, setCapituloId] = useState(capitulos[0]?.id ?? '');
  const { data, isPending } = useQuery({
    queryKey: ['apus', q],
    queryFn: () => api<{ items: Apu[] }>(`/api/apus?q=${encodeURIComponent(q)}`),
    placeholderData: (previo) => previo,
  });

  return (
    <section
      aria-label="Añadir rubro"
      className="mt-3 rounded border border-slate-300 bg-white p-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label>
          Capítulo{' '}
          <select
            value={capituloId}
            onChange={(e) => setCapituloId(e.target.value)}
            className="rounded border border-slate-300 px-1 py-0.5"
          >
            {capitulos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <input
          type="search"
          aria-label="Buscar APU para añadir"
          placeholder="Buscar APU por código o nombre"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-80 rounded border border-slate-300 px-2 py-0.5"
        />
        <button type="button" onClick={alCerrar} className="ml-auto underline">
          Cerrar
        </button>
      </div>
      {isPending && <p className="mt-2 text-slate-500">Cargando…</p>}
      {data && data.items.length === 0 && (
        <p className="mt-2 text-slate-600">No hay APUs que coincidan con su búsqueda.</p>
      )}
      <ul className="mt-2 max-h-56 overflow-auto">
        {(data?.items ?? []).map((a) => (
          <li key={a.id}>
            <button
              type="button"
              disabled={!capituloId}
              onClick={() => alElegir(a.id, capituloId)}
              className="w-full px-2 py-1 text-left hover:bg-slate-100 disabled:opacity-50"
            >
              <code className="mr-2 text-xs">{a.codigo}</code>
              {a.descripcion} <span className="text-xs text-slate-500">· {a.unidad}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
