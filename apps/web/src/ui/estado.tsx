import type { ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

/** Mientras llega una consulta: nunca una pantalla en blanco (ux.md, regla 9). */
export function Cargando({
  texto = 'Cargando…',
  className,
}: {
  texto?: string;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={cn('flex items-center gap-2 py-6 text-sm text-slate-500', className)}
    >
      <Loader2 aria-hidden className="size-4 animate-spin" />
      {texto}
    </p>
  );
}

/** Lista sin datos: dice qué falta y ofrece el siguiente paso. */
export function Vacio({
  icono: Icono,
  titulo,
  children,
  acciones,
  className,
}: {
  icono?: LucideIcon;
  titulo: string;
  children?: ReactNode;
  acciones?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed border-borde bg-white px-6 py-8 text-center',
        className,
      )}
    >
      {Icono && <Icono aria-hidden className="size-6 text-slate-400" />}
      <p className="font-medium text-slate-800">{titulo}</p>
      {children && <div className="max-w-md text-sm text-slate-500">{children}</div>}
      {acciones && <div className="mt-2 flex flex-wrap justify-center gap-2">{acciones}</div>}
    </div>
  );
}
