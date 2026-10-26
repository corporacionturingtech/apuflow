import { useState } from 'react';
import { FolderPlus, Plus, Save } from 'lucide-react';
import { Atajos } from '../../componentes/Atajos';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

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
  alAnadirRubro: () => void;
  alGuardarBloque: () => void;
  alAnadirCapitulo: (nombre: string) => void;
}

export function BarraRubros({
  sinCapitulos,
  sinRubros,
  alAnadirRubro,
  alGuardarBloque,
  alAnadirCapitulo,
}: Props) {
  const [nombre, setNombre] = useState('');
  function anadirCap() {
    const n = nombre.trim();
    if (!n) return;
    alAnadirCapitulo(n);
    setNombre('');
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button disabled={sinCapitulos} onClick={alAnadirRubro}>
        <Plus aria-hidden />
        Añadir rubro
      </Button>
      <Button variant="outline" disabled={sinRubros} onClick={alGuardarBloque}>
        <Save aria-hidden />
        Guardar como bloque
      </Button>
      <span className="mx-1 h-5 w-px bg-borde" aria-hidden />
      <Input
        aria-label="Nombre del capítulo nuevo"
        placeholder="Nombre del capítulo"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && anadirCap()}
        className="w-52"
      />
      <Button variant="outline" onClick={anadirCap}>
        <FolderPlus aria-hidden />
        Añadir capítulo
      </Button>
      <div className="ml-auto">
        <Atajos atajos={ATAJOS} />
      </div>
    </div>
  );
}
