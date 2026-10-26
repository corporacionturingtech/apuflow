import { useEffect, useRef, useState } from 'react';

/** Editor en línea de una celda: Enter baja, Tab avanza, Esc cancela. */
export function EditorCelda({
  inicial,
  alinear,
  alCancelar,
  alConfirmar,
}: {
  inicial: string;
  alinear?: 'der';
  alCancelar: () => void;
  alConfirmar: (texto: string, df: number, dc: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(inicial);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.setSelectionRange(inicial.length, inicial.length);
  }, []);
  return (
    <input
      ref={ref}
      aria-label="Editar celda"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={alCancelar}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') alCancelar();
        else if (e.key === 'Enter') {
          e.preventDefault();
          alConfirmar(texto, 1, 0);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          alConfirmar(texto, 0, e.shiftKey ? -1 : 1);
        }
      }}
      className={`-my-1 h-7 w-full bg-white outline-none ${alinear ? 'text-right' : ''}`}
    />
  );
}
