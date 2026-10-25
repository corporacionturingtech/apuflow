import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ImpactoPrecio } from 'tipos';
import { api } from '../lib/api';
import { fmt, money, sgn } from '../lib/formato';

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
    <div role="status" className="mb-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
      <div className="flex items-start gap-3">
        <p className="flex-1">
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
            aria-expanded={detalle}
            onClick={() => setDetalle((v) => !v)}
            className="font-medium text-blue-700 underline"
          >
            Ver qué cambió
          </button>
        )}
        {alDeshacer && (
          <button
            type="button"
            disabled={deshaciendo}
            onClick={alDeshacer}
            className="font-medium text-blue-700 underline disabled:opacity-50"
          >
            Deshacer
          </button>
        )}
        <button type="button" aria-label="Cerrar" onClick={alCerrar} className="text-slate-500">
          ×
        </button>
      </div>
      {detalle && data && (
        <ul className="mt-2 space-y-1">
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
