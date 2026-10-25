import { money } from '../lib/formato';

interface Props {
  subtotal?: number;
  iva?: number;
  total?: number;
}

/** Regla UX 1: el total siempre a la vista. Vacía hasta F1-04. */
export function BarraTotales({ subtotal = 0, iva = 0, total = 0 }: Props) {
  const celdas = [
    ['Subtotal', subtotal],
    ['IVA', iva],
    ['Total', total],
  ] as const;
  return (
    <footer className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-end gap-8 border-t border-slate-300 bg-white px-6 py-2 text-sm">
      {celdas.map(([etiqueta, valor]) => (
        <div key={etiqueta} className="flex items-baseline gap-2">
          <span className="text-slate-500">{etiqueta}</span>
          <span className="font-semibold tabular-nums">{money(valor)}</span>
        </div>
      ))}
    </footer>
  );
}
