import { Keyboard } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

/** Atajos de una tabla tipo Excel, a mano pero sin ocupar la barra. */
export function Atajos({ atajos }: { atajos: [tecla: string, accion: string][] }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Atajos de teclado">
          <Keyboard aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent align="end">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3">
          {atajos.map(([tecla, accion]) => (
            <div key={tecla} className="contents">
              <dt>
                <kbd className="rounded bg-white/10 px-1 font-sans font-medium">{tecla}</kbd>
              </dt>
              <dd>{accion}</dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}
