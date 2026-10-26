import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-8 w-full rounded-md border border-borde bg-white px-2.5 text-sm shadow-xs transition-colors placeholder:text-slate-400 focus-visible:border-primario focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primario/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
