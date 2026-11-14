import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { Card } from './card';

/** Cifra destacada (KPI) del Inicio y del panel de valor. */
export function Cifra({
  etiqueta,
  valor,
  nota,
  icono: Icono,
  destacada,
  className,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
  icono?: LucideIcon;
  /** La cifra que justifica la licencia: más grande y en color de acento. */
  destacada?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'min-w-0 px-3 py-3 sm:px-4',
        destacada && 'border-primario/40 bg-primario/5 ring-1 ring-primario/15',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {Icono && <Icono aria-hidden className="hidden size-4 shrink-0 text-primario sm:block" />}
        <span className="min-w-0">{etiqueta}</span>
      </div>
      <div
        className={cn(
          'mt-1 font-semibold tabular-nums',
          destacada ? 'text-3xl text-primario' : 'text-2xl text-slate-900',
        )}
        data-cifra={etiqueta}
      >
        {valor}
      </div>
      {nota && <div className="mt-0.5 text-xs text-slate-500">{nota}</div>}
    </Card>
  );
}
