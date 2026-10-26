import { Link } from '@tanstack/react-router';
import { ChevronLeft, GitCompareArrows, Percent, Table2, Target } from 'lucide-react';
import type { OfertaDetalle } from 'tipos';
import type { Presente } from '../../lib/useEventosOferta';
import { cn } from '../../lib/cn';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { TabsList, TabsTrigger } from '../../ui/tabs';
import { BotonExportar } from './BotonExportar';

export type Pestana = 'rubros' | 'indirectos' | 'objetivo' | 'versiones';

interface Props {
  data: OfertaDetalle;
  presentes: Presente[];
  ofertado: boolean;
  alCambiarVista: (ofertado: boolean) => void;
}

// Nivel 1: qué oferta es y qué se hace con ella. Nivel 2: pestañas y cómo ver las cifras.
export function Encabezado({ data, presentes, ofertado, alCambiarVista }: Props) {
  const publico = data.tipo === 'publico';
  return (
    <header>
      <Button variant="link" size="sm" asChild className="text-slate-500">
        <Link to="/ofertas">
          <ChevronLeft aria-hidden />
          Todas las ofertas
        </Link>
      </Button>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{data.nombre}</h1>
        <Badge variant={data.estado === 'emitida' ? 'exito' : 'neutro'}>
          {data.estado === 'emitida' ? 'Emitida' : 'Borrador'}
        </Badge>
        <span className="text-sm text-slate-500">
          {data.cliente ?? 'Sin cliente'} · {publico ? 'Oferta pública (SERCOP)' : 'Oferta privada'}{' '}
          · {data.rubros.length} rubros
        </span>
        <div className="ml-auto">
          <BotonExportar ofertaId={data.id} nombre={data.nombre} />
        </div>
      </div>
      {presentes.length > 0 && (
        <ul aria-label="Quién más está en la oferta" className="mt-1.5 flex flex-wrap gap-1.5">
          {presentes.map((p) => (
            <li key={p.usuarioId}>
              <Badge variant="exito">
                {p.nombre}
                {p.disciplina ? ` (${p.disciplina})` : ''} está
                {p.capitulo ? ` en el capítulo «${p.capitulo}»` : ' en esta oferta'}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-end justify-between gap-3 border-b border-borde">
        <TabsList className="border-b-0">
          <TabsTrigger value="rubros">
            <Table2 aria-hidden />
            Rubros
          </TabsTrigger>
          <TabsTrigger value="indirectos" data-guia="btn-indirectos">
            <Percent aria-hidden />
            Indirectos y utilidad
          </TabsTrigger>
          <TabsTrigger value="objetivo" data-guia="btn-objetivo">
            <Target aria-hidden />
            Costo objetivo
          </TabsTrigger>
          <TabsTrigger value="versiones" data-guia="btn-versiones">
            <GitCompareArrows aria-hidden />
            Versiones
          </TabsTrigger>
        </TabsList>
        <div
          role="group"
          aria-label="Qué columnas ver"
          className="mb-1.5 flex rounded-md border border-borde bg-slate-50 p-0.5 text-xs"
        >
          {(
            [
              [false, 'Costo directo'],
              [true, 'Ofertado'],
            ] as const
          ).map(([v, texto]) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={ofertado === v}
              onClick={() => alCambiarVista(v)}
              className={cn(
                'h-6 rounded px-2.5 font-medium text-slate-500 transition-colors hover:text-slate-900',
                ofertado === v && 'bg-white text-slate-900 shadow-xs ring-1 ring-borde',
              )}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
