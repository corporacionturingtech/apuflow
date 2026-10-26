import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react';
import * as Primitivo from '@radix-ui/react-tooltip';
import { cn } from '../lib/cn';

/** Cada tooltip trae su propio Provider: no hace falta envolver la app. */
export function Tooltip(props: ComponentPropsWithoutRef<typeof Primitivo.Root>) {
  return (
    <Primitivo.Provider delayDuration={200}>
      <Primitivo.Root {...props} />
    </Primitivo.Provider>
  );
}

export const TooltipTrigger = Primitivo.Trigger;

export const TooltipContent = forwardRef<
  ComponentRef<typeof Primitivo.Content>,
  ComponentPropsWithoutRef<typeof Primitivo.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <Primitivo.Portal>
    <Primitivo.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'aparecer z-50 max-w-xs rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-5 text-slate-100 shadow-md',
        className,
      )}
      {...props}
    />
  </Primitivo.Portal>
));
TooltipContent.displayName = 'TooltipContent';
