import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Insumo, ListaInsumos, TipoInsumo } from 'tipos';
import { api, ErrorApi } from '../lib/api';
import { money } from '../lib/formato';

export const clavePapelera = (tipo: TipoInsumo) => ['papelera', tipo] as const;

export function PapeleraInsumos({
  tipo,
  puedeEscribir,
}: {
  tipo: TipoInsumo;
  puedeEscribir: boolean;
}) {
  const cliente = useQueryClient();
  const [aviso, setAviso] = useState('');
  const { data } = useQuery({
    queryKey: clavePapelera(tipo),
    queryFn: () => api<ListaInsumos>(`/api/insumos?tipo=${tipo}&papelera=true`),
  });
  const restaurar = useMutation({
    mutationFn: (i: Insumo) =>
      api<Insumo>(`/api/insumos/${i.id}/restaurar`, {
        metodo: 'POST',
        cuerpo: { version: i.version },
      }),
    onSuccess: () => setAviso(''),
    onError: (e) => setAviso(e instanceof ErrorApi ? e.message : 'No pudimos restaurarlo.'),
    onSettled: () => {
      void cliente.invalidateQueries({ queryKey: clavePapelera(tipo) });
      void cliente.invalidateQueries({ queryKey: ['insumos', tipo] });
    },
  });

  const items = data?.items ?? [];
  return (
    <div aria-label="Papelera" role="region" className="rounded border border-slate-300 bg-white">
      {aviso && (
        <p role="alert" className="bg-red-50 px-3 py-1 text-sm text-red-800">
          {aviso}
        </p>
      )}
      {!items.length && <p className="p-3 text-sm text-slate-500">La papelera está vacía.</p>}
      <ul className="divide-y divide-slate-200 text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-4 px-3 py-1.5">
            <span className="w-28 font-mono">{i.codigo}</span>
            <span className="flex-1">{i.descripcion}</span>
            <span className="w-24 text-right">{money(Number(i.pu))}</span>
            {puedeEscribir && (
              <button
                type="button"
                onClick={() => restaurar.mutate(i)}
                className="rounded border border-slate-300 px-2 py-0.5"
              >
                Restaurar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
