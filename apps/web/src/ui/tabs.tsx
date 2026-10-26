import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react';
import * as Primitivo from '@radix-ui/react-tabs';
import { cn } from '../lib/cn';

export const Tabs = Primitivo.Root;

export const TabsList = forwardRef<
  ComponentRef<typeof Primitivo.List>,
  ComponentPropsWithoutRef<typeof Primitivo.List>
>(({ className, ...props }, ref) => (
  <Primitivo.List
    ref={ref}
    className={cn('flex items-center gap-1 border-b border-borde', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

// La pestaña activa se subraya con el acento de la empresa, sin teñir el fondo.
export const TabsTrigger = forwardRef<
  ComponentRef<typeof Primitivo.Trigger>,
  ComponentPropsWithoutRef<typeof Primitivo.Trigger>
>(({ className, ...props }, ref) => (
  <Primitivo.Trigger
    ref={ref}
    className={cn(
      '-mb-px inline-flex h-9 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primario/40 data-[state=active]:border-primario data-[state=active]:text-slate-900 [&_svg]:size-4 [&_svg]:shrink-0',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<
  ComponentRef<typeof Primitivo.Content>,
  ComponentPropsWithoutRef<typeof Primitivo.Content>
>(({ className, ...props }, ref) => (
  <Primitivo.Content ref={ref} className={cn('outline-none', className)} {...props} />
));
TabsContent.displayName = 'TabsContent';
