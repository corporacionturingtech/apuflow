import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** `<select>` nativo con el aspecto de `Input` (accesible y sin dependencias). */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-8 rounded-md border border-borde bg-white px-2 text-sm shadow-xs transition-colors focus-visible:border-primario focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primario/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';
