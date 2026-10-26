import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const variantesBadge = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutro: 'bg-slate-50 text-slate-700 ring-slate-200',
        exito: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        peligro: 'bg-red-50 text-red-700 ring-red-200',
        aviso: 'bg-amber-50 text-amber-800 ring-amber-200',
        primario: 'bg-primario/10 text-primario ring-primario/25',
      },
    },
    defaultVariants: { variant: 'neutro' },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof variantesBadge>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(variantesBadge({ variant }), className)} {...props} />;
}
