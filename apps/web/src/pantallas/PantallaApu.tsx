import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { ApuDetalle } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { money, parseNum, qty } from '../lib/formato';
import { consultaYo } from '../sesion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { ComponenteApu } from './apu/ComponenteApu';
import { COMPONENTES, calcular } from './apu/calculo';
import { precioATexto } from './precio';

type Cambio =
  | { tipo: 'rendimiento'; valor: string }
  | { tipo: 'cantidad'; lineaId: string; valor: string }
  | { tipo: 'quitar'; lineaId: string }
  | { tipo: 'agregar'; insumoId: string };

export function PantallaApu() {
  const { id } = useParams({ strict: false }) as { id: string };
  const clave = ['apu', id] as const;
  const cliente = useQueryClient();
  const { data: yo } = useQuery(consultaYo);
  const [aviso, setAviso] = useState('');
  const [indirectos, setIndirectos] = useState(0);

  const { data, isPending, error } = useQuery({
    queryKey: clave,
    queryFn: () => api<ApuDetalle>(`/api/apus/${id}`),
  });

  const guardar = useMutation({
    // Una cola por APU: cada cambio lee la versión que dejó el anterior, así no hay 409 falsos.
    scope: { id: `apu-${id}` },
    mutationFn: (c: Cambio) => {
      const version = cliente.getQueryData<ApuDetalle>(clave)!.version;
      const base = `/api/apus/${id}`;
      switch (c.tipo) {
        case 'rendimiento':
          return api<ApuDetalle>(base, {
            metodo: 'PATCH',
            cuerpo: { version, rendimiento: c.valor },
          });
        case 'cantidad':
          return api<ApuDetalle>(`${base}/lineas/${c.lineaId}`, {
            metodo: 'PATCH',
            cuerpo: { version, cantidad: c.valor },
          });
        case 'quitar':
          return api<ApuDetalle>(`${base}/lineas/${c.lineaId}/quitar`, {
            metodo: 'POST',
            cuerpo: { version },
          });
        case 'agregar':
          return api<ApuDetalle>(`${base}/lineas`, {
            metodo: 'POST',
            cuerpo: { version, insumoId: c.insumoId },
          });
      }
    },
    onMutate: (c) => {
      // Optimista: el cálculo del pie ya muestra el valor nuevo mientras se guarda.
      cliente.setQueryData<ApuDetalle>(clave, (d) => {
        if (!d) return d;
        if (c.tipo === 'rendimiento') return { ...d, rendimiento: c.valor };
        if (c.tipo === 'cantidad')
          return {
            ...d,
            lineasApu: d.lineasApu.map((l) =>
              l.id === c.lineaId ? { ...l, cantidad: c.valor } : l,
            ),
          };
        if (c.tipo === 'quitar')
          return { ...d, lineasApu: d.lineasApu.filter((l) => l.id !== c.lineaId) };
        return d;
      });
    },
    onSuccess: (fila, c) => {
      setAviso('');
      // Solo la versión: lo demás ya está en pantalla y puede haber más cambios en cola. Agregar
      // trae la línea nueva (con su id), así que reemplaza todo.
      cliente.setQueryData<ApuDetalle>(clave, (d) =>
        c.tipo === 'agregar' ? fila : d && { ...d, version: fila.version },
      );
    },
    onError: (e) => {
      setAviso(e instanceof ErrorApi ? e.message : 'No pudimos guardar el cambio.');
      void cliente.invalidateQueries({ queryKey: clave });
    },
  });

  const puedeEditar = yo?.rol === 'admin' || yo?.rol === 'precios';
  const calculado = useMemo(() => (data ? calcular(data, indirectos) : null), [data, indirectos]);

  if (error)
    return (
      <p role="alert" className="text-red-700">
        No encontramos ese APU.
      </p>
    );
  if (isPending || !data || !calculado) return <p className="text-slate-500">Cargando…</p>;

  const cu = calculado.cu.toNumber();
  const pof = calculado.puOfertado.toNumber();
  return (
    <div className="max-w-5xl">
      <Button variant="link" size="sm" asChild className="text-slate-500">
        <Link to="/apus">
          <ChevronLeft aria-hidden />
          Todos los APUs
        </Link>
      </Button>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
        Análisis de precio unitario · {data.codigo}
      </p>
      <h1 className="text-xl font-semibold tracking-tight">{data.descripcion}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <Badge>Unidad: {data.unidad}</Badge>
        {data.disciplina && <Badge variant="primario">{data.disciplina}</Badge>}
        <label className="ml-2 flex items-center gap-2 text-slate-600">
          Rendimiento R (h/{data.unidad})
          <Input
            key={data.rendimiento}
            aria-label="Rendimiento"
            defaultValue={qty(Number(data.rendimiento))}
            disabled={!puedeEditar}
            className="h-7 w-20 text-right tabular-nums"
            onBlur={(e) => {
              const t = precioATexto(e.target.value);
              if (t === null) e.target.value = qty(Number(data.rendimiento));
              else if (Number(t) !== Number(data.rendimiento))
                guardar.mutate({ tipo: 'rendimiento', valor: t });
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </label>
      </div>
      {aviso && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {aviso}
        </p>
      )}

      {COMPONENTES.map((def) => (
        <ComponenteApu
          key={def.tipo}
          def={def}
          detalle={data}
          calculado={calculado}
          puedeEditar={puedeEditar}
          onCantidad={(lineaId, valor) => guardar.mutate({ tipo: 'cantidad', lineaId, valor })}
          onQuitar={(lineaId) => guardar.mutate({ tipo: 'quitar', lineaId })}
          onAgregar={(insumoId) => guardar.mutate({ tipo: 'agregar', insumoId })}
        />
      ))}

      {/* Pegado sobre la barra de totales: el resultado del APU siempre a la vista (regla 5). */}
      <Card asChild className="sticky bottom-16 z-10 ml-auto mt-4 w-full max-w-md shadow-md">
        <dl aria-label="Cálculo del APU" className="divide-y divide-slate-100 text-sm">
          <div className="flex items-center justify-between px-4 py-2">
            <dt className="text-slate-600">Costo directo (M + N + O + P)</dt>
            <dd className="font-semibold tabular-nums">{money(cu)}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-2">
            <dt>
              <label className="flex items-center gap-2 text-slate-600">
                Indirectos y utilidad (%)
                <Input
                  aria-label="Indirectos"
                  defaultValue={qty(indirectos)}
                  className="h-7 w-16 text-right tabular-nums"
                  onBlur={(e) => setIndirectos(Math.max(0, parseNum(e.target.value) || 0))}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </label>
            </dt>
            <dd className="tabular-nums">{money(pof - cu)}</dd>
          </div>
          <div className="flex items-baseline justify-between rounded-b-lg bg-primario/5 px-4 py-2.5">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-600">
              P.U. ofertado
            </dt>
            <dd className="text-lg font-semibold tabular-nums tracking-tight text-slate-900">
              {money(pof)}
            </dd>
          </div>
        </dl>
      </Card>
      <p className="mt-3 text-xs text-slate-500">
        Los precios en color viven en las listas: se cambian allí y llegan a todos los APUs. Los
        indirectos de la oferta se aplicarán desde la oferta.
      </p>
    </div>
  );
}
