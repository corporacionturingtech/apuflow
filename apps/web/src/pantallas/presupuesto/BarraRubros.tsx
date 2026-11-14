import { useState, type RefObject } from 'react';
import { Blocks, FolderPlus, Loader2, Plus, Save } from 'lucide-react';
import { Atajos } from '../../componentes/Atajos';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

const ATAJOS: [string, string][] = [
  ['F2 / Enter', 'Editar la celda'],
  ['Tab', 'Guardar y pasar a la derecha'],
  ['Esc', 'Cancelar la edición'],
  ['Alt+A', 'Editar el APU del rubro (o doble clic en la descripción)'],
  ['Supr', 'Quitar el rubro'],
];

interface Props {
  sinCapitulos: boolean;
  sinRubros: boolean;
  anadiendoCapitulo: boolean;
  /** El estado vacío de la oferta lleva aquí al usuario con «Crear un capítulo». */
  campoCapitulo: RefObject<HTMLInputElement | null>;
  alAnadirRubro: () => void;
  alAnadirBloque: () => void;
  alGuardarBloque: () => void;
  alAnadirCapitulo: (nombre: string) => void;
}

export function BarraRubros({
  sinCapitulos,
  sinRubros,
  anadiendoCapitulo,
  campoCapitulo,
  alAnadirRubro,
  alAnadirBloque,
  alGuardarBloque,
  alAnadirCapitulo,
}: Props) {
  const [nombre, setNombre] = useState('');
  const [faltaNombre, setFaltaNombre] = useState(false);
  function anadirCap() {
    const n = nombre.trim();
    if (!n) {
      setFaltaNombre(true);
      campoCapitulo.current?.focus();
      return;
    }
    alAnadirCapitulo(n);
    setNombre('');
  }
  const botonRubro = (
    <Button variant="outline" disabled={sinCapitulos} onClick={alAnadirRubro}>
      <Plus aria-hidden />
      Añadir rubro
    </Button>
  );
  return (
    <div className="mt-3 flex flex-wrap items-start gap-2">
      <Button onClick={alAnadirBloque}>
        <Blocks aria-hidden />
        Añadir bloque
      </Button>
      {sinCapitulos ? (
        // Un botón deshabilitado no recibe el mouse: el tooltip va en un envoltorio enfocable.
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="rounded-md">
              {botonRubro}
            </span>
          </TooltipTrigger>
          <TooltipContent>Primero cree un capítulo: los rubros van dentro de uno.</TooltipContent>
        </Tooltip>
      ) : (
        botonRubro
      )}
      <Button variant="outline" disabled={sinRubros} onClick={alGuardarBloque}>
        <Save aria-hidden />
        Guardar como bloque
      </Button>
      <span className="mx-1 mt-1.5 h-5 w-px bg-borde" aria-hidden />
      <div className="w-full sm:w-52">
        <Input
          ref={campoCapitulo}
          aria-label="Nombre del capítulo nuevo"
          aria-invalid={faltaNombre || undefined}
          aria-describedby={faltaNombre ? 'capitulo-falta-nombre' : undefined}
          placeholder="Nombre del capítulo"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            if (e.target.value.trim()) setFaltaNombre(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && anadirCap()}
          className={
            faltaNombre
              ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20'
              : undefined
          }
        />
        {faltaNombre && (
          <p id="capitulo-falta-nombre" role="alert" className="mt-1 text-xs text-red-700">
            Escriba el nombre del capítulo.
          </p>
        )}
      </div>
      <Button variant="outline" disabled={anadiendoCapitulo} onClick={anadirCap}>
        {anadiendoCapitulo ? (
          <Loader2 aria-hidden className="animate-spin" />
        ) : (
          <FolderPlus aria-hidden />
        )}
        {anadiendoCapitulo ? 'Añadiendo…' : 'Añadir capítulo'}
      </Button>
      <div className="ml-auto">
        <Atajos atajos={ATAJOS} />
      </div>
    </div>
  );
}
