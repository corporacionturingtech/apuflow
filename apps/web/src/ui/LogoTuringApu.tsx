import isotipoClaro from '../assets/turing_apu_isotipo_claro.png';
import isotipoOscuro from '../assets/turing_apu_isotipo_oscuro.png';
import { cn } from '../lib/cn';

/**
 * Logo horizontal de Turing APU. El tamaño lo da `font-size` (p. ej. `text-xl`): el isotipo mide
 * la altura de las mayúsculas de Inter (0,727 em); con descriptor abarca las dos líneas (arranca
 * en el borde superior de las mayúsculas). La separación es 0,75 em, más que una letra.
 * `oscuro` es para fondos navy; `descriptor` agrega la línea «Análisis de precios unitarios».
 */
export function LogoTuringApu({
  variante = 'claro',
  descriptor = false,
  className,
}: {
  variante?: 'claro' | 'oscuro';
  descriptor?: boolean;
  className?: string;
}) {
  const oscuro = variante === 'oscuro';
  return (
    <span
      role="img"
      aria-label="Turing APU"
      className={cn('inline-flex items-start gap-[0.75em] leading-none', className)}
    >
      <img
        src={oscuro ? isotipoOscuro : isotipoClaro}
        alt=""
        aria-hidden
        className={cn('w-auto', descriptor ? 'h-[1.3em]' : 'h-[0.727em]')}
        style={{ marginTop: descriptor ? '-0.02em' : '0.135em' }}
      />
      <span className="flex flex-col">
        <span className="font-bold tracking-[0.04em]">
          <span className={oscuro ? 'text-white' : 'text-[#0F172A]'}>TURING</span>{' '}
          <span className="text-[#EA580C]">APU</span>
        </span>
        {descriptor && (
          <span
            className={cn(
              'mt-[0.45em] text-[0.42em] font-medium leading-tight',
              oscuro ? 'text-slate-300' : 'text-[#334155]',
            )}
          >
            Análisis de precios unitarios
          </span>
        )}
      </span>
    </span>
  );
}
