import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Check, Wrench } from 'lucide-react';
import type { HerramientaMenor as Hm, ListaInsumos } from 'tipos';
import { api, ErrorApi } from '../lib/api';
import { fmt, parseNum } from '../lib/formato';
import { Input } from '../ui/input';

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
  const [guardado, setGuardado] = useState(false);
  useEffect(() => {
    if (!guardado) return;
    const t = setTimeout(() => setGuardado(false), 2500);
    return () => clearTimeout(t);
  }, [guardado]);
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
      setGuardado(true);
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
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-borde bg-white px-3 py-2.5 text-sm shadow-xs">
      <Wrench className="size-4 shrink-0 text-slate-400" aria-hidden />
      <label htmlFor="hm" className="font-medium text-slate-800">
        Herramienta menor
      </label>
      <div className="flex items-center gap-1.5">
        <Input
          id="hm"
          inputMode="decimal"
          aria-describedby="hm-ayuda"
          value={mostrado}
          disabled={!puedeEscribir}
          onChange={(e) => {
            setTexto(e.target.value);
            setGuardado(false);
          }}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setTexto(null);
              setAviso('');
            }
          }}
          className="w-16 text-right tabular-nums"
        />
        <span className="text-slate-500">%</span>
      </div>
      <span id="hm-ayuda" className="text-slate-500">
        {puedeEscribir
          ? 'de la mano de obra de cada APU, sumado a sus equipos.'
          : 'de la mano de obra de cada APU. Solo un administrador o el rol Precios puede cambiarlo.'}
      </span>
      {guardado && (
        <span role="status" className="flex items-center gap-1 text-emerald-700">
          <Check className="size-4" aria-hidden />
          Guardado: los APUs ya usan el nuevo %
        </span>
      )}
      {aviso && (
        <span role="alert" className="text-red-800">
          {aviso}
        </span>
      )}
    </div>
  );
}
