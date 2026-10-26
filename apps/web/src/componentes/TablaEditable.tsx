import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../lib/cn';
import { EditorCelda } from './EditorCelda';

export type Columna<T> = {
  id: string;
  titulo: string;
  /** Ancho en px; en la columna flexible es el mínimo. */
  ancho: number;
  /** Ocupa el ancho que sobra (una por tabla, normalmente la descripción). */
  flexible?: true;
  alinear?: 'der';
  /** Texto que se ve en la celda. */
  ver: (fila: T) => string;
  /** Si existe, la celda se edita y esto es el texto inicial del editor. */
  editar?: (fila: T) => string;
};

export type Plegable = { plegado: boolean; alAlternar: () => void; alQuitar?: () => void };
export type FilaTabla<T> = {
  clave: string;
  seccion?: string;
  /** Resumen de la sección, a la derecha (p. ej. subtotal del capítulo). */
  detalle?: string;
  plegable?: Plegable;
  dato?: T;
};

type Props<T> = {
  nombre: string;
  columnas: Columna<T>[];
  filas: FilaTabla<T>[];
  /** Ids (clave) de filas editadas en esta sesión: se marcan en amarillo, como en su libro. */
  editadas: ReadonlySet<string>;
  soloLectura: boolean;
  /** Devuelve un mensaje si el valor no es válido; la celda se queda en edición. */
  alGuardar: (fila: T, columna: string, texto: string) => Promise<string | void> | string | void;
  /** Tecla Supr sobre la fila enfocada (la lista decide cómo y si va a la papelera). */
  alEliminar?: (fila: T) => void;
  /** Alt+H sobre la fila enfocada (también en solo lectura). */
  alHistorial?: (fila: T) => void;
  /** Alt+A o doble clic en una celda de solo lectura: abrir el registro de la fila. */
  alAbrir?: (fila: T) => void;
  /** Marca para la barra guía de las misiones (`data-guia`). */
  guia?: string;
};

const ALTO_FILA = 28;

const anchoColumna = (c: { ancho: number; flexible?: true }): CSSProperties =>
  c.flexible ? { flex: `1 0 ${c.ancho}px`, minWidth: c.ancho } : { width: c.ancho };

// Molde de las tablas tipo Excel (ux.md regla 3): foco por celda, teclado y virtualización.
export function TablaEditable<T>({
  nombre,
  columnas,
  filas,
  editadas,
  soloLectura,
  alGuardar,
  alEliminar,
  alHistorial,
  alAbrir,
  guia,
}: Props<T>) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [foco, setFoco] = useState({ f: 0, c: 0 });
  const [editor, setEditor] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const virtual = useVirtualizer({
    count: filas.length,
    getScrollElement: () => contenedor.current,
    estimateSize: () => ALTO_FILA,
    overscan: 12,
    initialRect: { width: 1000, height: 600 },
  });

  const esDato = (i: number) => !!filas[i]?.dato;
  function mover(df: number, dc: number) {
    let f = foco.f;
    do f += df || 0;
    while (df && f >= 0 && f < filas.length && !esDato(f));
    f = Math.min(filas.length - 1, Math.max(0, f));
    if (!esDato(f)) f = foco.f;
    const c = Math.min(columnas.length - 1, Math.max(0, foco.c + dc));
    setFoco({ f, c });
    virtual.scrollToIndex(f);
  }

  useEffect(() => {
    if (!filas.length) return;
    if (!esDato(foco.f)) mover(1, 0);
  }, [filas.length]);

  const anchoMinimo = columnas.reduce((s, c) => s + c.ancho, 0);
  const actual = filas[foco.f]?.dato;
  const col = columnas[foco.c]!;
  const puedeEditar = !soloLectura && !!col.editar && !!actual;

  async function confirmar(texto: string, df: number, dc: number) {
    if (!actual) return;
    const error = await alGuardar(actual, col.id, texto);
    if (error) return setAviso(error);
    setAviso('');
    setEditor(null);
    mover(df, dc);
    contenedor.current?.focus();
  }

  function alTeclear(e: KeyboardEvent) {
    if (editor !== null) return;
    const flechas: Record<string, [number, number]> = {
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      Tab: [0, e.shiftKey ? -1 : 1],
    };
    const mov = flechas[e.key];
    if (mov) {
      e.preventDefault();
      return mover(...mov);
    }
    if (e.altKey && e.key.toLowerCase() === 'h' && alHistorial && actual) {
      e.preventDefault();
      return alHistorial(actual);
    }
    if (e.altKey && e.key.toLowerCase() === 'a' && alAbrir && actual) {
      e.preventDefault();
      return alAbrir(actual);
    }
    if (e.key === 'Delete' && alEliminar && !soloLectura && actual) {
      e.preventDefault();
      return alEliminar(actual);
    }
    if (!puedeEditar) return;
    if (e.key === 'F2' || e.key === 'Enter') {
      e.preventDefault();
      setEditor(col.editar!(actual!));
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setEditor(e.key);
    }
  }

  return (
    <div className="relative" data-guia={guia}>
      <div
        role="grid"
        aria-label={nombre}
        aria-rowcount={filas.length}
        tabIndex={0}
        ref={contenedor}
        onKeyDown={alTeclear}
        className="h-[calc(100vh-15rem)] overflow-auto rounded-lg border border-borde bg-white text-[13px] shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primario/30"
      >
        <div style={{ minWidth: anchoMinimo }}>
          <div
            role="row"
            className="sticky top-0 z-10 flex border-b border-borde bg-slate-50 text-xs font-semibold text-slate-500"
          >
            {columnas.map((c) => (
              <div
                key={c.id}
                role="columnheader"
                style={anchoColumna(c)}
                className={cn(
                  'shrink-0 truncate border-r border-borde px-2 py-1.5 last:border-r-0',
                  c.alinear && 'text-right',
                )}
              >
                {c.titulo}
              </div>
            ))}
          </div>
          <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
            {virtual.getVirtualItems().map((v) => {
              const fila = filas[v.index]!;
              const estilo = { height: ALTO_FILA, transform: `translateY(${v.start}px)` };
              if (!fila.dato) {
                return (
                  <div
                    key={fila.clave}
                    data-clave={fila.clave}
                    role="row"
                    aria-rowindex={v.index + 1}
                    style={estilo}
                    className="absolute flex w-full items-center gap-1.5 border-b border-borde bg-slate-100 px-2 font-semibold text-slate-800"
                  >
                    {fila.plegable && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="-ml-1 size-6"
                        aria-expanded={!fila.plegable.plegado}
                        aria-label={`${fila.plegable.plegado ? 'Mostrar' : 'Ocultar'} rubros`}
                        onClick={fila.plegable.alAlternar}
                      >
                        {fila.plegable.plegado ? (
                          <ChevronRight aria-hidden />
                        ) : (
                          <ChevronDown aria-hidden />
                        )}
                      </Button>
                    )}
                    <span className="truncate">{fila.seccion}</span>
                    {fila.detalle && (
                      <span className="ml-auto shrink-0 font-medium tabular-nums text-slate-600">
                        {fila.detalle}
                      </span>
                    )}
                    {fila.plegable?.alQuitar && !soloLectura && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn('h-6 font-normal', !fila.detalle && 'ml-auto')}
                        onClick={fila.plegable.alQuitar}
                      >
                        <Trash2 aria-hidden />
                        Quitar capítulo
                      </Button>
                    )}
                  </div>
                );
              }
              return (
                <div
                  key={fila.clave}
                  data-clave={fila.clave}
                  role="row"
                  aria-rowindex={v.index + 1}
                  style={estilo}
                  className="absolute flex w-full border-b border-slate-100 hover:bg-slate-50"
                >
                  {columnas.map((c, ci) => {
                    const activa = foco.f === v.index && foco.c === ci;
                    const editando = activa && editor !== null;
                    return (
                      <div
                        key={c.id}
                        role="gridcell"
                        aria-selected={activa}
                        onClick={() => setFoco({ f: v.index, c: ci })}
                        onDoubleClick={() => {
                          if (c.editar && !soloLectura) setEditor(c.editar(fila.dato!));
                          else if (!c.editar) alAbrir?.(fila.dato!);
                        }}
                        style={anchoColumna(c)}
                        className={cn(
                          'shrink-0 truncate border-r border-slate-100 px-2 py-1 last:border-r-0',
                          c.alinear && 'text-right tabular-nums',
                          editadas.has(fila.clave) && c.editar && 'bg-yellow-100',
                          activa &&
                            'bg-primario/5 outline outline-2 -outline-offset-2 outline-primario',
                        )}
                      >
                        {editando ? (
                          <EditorCelda
                            inicial={editor!}
                            alinear={c.alinear}
                            alCancelar={() => {
                              setEditor(null);
                              setAviso('');
                              contenedor.current?.focus();
                            }}
                            alConfirmar={confirmar}
                          />
                        ) : (
                          c.ver(fila.dato!)
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p role="status" className="mt-1 h-5 text-sm text-red-700">
        {aviso}
      </p>
    </div>
  );
}
