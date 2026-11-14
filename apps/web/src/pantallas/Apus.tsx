import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRight, Layers, Search, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Apu } from 'tipos';
import { FiltroDisciplina } from '../componentes/FiltroDisciplina';
import { api } from '../lib/api';
import { cn } from '../lib/cn';
import { colorDe, normalizar, plural } from '../lib/disciplina';
import { money } from '../lib/formato';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cargando, Vacio } from '../ui/estado';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const SIN_DISCIPLINA = 'Sin disciplina';
const TODAS = '';

const COLUMNAS =
  'grid grid-cols-[4.5rem_minmax(0,1fr)_7rem_1rem] items-center gap-x-4 px-4 md:grid-cols-[4.5rem_minmax(0,1fr)_4rem_5.5rem_8rem_1rem]';

export function Apus() {
  const navegar = useNavigate();
  const [q, setQ] = useState('');
  const [disciplina, setDisciplina] = useState(TODAS);
  const { data, isPending, error } = useQuery({
    queryKey: ['apus', ''],
    queryFn: () => api<{ items: Apu[] }>('/api/apus'),
  });
  const todos = useMemo(() => data?.items ?? [], [data]);

  const conteo = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of todos) {
      const d = a.disciplina ?? SIN_DISCIPLINA;
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return m;
  }, [todos]);

  const visibles = useMemo(() => {
    const t = normalizar(q.trim());
    return todos.filter(
      (a) =>
        (!disciplina || (a.disciplina ?? SIN_DISCIPLINA) === disciplina) &&
        (!t || normalizar(`${a.codigo} ${a.descripcion}`).includes(t)),
    );
  }, [todos, q, disciplina]);

  const grupos = new Map<string, Apu[]>();
  for (const a of visibles) {
    const d = a.disciplina ?? SIN_DISCIPLINA;
    grupos.set(d, [...(grupos.get(d) ?? []), a]);
  }
  const primero = visibles[0];
  const filtrando = q.trim() !== '' || disciplina !== TODAS;

  const limpiar = () => {
    setQ('');
    setDisciplina(TODAS);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Análisis de precios unitarios</h1>
        {data && (
          <p className="text-sm text-slate-500" aria-live="polite">
            {filtrando
              ? `${visibles.length} de ${plural(todos.length, 'APU', 'APUs')}`
              : plural(todos.length, 'APU', 'APUs')}
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Cada APU se arma una vez y lo reutilizan todos los rubros que lo usan. Elija uno para verlo
        completo.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-96">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            type="search"
            aria-label="Buscar APU"
            placeholder="Buscar por código o nombre"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && primero)
                void navegar({ to: '/apus/$id', params: { id: primero.id } });
              if (e.key === 'Escape') setQ('');
            }}
            className="pl-8"
          />
        </div>
        <FiltroDisciplina
          conteo={conteo}
          total={todos.length}
          valor={disciplina}
          alCambiar={setDisciplina}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-red-700">
          No pudimos cargar los APUs. Revise su conexión y recargue la página.
        </p>
      )}
      {isPending && <Cargando texto="Cargando APUs…" />}
      {data && todos.length === 0 && (
        <Vacio
          icono={Layers}
          titulo="Todavía no hay APUs"
          className="mt-4"
          acciones={
            <Button size="sm" asChild>
              <Link to="/importar">Importar Excel</Link>
            </Button>
          }
        >
          Los APUs llegan al importar su Excel de presupuesto o al cargar la empresa de demostración
          desde Inicio.
        </Vacio>
      )}
      {data && todos.length > 0 && visibles.length === 0 && (
        <Vacio
          icono={SearchX}
          titulo={q.trim() ? `Ningún APU coincide con «${q.trim()}»` : 'Ningún APU en ese filtro'}
          className="mt-4"
          acciones={
            <Button variant="outline" size="sm" onClick={limpiar}>
              Ver todos los APUs
            </Button>
          }
        >
          Pruebe con otra palabra o con el código (por ejemplo, C01).
        </Vacio>
      )}

      {[...grupos].map(([d, items]) => (
        <Card asChild key={d} className="mt-5 overflow-hidden">
          <section aria-label={d}>
            <h2 className="flex items-center gap-2 border-b border-borde bg-slate-50/70 px-4 py-2 text-sm font-semibold">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ background: colorDe(d) }}
              />
              {d}
              <span className="font-normal text-slate-500">
                {plural(items.length, 'APU', 'APUs')}
              </span>
            </h2>
            <div
              aria-hidden
              className={cn(
                COLUMNAS,
                'border-b border-borde py-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500',
              )}
            >
              <span>Código</span>
              <span>Descripción</span>
              <span className="hidden md:block">Unidad</span>
              <span className="hidden md:block">Insumos</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-right underline decoration-dotted underline-offset-2">
                    Costo unitario
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Costo directo por unidad, sin indirectos ni IVA. Los indirectos se suman en cada
                  oferta.
                </TooltipContent>
              </Tooltip>
              <span />
            </div>
            <ul className="divide-y divide-borde">
              {items.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/apus/$id"
                    params={{ id: a.id }}
                    data-guia={a.id === primero?.id ? 'apu-primero' : undefined}
                    className={cn(
                      COLUMNAS,
                      'group py-2 text-sm transition-colors hover:bg-primario/5 focus-visible:bg-primario/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primario/40',
                    )}
                  >
                    <code className="font-mono text-xs text-slate-500">{a.codigo}</code>
                    <span className="min-w-0">
                      <span
                        className="block truncate font-medium text-slate-900"
                        title={a.descripcion}
                      >
                        {a.descripcion}
                      </span>
                      <span className="block text-xs text-slate-500 md:hidden">
                        {a.unidad} · {plural(a.lineas, 'insumo', 'insumos')}
                      </span>
                    </span>
                    <span className="hidden text-slate-600 md:block">{a.unidad}</span>
                    <span
                      className={cn(
                        'hidden tabular-nums md:block',
                        a.lineas === 0 ? 'text-amber-700' : 'text-slate-600',
                      )}
                    >
                      {a.lineas === 0 ? 'Sin insumos' : a.lineas}
                    </span>
                    <span className="text-right font-medium tabular-nums text-slate-900">
                      {money(Number(a.cu))}
                      <span className="sr-only"> por {a.unidad}</span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 text-slate-300 transition-colors group-hover:text-primario"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Card>
      ))}
    </div>
  );
}
