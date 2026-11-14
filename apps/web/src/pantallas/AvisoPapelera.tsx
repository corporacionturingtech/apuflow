import { Undo2, X } from 'lucide-react';
import { Button } from '../ui/button';

/** Flota abajo a la derecha (como en Bloques): no empuja la tabla y ofrece deshacer. */
export function AvisoPapelera({
  descripcion,
  deshaciendo,
  alDeshacer,
  alCerrar,
}: {
  descripcion: string;
  deshaciendo: boolean;
  alDeshacer: () => void;
  alCerrar: () => void;
}) {
  return (
    <div
      role="status"
      className="aparecer fixed bottom-6 right-6 z-30 flex w-[min(32rem,calc(100vw-3rem))] items-center gap-2 rounded-lg border border-borde bg-white px-3 py-2.5 text-sm shadow-lg"
    >
      <p className="min-w-0 flex-1 leading-6">«{descripcion}» pasó a la papelera.</p>
      <Button size="sm" variant="outline" disabled={deshaciendo} onClick={alDeshacer}>
        <Undo2 aria-hidden />
        Deshacer
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Cerrar aviso" onClick={alCerrar}>
        <X aria-hidden />
      </Button>
    </div>
  );
}
