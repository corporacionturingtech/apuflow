import { Link } from '@tanstack/react-router';
import { ArrowLeft, FileUp, Plus, Search, Trash2, X } from 'lucide-react';
import { Atajos } from '../componentes/Atajos';
import { fmt } from '../lib/formato';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { ConfigLista } from './configListas';

const ATAJOS_LECTURA: [string, string][] = [
  ['Flechas', 'Moverse por la tabla'],
  ['Alt+H', 'Historial del precio'],
];
const ATAJOS: [string, string][] = [
  ['F2 / Enter', 'Editar la celda'],
  ['Esc', 'Cancelar la edición'],
  ['Supr', 'Mandar a la papelera'],
  ['Ctrl+Z', 'Deshacer el último precio'],
  ...ATAJOS_LECTURA,
];

export const BotonAgregar = ({
  config,
  alAgregar,
}: {
  config: ConfigLista;
  alAgregar: () => void;
}) => (
  <Button onClick={alAgregar}>
    <Plus aria-hidden />
    Agregar {config.singular}
  </Button>
);

export const BotonImportar = () => (
  <Button variant="outline" asChild>
    <Link to="/importar/precios">
      <FileUp aria-hidden />
      Importar precios
    </Link>
  </Button>
);

interface Props {
  config: ConfigLista;
  busqueda: string;
  alBuscar: (q: string) => void;
  alIrATabla: () => void;
  /** null mientras carga: no se muestra el contador. */
  conteo: { total: number; cuantos: number; factor: number } | null;
  verPapelera: boolean;
  nBorrados: number;
  alAlternarPapelera: () => void;
  puedeEscribir: boolean;
  alAgregar: () => void;
}

/** Título, buscador, contador «x de y» y acciones; en la papelera solo título y «Volver». */
export function BarraLista(p: Props) {
  const { config, conteo } = p;
  const filtrando = p.busqueda.trim() !== '';
  const n = (v: number) => fmt(v, 0, 0);
  return (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-semibold tracking-tight">
          {p.verPapelera ? `Papelera de ${config.titulo.toLowerCase()}` : config.titulo}
        </h1>
        {!p.verPapelera && (
          <>
            <div className="relative w-full sm:w-80">
              <Search
                className="pointer-events-none absolute left-2 top-2 size-4 text-slate-400"
                aria-hidden
              />
              <Input
                type="search"
                aria-label={config.buscar}
                placeholder="Código, descripción o sección"
                value={p.busqueda}
                onChange={(e) => p.alBuscar(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') p.alBuscar('');
                  if (e.key === 'Enter' || e.key === 'ArrowDown') p.alIrATabla();
                }}
                className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
              />
              {filtrando && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Limpiar búsqueda"
                  className="absolute right-0.5 top-0.5"
                  onClick={() => p.alBuscar('')}
                >
                  <X aria-hidden />
                </Button>
              )}
            </div>
            {conteo && (
              <span aria-live="polite" className="text-sm tabular-nums text-slate-500">
                {filtrando
                  ? `${n(conteo.cuantos)} de ${n(conteo.total)} ${config.plural}`
                  : `${n(conteo.total)} ${config.plural}`}
              </span>
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {(p.verPapelera || p.nBorrados > 0) && (
            <Button
              variant={p.verPapelera ? 'outline' : 'ghost'}
              aria-pressed={p.verPapelera}
              onClick={p.alAlternarPapelera}
            >
              {p.verPapelera ? <ArrowLeft aria-hidden /> : <Trash2 aria-hidden />}
              {p.verPapelera ? 'Volver a la lista' : `Papelera (${p.nBorrados})`}
            </Button>
          )}
          {!p.verPapelera && <Atajos atajos={p.puedeEscribir ? ATAJOS : ATAJOS_LECTURA} />}
          {p.puedeEscribir && !p.verPapelera && (
            <>
              <BotonImportar />
              <BotonAgregar config={config} alAgregar={p.alAgregar} />
            </>
          )}
        </div>
      </div>
      <p className="mb-3 text-sm text-slate-600">
        {p.verPapelera
          ? 'Lo que mande a la papelera queda aquí: puede restaurarlo con su precio.'
          : 'Cambie un P.U. y los APUs y ofertas que lo usan se recalculan solos.'}
        {!p.verPapelera &&
          config.conFactor &&
          conteo &&
          ` «P.U. × factor» es el costo que entra al APU (factor ${fmt(conteo.factor, 2, 4)}).`}
      </p>
    </>
  );
}
