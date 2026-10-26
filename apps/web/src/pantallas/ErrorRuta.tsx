import { Link } from '@tanstack/react-router';
import { CircleAlert, MapPinOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Vacio } from '../ui/estado';

const volver = (
  <Button asChild>
    <Link to="/">Volver al inicio</Link>
  </Button>
);

/** Reemplaza la pantalla en inglés de TanStack («Something went wrong!»). */
export function ErrorRuta({ reset }: { reset?: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-lg p-4">
      <Vacio
        icono={CircleAlert}
        titulo="No pudimos mostrar esta pantalla"
        acciones={
          <>
            {volver}
            <Button variant="outline" onClick={() => (reset ? reset() : location.reload())}>
              Intentar de nuevo
            </Button>
          </>
        }
      >
        Sus datos están a salvo. Intente de nuevo o vuelva al inicio.
      </Vacio>
    </div>
  );
}

export function NoEncontrada() {
  return (
    <div className="mx-auto mt-16 max-w-lg p-4">
      <Vacio icono={MapPinOff} titulo="Esta página no existe" acciones={volver}>
        Puede que el enlace esté incompleto o que la página se haya movido.
      </Vacio>
    </div>
  );
}
