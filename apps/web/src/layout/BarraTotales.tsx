import { useEffect, useRef, useState } from 'react';
import { CircleCheck, TrendingDown, TrendingUp, Target } from 'lucide-react';
import { money } from '../lib/formato';
import { cn } from '../lib/cn';
import { useTotales, type Totales } from './totales';

interface Props {
  subtotal?: number;
  iva?: number;
  total?: number;
}

const DURACION_VARIACION = 4000;

/** Regla UX 1: el total siempre a la vista. Muestra la oferta abierta; en cero si no hay. */
export function BarraTotales(props: Props) {
  const abierta = useTotales();
  const { subtotal = 0, iva = 0, total = 0, brecha } = { ...abierta, ...props } as Totales;
  const variacion = useVariacion(abierta ? total : null);
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 flex h-12 items-center justify-end gap-3 border-t border-borde bg-white/95 px-3 md:left-56 md:gap-6 md:px-6 shadow-[0_-4px_12px_-6px_rgb(15_23_42/0.08)] backdrop-blur">
      {brecha && (
        <div
          className={cn(
            'mr-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
            brecha.llego
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-red-50 text-red-700 ring-red-200',
          )}
        >
          {brecha.llego ? (
            <CircleCheck className="size-3.5" aria-hidden />
          ) : (
            <Target className="size-3.5" aria-hidden />
          )}
          <span>Brecha</span>
          <span className="font-semibold tabular-nums">
            {brecha.llego ? `Dentro por ${money(-brecha.valor)}` : `Faltan ${money(brecha.valor)}`}
          </span>
        </div>
      )}
      <div className="hidden items-baseline gap-6 md:flex">
        <Cifra etiqueta="Subtotal" valor={subtotal} />
        <Cifra etiqueta="IVA" valor={iva} />
      </div>
      <div className="flex items-baseline gap-2 md:border-l md:border-borde md:pl-6">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total</span>
        <span className="text-lg font-semibold tabular-nums tracking-tight">{money(total)}</span>
        {variacion !== null && (
          <span
            key={variacion}
            role="status"
            className={cn(
              'aparecer flex items-center gap-0.5 self-center rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
              variacion > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700',
            )}
          >
            {variacion > 0 ? (
              <TrendingUp className="size-3" aria-hidden />
            ) : (
              <TrendingDown className="size-3" aria-hidden />
            )}
            {variacion > 0 ? '+' : '−'}
            {money(Math.abs(variacion))}
          </span>
        )}
      </div>
    </footer>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-slate-500">{etiqueta}</span>
      <span className="text-sm font-medium tabular-nums text-slate-700">{money(valor)}</span>
    </div>
  );
}

/** Diferencia del total tras un cambio, visible unos segundos; abrir otra oferta no cuenta. */
function useVariacion(total: number | null) {
  const anterior = useRef(total);
  const [variacion, setVariacion] = useState<number | null>(null);
  useEffect(() => {
    const previo = anterior.current;
    anterior.current = total;
    if (previo === null || total === null) {
      setVariacion(null);
      return;
    }
    const d = Math.round((total - previo) * 100) / 100;
    if (d === 0) return;
    setVariacion(d);
    const t = setTimeout(() => setVariacion(null), DURACION_VARIACION);
    return () => clearTimeout(t);
  }, [total]);
  return variacion;
}
