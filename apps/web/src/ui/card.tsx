import type { HTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../lib/cn';

export function Card({
  className,
  asChild,
  ...props
}: HTMLAttributes<HTMLElement> & {
  /** Aplica el estilo al hijo (p. ej. un `<section>` con su `aria-label`). */
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      className={cn('rounded-lg border border-borde bg-white shadow-xs', className)}
      {...props}
    />
  );
}
