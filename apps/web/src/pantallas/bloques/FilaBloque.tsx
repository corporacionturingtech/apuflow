import { ChevronRight, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { D } from 'motor';
import type { ApuDeOferta, BloqueLista, BloquesRespuesta } from 'tipos';
import { cn } from '../../lib/cn';
import { colorDe, plural } from '../../lib/disciplina';
import { money, parseNum, qty } from '../../lib/formato';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { totalesBloque } from '../presupuesto/calculo';

export const COLUMNAS_BLOQUE =
  'grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-x-3 px-3 md:grid-cols-[1rem_minmax(0,1fr)_9.5rem_8.5rem_9rem]';

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });

interface Props {
  b: BloqueLista;
  data: BloquesRespuesta;
  apus: Map<string, ApuDeOferta>;
  guia: boolean;
  puedeEscribir: boolean;
  /** Motivo por el que no se puede añadir (sin oferta destino, añadiendo otro…); vacío si se puede. */
  bloqueo: string;
  alAnadir: (valor: string) => void;
  alBorrar: () => void;
  alRestaurar: () => void;
}

export function FilaBloque(p: Props) {
  const { b, data } = p;
  const enPapelera = Boolean(b.eliminadoEn);
  const base = b.tamano ? qty(Number(b.tamano)) : '1';
  const [escrito, setEscrito] = useState(base);
  const [abierto, setAbierto] = useState(false);
  const valor = parseNum(escrito);
  const valido = Number.isFinite(valor) && valor > 0;
  // Mismo factor que aplica la API al añadirlo, para que la cifra sea la que entra a la oferta.
  const factor = valido ? new D(String(valor)).div(b.tamano ?? 1) : new D(1);
  const clave = factor.toString();
  const totales = useMemo(() => totalesBloque(data, b, [], clave), [data, b, clave]);
  const porUnidad = useMemo(
    () => (b.tamano ? totalesBloque(data, b, [], new D(1).div(b.tamano)).costoDirecto : null),
    [data, b],
  );
  const motivo = !valido ? 'Escriba una cantidad mayor que cero.' : p.bloqueo;
  const anadir = () => {
    if (!motivo) p.alAnadir(String(valor));
  };
  const nombreCantidad = b.tamano
    ? `Tamaño en ${b.unidadTamano ?? 'unidades'} para «${b.nombre}»`
    : `Veces que se añade «${b.nombre}»`;

  return (
    <li>
      <article aria-label={b.nombre}>
        <div className={cn(COLUMNAS_BLOQUE, 'py-2 text-sm', abierto && 'bg-slate-50/70')}>
          <button
            type="button"
            aria-expanded={abierto}
            aria-label={`${abierto ? 'Ocultar' : 'Ver'} rubros de «${b.nombre}»`}
            onClick={() => setAbierto((v) => !v)}
            className="grid size-5 place-items-center rounded text-slate-400 hover:text-primario focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primario/40"
          >
            <ChevronRight
              aria-hidden
              className={cn('size-4 transition-transform', abierto && 'rotate-90')}
            />
          </button>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="min-w-0 text-left focus-visible:outline-none"
            tabIndex={-1}
          >
            <span className="block truncate font-medium text-slate-900" title={b.nombre}>
              {b.nombre}
            </span>
            <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
              {b.disciplina && (
                <>
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: colorDe(b.disciplina) }}
                  />
                  {b.disciplina} ·{' '}
                </>
              )}
              {plural(b.lineas.length, 'rubro', 'rubros')}
              {b.tamano && ` · armado para ${base} ${b.unidadTamano ?? ''}`}
              {enPapelera && ` · borrado el ${fecha(b.eliminadoEn!)}`}
            </span>
          </button>

          {enPapelera || !p.puedeEscribir ? (
            <span className="hidden md:block" />
          ) : (
            <label className="hidden items-center gap-1.5 text-slate-500 md:flex">
              {!b.tamano && <span aria-hidden>×</span>}
              <Input
                aria-label={nombreCantidad}
                inputMode="decimal"
                value={escrito}
                aria-invalid={!valido}
                title={valido ? undefined : 'Escriba una cantidad mayor que cero.'}
                onChange={(e) => setEscrito(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') anadir();
                  if (e.key === 'Escape') setEscrito(base);
                }}
                className={cn(
                  'h-7 w-20 text-right tabular-nums',
                  !valido && 'border-red-400 focus-visible:border-red-500',
                )}
              />
              <span className="truncate text-xs">{b.tamano ? b.unidadTamano : 'veces'}</span>
            </label>
          )}

          <span className="hidden text-right md:block">
            <span className="block font-medium tabular-nums text-slate-900">
              {money(totales.costoDirecto)}
            </span>
            {porUnidad !== null && (
              <span className="block text-xs tabular-nums text-slate-500">
                {money(porUnidad)} / {b.unidadTamano ?? 'unidad'}
              </span>
            )}
          </span>

          <span className="flex items-center justify-end gap-1">
            <span className="text-right font-medium tabular-nums md:hidden">
              {money(totales.costoDirecto)}
            </span>
            {p.puedeEscribir && enPapelera && (
              <Button size="sm" variant="outline" onClick={p.alRestaurar}>
                <RotateCcw aria-hidden />
                Restaurar
              </Button>
            )}
            {p.puedeEscribir && !enPapelera && (
              <>
                <Button
                  size="sm"
                  data-guia={p.guia ? 'bloque-anadir' : undefined}
                  disabled={Boolean(motivo)}
                  title={motivo || undefined}
                  onClick={anadir}
                  className="hidden md:inline-flex"
                >
                  <Plus aria-hidden />
                  Añadir
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Borrar «${b.nombre}»`}
                      onClick={p.alBorrar}
                      className="hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mover a la papelera (se puede deshacer)</TooltipContent>
                </Tooltip>
              </>
            )}
          </span>
        </div>

        {abierto && (
          <table className="w-full border-t border-borde bg-slate-50/70 text-sm">
            <caption className="sr-only">Rubros de «{b.nombre}»</caption>
            <thead className="text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-24 py-1.5 pl-10 text-left font-medium">Código</th>
                <th className="py-1.5 text-left font-medium">Rubro</th>
                <th className="w-28 py-1.5 text-right font-medium">Cantidad</th>
                <th className="w-16 py-1.5 pl-2 text-left font-medium">Unidad</th>
                <th className="w-32 py-1.5 pr-3 text-right font-medium">Costo directo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde/70">
              {b.lineas.map((l, i) => {
                const a = p.apus.get(l.apuId);
                return (
                  <tr key={i}>
                    <td className="py-1 pl-10 font-mono text-xs text-slate-500">{a?.codigo}</td>
                    <td className="max-w-0 truncate py-1 text-slate-700" title={a?.descripcion}>
                      {a?.descripcion}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {qty(new D(l.cantidad).times(factor).toDecimalPlaces(6).toNumber())}
                    </td>
                    <td className="py-1 pl-2 text-slate-500">{a?.unidad}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">
                      {money(totales.lineas[i] ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </article>
    </li>
  );
}
