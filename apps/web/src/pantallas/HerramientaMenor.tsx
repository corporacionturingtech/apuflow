import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { HerramientaMenor as Hm, ListaInsumos } from 'tipos';
import { api, ErrorApi } from '../lib/api';
import { fmt, parseNum } from '../lib/formato';

// % de la mano de obra que se suma a equipos (modelo-calculo.md); vive junto a la lista de Equipos.
export function HerramientaMenor({
  valor,
  puedeEscribir,
  clave,
}: {
  valor: Hm;
  puedeEscribir: boolean;
  clave: readonly unknown[];
}) {
  const cliente = useQueryClient();
  const [texto, setTexto] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const mostrado = texto ?? fmt(Number(valor.pct), 0, 4);

  const guardar = useMutation({
    mutationFn: (pct: string) =>
      api<Hm>('/api/herramienta-menor', {
        metodo: 'PATCH',
        cuerpo: { version: valor.version, pct },
      }),
    onSuccess: (hm) => {
      setAviso('');
      setTexto(null);
      cliente.setQueriesData<ListaInsumos>(
        { queryKey: clave },
        (l) => l && { ...l, herramientaMenor: hm },
      );
    },
    onError: (e) => {
      setAviso(e instanceof ErrorApi ? e.message : 'No pudimos guardar el porcentaje.');
      setTexto(null);
      void cliente.invalidateQueries({ queryKey: clave });
    },
  });

  function confirmar() {
    if (texto === null) return;
    const n = parseNum(texto);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setAviso('Escriba un porcentaje entre 0 y 100, por ejemplo 5');
      return;
    }
    if (n === Number(valor.pct)) return setTexto(null);
    guardar.mutate(String(n));
  }

  return (
    <div className="mt-3 flex items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <label htmlFor="hm">Herramienta menor (% de la mano de obra)</label>
      <input
        id="hm"
        inputMode="decimal"
        value={mostrado}
        disabled={!puedeEscribir}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setTexto(null);
            setAviso('');
          }
        }}
        className="w-20 rounded border border-slate-300 px-2 py-1 text-right"
      />
      <span>%</span>
      {aviso && (
        <span role="alert" className="text-red-800">
          {aviso}
        </span>
      )}
    </div>
  );
}
