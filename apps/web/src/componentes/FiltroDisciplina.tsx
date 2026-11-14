import { cn } from '../lib/cn';
import { colorDe } from '../lib/disciplina';

interface Props {
  /** Disciplina → cantidad de elementos. */
  conteo: Map<string, number>;
  total: number;
  valor: string;
  alCambiar: (d: string) => void;
}

/** Botones «Todas · Civil · Eléctrico…» con el color de cada disciplina y su cantidad. */
export function FiltroDisciplina({ conteo, total, valor, alCambiar }: Props) {
  if (conteo.size < 2) return null;
  return (
    <div role="group" aria-label="Filtrar por disciplina" className="flex flex-wrap gap-1.5">
      {[['', total] as const, ...conteo].map(([d, n]) => (
        <button
          key={d || 'todas'}
          type="button"
          aria-pressed={valor === d}
          onClick={() => alCambiar(d)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primario/40',
            valor === d
              ? 'border-primario bg-primario/10 font-medium text-primario'
              : 'border-borde bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          {d && (
            <span aria-hidden className="size-2 rounded-full" style={{ background: colorDe(d) }} />
          )}
          {d || 'Todas'}
          <span className="tabular-nums text-slate-400">{n}</span>
        </button>
      ))}
    </div>
  );
}
