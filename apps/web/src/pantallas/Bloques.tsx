import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import type { BloquesRespuesta, OfertaDetalle } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { money, parseNum, qty } from '../lib/formato';
import { consultaYo } from '../sesion';
import { calcularPresupuesto, costoDirectoBloque } from './presupuesto/calculo';
import { Blocks, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Cargando, Vacio } from '../ui/estado';
import { Select } from '../ui/select';

interface Escala {
  bloqueId: string;
  valor: string;
  conTamano: boolean;
}

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
  // Tamaño real (o veces) escrito en cada tarjeta; vacío = el del bloque.
  const [tamanos, setTamanos] = useState<Record<string, string>>({});
  const puedeEscribir = yo?.rol === 'admin' || yo?.rol === 'cotizador';
  const borradores = (ofertas?.items ?? []).filter((o) => o.estado !== 'emitida');
  const destino = ofertaId || borradores[0]?.id || '';

  const apus = useMemo(() => new Map((data?.apus ?? []).map((a) => [a.id, a])), [data]);

  const anadir = useMutation({
    mutationFn: ({ bloqueId, valor, conTamano }: Escala) =>
      api<{ capituloId: string; oferta: OfertaDetalle }>(`/api/ofertas/${destino}/bloques`, {
        metodo: 'POST',
        cuerpo: { bloqueId, ...(conTamano ? { tamano: valor } : { veces: valor }) },
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
          <Select value={destino} onChange={(e) => setOfertaId(e.target.value)} className="ml-1">
            {borradores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </Select>
        </label>
      )}
      {insertado && (
        <p
          role="status"
          className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900"
        >
          Se añadió «{insertado.nombre}» a {insertado.oferta.nombre}: {insertado.rubros} rubros,
          subtotal {money(insertado.subtotal)}.{' '}
          <Button variant="link" asChild>
            <Link to="/ofertas/$id" params={{ id: insertado.oferta.id }}>
              Ver en el presupuesto
            </Link>
          </Button>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {!data && <Cargando />}
      {data && data.items.length === 0 && (
        <Vacio
          icono={Blocks}
          titulo="Aún no hay bloques"
          className="mt-4 max-w-2xl"
          acciones={
            <Button variant="outline" asChild>
              <Link to="/ofertas">Ir a las ofertas</Link>
            </Button>
          }
        >
          Abra un presupuesto y use «Guardar como bloque» en un capítulo.
        </Vacio>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(data?.items ?? []).map((b, i) => {
          const base = b.tamano ? qty(Number(b.tamano)) : '1';
          const escrito = tamanos[b.id] ?? base;
          const valor = parseNum(escrito);
          const valido = Number.isFinite(valor) && valor > 0;
          return (
            <Card asChild key={b.id}>
              <article aria-label={b.nombre} className="p-3">
                <h2 className="font-semibold">{b.nombre}</h2>
                <p className="text-xs text-slate-500">
                  {b.disciplina ?? 'Sin disciplina'} · {b.lineas.length} rubros
                  {b.tamano && ` · para ${qty(Number(b.tamano))} ${b.unidadTamano ?? ''}`}
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
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <label className="flex items-center gap-1.5 text-slate-600">
                      {b.tamano ? '¿Para cuántos?' : 'Veces'}
                      <Input
                        aria-label={`Tamaño para añadir «${b.nombre}»`}
                        inputMode="decimal"
                        value={escrito}
                        onChange={(e) => setTamanos((t) => ({ ...t, [b.id]: e.target.value }))}
                        className="h-7 w-20 text-right tabular-nums"
                      />
                      {b.tamano && <span>{b.unidadTamano}</span>}
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      data-guia={i === 0 ? 'bloque-anadir' : undefined}
                      disabled={!destino || anadir.isPending || !valido}
                      onClick={() =>
                        anadir.mutate({
                          bloqueId: b.id,
                          valor: String(valor),
                          conTamano: Boolean(b.tamano),
                        })
                      }
                    >
                      <Plus aria-hidden />
                      Añadir a la oferta
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`¿Borrar el bloque «${b.nombre}»?`))
                          borrar.mutate({ id: b.id, version: b.version });
                      }}
                      className="ml-auto"
                    >
                      <Trash2 aria-hidden />
                      Borrar
                    </Button>
                  </div>
                )}
              </article>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
