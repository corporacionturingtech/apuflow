import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import type { BloquesRespuesta, OfertaDetalle } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { money, qty } from '../lib/formato';
import { consultaYo } from '../sesion';
import { calcularPresupuesto, costoDirectoBloque } from './presupuesto/calculo';

interface Insertado {
  nombre: string;
  oferta: { id: string; nombre: string };
  rubros: number;
  subtotal: number;
}

export function Bloques() {
  const cliente = useQueryClient();
  const { data: yo } = useQuery(consultaYo);
  const { data } = useQuery({
    queryKey: ['bloques'],
    queryFn: () => api<BloquesRespuesta>('/api/bloques'),
  });
  const { data: ofertas } = useQuery({
    queryKey: ['ofertas'],
    queryFn: () => api<{ items: { id: string; nombre: string; estado: string }[] }>('/api/ofertas'),
  });
  const [ofertaId, setOfertaId] = useState('');
  const [insertado, setInsertado] = useState<Insertado | null>(null);
  const [error, setError] = useState('');
  const puedeEscribir = yo?.rol === 'admin' || yo?.rol === 'cotizador';
  const borradores = (ofertas?.items ?? []).filter((o) => o.estado !== 'emitida');
  const destino = ofertaId || borradores[0]?.id || '';

  const apus = useMemo(() => new Map((data?.apus ?? []).map((a) => [a.id, a])), [data]);

  const anadir = useMutation({
    mutationFn: (bloqueId: string) =>
      api<{ capituloId: string; oferta: OfertaDetalle }>(`/api/ofertas/${destino}/bloques`, {
        metodo: 'POST',
        cuerpo: { bloqueId },
      }),
    onSuccess: ({ capituloId, oferta }) => {
      setError('');
      cliente.setQueryData(['oferta', oferta.id], oferta);
      const cap = oferta.capitulos.find((c) => c.id === capituloId)!;
      setInsertado({
        nombre: cap.nombre,
        oferta: { id: oferta.id, nombre: oferta.nombre },
        rubros: oferta.rubros.filter((r) => r.capituloId === capituloId).length,
        subtotal: calcularPresupuesto(oferta).capitulos[capituloId]!.totalOfertado.toNumber(),
      });
    },
    onError: (e) => setError(e instanceof ErrorApi ? e.message : 'No pudimos añadir el bloque.'),
  });

  const borrar = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      api<void>(`/api/bloques/${id}?version=${version}`, { metodo: 'DELETE' }),
    onSettled: () => cliente.invalidateQueries({ queryKey: ['bloques'] }),
    onError: (e) => setError(e instanceof ErrorApi ? e.message : 'No pudimos borrar el bloque.'),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Bloques de rubros</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-600">
        Cada bloque es un listado de rubros con sus cantidades. Entra completo a la oferta como un
        capítulo y después se ajusta cualquier cantidad en el presupuesto. Para crear uno use
        «Guardar como bloque» en el presupuesto.
      </p>
      {puedeEscribir && (
        <label className="mt-3 block text-sm">
          Añadir a la oferta{' '}
          <select
            value={destino}
            onChange={(e) => setOfertaId(e.target.value)}
            className="rounded border border-slate-300 px-1 py-0.5"
          >
            {borradores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {insertado && (
        <p role="status" className="mt-3 rounded border border-green-300 bg-green-50 p-2 text-sm">
          Se añadió «{insertado.nombre}» a {insertado.oferta.nombre}: {insertado.rubros} rubros,
          subtotal {money(insertado.subtotal)}.{' '}
          <Link to="/ofertas/$id" params={{ id: insertado.oferta.id }} className="underline">
            Ver en el presupuesto
          </Link>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {data && data.items.length === 0 && (
        <p className="mt-4 text-slate-600">
          Aún no hay bloques. Abra un presupuesto y use «Guardar como bloque» en un capítulo.
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(data?.items ?? []).map((b, i) => (
          <article
            key={b.id}
            aria-label={b.nombre}
            className="rounded border border-slate-300 bg-white p-3"
          >
            <h2 className="font-semibold">{b.nombre}</h2>
            <p className="text-xs text-slate-500">
              {b.disciplina ?? 'Sin disciplina'} · {b.lineas.length} rubros
            </p>
            <p className="mt-2 text-lg tabular-nums">
              {money(costoDirectoBloque(data!, b))}{' '}
              <small className="text-xs text-slate-500">costo directo del bloque</small>
            </p>
            <details className="mt-1 text-sm">
              <summary className="cursor-pointer">Ver rubros y cantidades</summary>
              <ul>
                {b.lineas.map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{apus.get(l.apuId)?.descripcion}</span>
                    <b className="tabular-nums">
                      {qty(Number(l.cantidad))} {apus.get(l.apuId)?.unidad}
                    </b>
                  </li>
                ))}
              </ul>
            </details>
            {puedeEscribir && (
              <div className="mt-2 flex items-center gap-3 text-sm">
                <button
                  type="button"
                  data-guia={i === 0 ? 'bloque-anadir' : undefined}
                  disabled={!destino || anadir.isPending}
                  onClick={() => anadir.mutate(b.id)}
                  className="rounded border border-slate-300 px-2 py-0.5"
                >
                  Añadir a la oferta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Borrar el bloque «${b.nombre}»?`))
                      borrar.mutate({ id: b.id, version: b.version });
                  }}
                  className="ml-auto text-slate-500 underline"
                >
                  Borrar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
