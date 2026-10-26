import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Undo2, X, Zap } from 'lucide-react';
import type { ImpactoPrecio } from 'tipos';
import { api } from '../lib/api';
import { fmt, money, sgn } from '../lib/formato';
import { variantesBoton } from '../ui/button';

export interface CambioPrecio {
  insumoId: string;
  descripcion: string;
  puAnterior: string;
  puNuevo: string;
}

/** "Se actualizó solo": qué pasó en las ofertas al cambiar un precio (regla 2 de ux.md). */
export function PanelImpacto({
  cambio,
  alCerrar,
  alDeshacer,
  deshaciendo = false,
}: {
  cambio: CambioPrecio;
  alCerrar: () => void;
  alDeshacer?: () => void;
  deshaciendo?: boolean;
}) {
  const [detalle, setDetalle] = useState(false);
  const { data, error } = useQuery({
    queryKey: ['impacto', cambio.insumoId, cambio.puAnterior, cambio.puNuevo],
    queryFn: async () => {
      const t0 = performance.now();
      const d = await api<ImpactoPrecio>(
        `/api/insumos/${cambio.insumoId}/impacto?puAnterior=${cambio.puAnterior}`,
      );
      return { d, ms: performance.now() - t0 };
    },
    staleTime: Infinity,
  });

  const titulo = `${cambio.descripcion} pasó de ${money(Number(cambio.puAnterior))} a ${money(Number(cambio.puNuevo))}.`;
  return (
    <div
      role="status"
      // Flota sobre la barra de totales: avisa sin empujar la tabla que se está editando.
      className="aparecer fixed bottom-16 right-6 z-30 w-[min(36rem,calc(100vw-17rem))] rounded-lg border border-primario/25 bg-white px-3 py-2.5 text-sm shadow-lg ring-4 ring-primario/5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primario/10 text-primario">
          <Zap className="size-3.5" aria-hidden />
        </span>
        <p className="flex-1 leading-6">
          {titulo} {error && 'No pudimos calcular el efecto en las ofertas.'}
          {!data && !error && 'Calculando el efecto en las ofertas…'}
          {data &&
            (data.d.rubros === 0
              ? 'Ninguna oferta usa este precio todavía.'
              : `Afectó ${data.d.apus} APUs, ${data.d.rubros} rubros, ${sgn(Number(data.d.diferencia))}. Recalculado en ${fmt(data.ms, 0, 0)} ms.`)}
        </p>
        {data && data.d.rubros > 0 && (
          <button
            type="button"
            data-guia="ver-cambio"
            aria-expanded={detalle}
            onClick={() => setDetalle((v) => !v)}
            className={variantesBoton({ variant: 'outline', size: 'sm' })}
          >
            Ver qué cambió
          </button>
        )}
        {alDeshacer && (
          <button
            type="button"
            disabled={deshaciendo}
            onClick={alDeshacer}
            className={variantesBoton({ variant: 'outline', size: 'sm' })}
          >
            <Undo2 aria-hidden />
            Deshacer
          </button>
        )}
        <button
          type="button"
          aria-label="Cerrar"
          onClick={alCerrar}
          className={variantesBoton({ variant: 'ghost', size: 'icon-sm' })}
        >
          <X aria-hidden />
        </button>
      </div>
      {detalle && data && (
        <ul className="ml-9 mt-2 max-h-48 space-y-1 overflow-y-auto border-t border-borde pt-2 text-slate-600">
          {data.d.ofertas.map((o) => (
            <li key={o.id}>
              <b>{o.nombre}</b>: {o.apus} APUs, {o.rubros} rubros · subtotal{' '}
              <s>{money(Number(o.antes))}</s> → <b>{money(Number(o.despues))}</b> (
              {sgn(Number(o.despues) - Number(o.antes))})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
