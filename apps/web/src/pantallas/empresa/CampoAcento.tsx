import { Check } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { cn } from '../../lib/cn';
import { Input } from '../../ui/input';

const SUGERIDOS = [
  { color: '#2563eb', nombre: 'Azul' },
  { color: '#4f46e5', nombre: 'Índigo' },
  { color: '#0d9488', nombre: 'Verde azulado' },
  { color: '#059669', nombre: 'Verde' },
  { color: '#ea580c', nombre: 'Naranja' },
  { color: '#dc2626', nombre: 'Rojo' },
  { color: '#475569', nombre: 'Gris pizarra' },
];

const HEX = /^#?([0-9a-fA-F]{6})$/;

/** Color de acento: sugeridos, uno propio y su código, con una muestra de cómo se verá. */
export function CampoAcento({
  acento,
  onCambio,
}: {
  acento: string;
  onCambio: (color: string) => void;
}) {
  const [texto, setTexto] = useState(acento);
  const [tocado, setTocado] = useState(false);
  useEffect(() => setTexto(acento), [acento]);
  const valido = HEX.test(texto);
  const propio = !SUGERIDOS.some((s) => s.color === acento.toLowerCase());

  return (
    <div className="sm:col-span-2">
      <span id="emp-acento" className="text-sm font-medium text-slate-700">
        Color de acento
      </span>
      <div
        role="group"
        aria-labelledby="emp-acento"
        className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-3"
      >
        <div className="flex items-center gap-1.5">
          {SUGERIDOS.map((s) => {
            const activo = s.color === acento.toLowerCase();
            return (
              <button
                key={s.color}
                type="button"
                aria-label={s.nombre}
                aria-pressed={activo}
                title={s.nombre}
                onClick={() => onCambio(s.color)}
                style={{ backgroundColor: s.color }}
                className={cn(
                  'grid size-7 place-items-center rounded-full text-white transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
                  activo && 'ring-2 ring-slate-900 ring-offset-2',
                )}
              >
                {activo && <Check className="size-4" aria-hidden />}
              </button>
            );
          })}
          <label
            title="Otro color"
            className={cn(
              'relative grid size-7 cursor-pointer place-items-center rounded-full bg-[conic-gradient(#ef4444,#f59e0b,#22c55e,#06b6d4,#3b82f6,#a855f7,#ef4444)] focus-within:ring-2 focus-within:ring-slate-400 focus-within:ring-offset-2',
              propio && 'ring-2 ring-slate-900 ring-offset-2',
            )}
          >
            <input
              type="color"
              aria-label="Otro color"
              className="sr-only"
              value={valido ? acento : '#2563eb'}
              onChange={(e) => onCambio(e.target.value)}
            />
          </label>
        </div>
        <div>
          <Input
            aria-label="Código del color"
            aria-invalid={tocado && !valido}
            className="w-24 font-mono uppercase"
            maxLength={7}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              const m = HEX.exec(e.target.value.trim());
              if (m) onCambio(`#${m[1]!.toLowerCase()}`);
            }}
            onBlur={() => setTocado(true)}
          />
        </div>
        <div
          aria-hidden
          style={{ '--acento': acento } as CSSProperties}
          className="flex items-center gap-3 rounded-md border border-borde bg-slate-50 px-3 py-1.5 text-sm"
        >
          <span className="text-xs text-slate-500">Así se verá:</span>
          <span className="inline-flex h-7 items-center rounded-md bg-primario px-2.5 text-xs font-medium text-white">
            Guardar
          </span>
          <span className="text-primario underline underline-offset-4">Enlace</span>
          <span className="border-b-2 border-primario pb-0.5 text-xs font-medium text-slate-900">
            Pestaña
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {tocado && !valido ? (
          <span className="text-red-700">Escriba el código como #2563EB.</span>
        ) : (
          'Pinta botones principales, enlaces, pestañas y la marca de la página actual en el menú.'
        )}
      </p>
    </div>
  );
}
