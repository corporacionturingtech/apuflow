import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { D } from 'motor';
import type { BloqueLista, BloquesRespuesta, OfertaDetalle } from 'tipos';
import { ErrorApi, api } from '../../lib/api';
import { money, parseNum, qty } from '../../lib/formato';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { totalesBloque } from './calculo';

interface Props {
  oferta: OfertaDetalle;
  alCerrar: () => void;
}

// La vía rápida: un bloque entra completo como capítulo, escalado al tamaño real de la obra.
export function AnadirBloque({ oferta, alCerrar }: Props) {
  const cliente = useQueryClient();
  const { data } = useQuery({
    queryKey: ['bloques'],
    queryFn: () => api<BloquesRespuesta>('/api/bloques'),
  });
  const [tamanos, setTamanos] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState('');

  const anadir = useMutation({
    mutationFn: ({ b, valor }: { b: BloqueLista; valor: number }) =>
      api<{ capituloId: string; oferta: OfertaDetalle }>(`/api/ofertas/${oferta.id}/bloques`, {
        metodo: 'POST',
        cuerpo: {
          bloqueId: b.id,
          ...(b.tamano ? { tamano: String(valor) } : { veces: String(valor) }),
        },
      }),
    onSuccess: (r) => {
      cliente.setQueryData(['oferta', oferta.id], r.oferta);
      void cliente.invalidateQueries({ queryKey: ['ofertas'] });
      const cap = r.oferta.capitulos.find((c) => c.id === r.capituloId);
      setMensaje(`Se añadió «${cap?.nombre}». Puede añadir otro o cerrar.`);
    },
    onError: (e) => setMensaje(e instanceof ErrorApi ? e.message : 'No pudimos añadir el bloque.'),
  });

  return (
    <section
      aria-label="Añadir bloque"
      className="mt-3 rounded-lg border border-borde bg-white p-3 text-sm shadow-xs"
    >
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Añadir un bloque</h2>
        <span className="text-slate-500">
          Entra completo como capítulo; escriba el tamaño real de su obra.
        </span>
        <button type="button" onClick={alCerrar} className="ml-auto underline">
          Cerrar
        </button>
      </div>
      {mensaje && (
        <p role="status" className="mt-2 text-emerald-700">
          {mensaje}
        </p>
      )}
      {!data && <p className="mt-2 text-slate-500">Cargando bloques…</p>}
      {data && data.items.length === 0 && (
        <p className="mt-2 text-slate-600">
          Aún no hay bloques. Arme un capítulo y use «Guardar como bloque».
        </p>
      )}
      <ul className="mt-2 divide-y divide-borde">
        {(data?.items ?? []).map((b) => {
          const base = b.tamano ? Number(b.tamano) : 1;
          const escrito = tamanos[b.id] ?? qty(base);
          const valor = parseNum(escrito);
          const valido = Number.isFinite(valor) && valor > 0;
          // Por unidad y para el tamaño escrito, con el motor (la web no multiplica precios).
          const porUnidad = totalesBloque(data!, b, oferta.indirectos, new D(1).div(base)).ofertado;
          const total = valido
            ? totalesBloque(data!, b, oferta.indirectos, new D(String(valor)).div(base)).ofertado
            : null;
          return (
            <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="min-w-56 flex-1">
                <b>{b.nombre}</b>
                <span className="block text-xs text-slate-500">
                  {b.tamano
                    ? `≈ ${money(porUnidad)} por ${b.unidadTamano ?? 'unidad'}, con los indirectos de esta oferta`
                    : `${money(porUnidad)} con los indirectos de esta oferta`}
                </span>
              </span>
              <label className="flex items-center gap-1.5 text-slate-600">
                {b.tamano ? '¿Para cuántos?' : 'Veces'}
                <Input
                  aria-label={`Tamaño de «${b.nombre}» en esta oferta`}
                  inputMode="decimal"
                  value={escrito}
                  onChange={(e) => setTamanos((t) => ({ ...t, [b.id]: e.target.value }))}
                  className="h-7 w-20 text-right tabular-nums"
                />
                {b.tamano && <span className="w-6">{b.unidadTamano}</span>}
              </label>
              <span className="w-28 text-right tabular-nums">{total !== null && money(total)}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={!valido || anadir.isPending}
                onClick={() => anadir.mutate({ b, valor })}
              >
                <Plus aria-hidden />
                Añadir
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
