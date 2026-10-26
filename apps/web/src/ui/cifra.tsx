import type { LucideIcon } from 'lucide-react';
import { Card } from './card';

/** Cifra destacada (KPI) del Inicio y del panel de valor. */
export function Cifra({
  etiqueta,
  valor,
  nota,
  icono: Icono,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
  icono?: LucideIcon;
}) {
  return (
    <Card className="px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {Icono && <Icono aria-hidden className="size-4 text-primario" />}
        {etiqueta}
      </div>
      <div
        className="mt-1 text-2xl font-semibold tabular-nums text-slate-900"
        data-cifra={etiqueta}
      >
        {valor}
      </div>
      {nota && <div className="mt-0.5 text-xs text-slate-500">{nota}</div>}
    </Card>
  );
}
