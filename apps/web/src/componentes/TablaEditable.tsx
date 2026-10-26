import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export type Columna<T> = {
  id: string;
  titulo: string;
  ancho: number;
  alinear?: 'der';
  /** Texto que se ve en la celda. */
  ver: (fila: T) => string;
  /** Si existe, la celda se edita y esto es el texto inicial del editor. */
  editar?: (fila: T) => string;
};

export type Plegable = { plegado: boolean; alAlternar: () => void; alQuitar?: () => void };
export type FilaTabla<T> = { clave: string; seccion?: string; plegable?: Plegable; dato?: T };

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
        className="h-[calc(100vh-15rem)] overflow-auto rounded border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-400"
      >
        <div role="row" className="sticky top-0 z-10 flex bg-slate-100 font-medium">
          {columnas.map((c) => (
            <div
              key={c.id}
              role="columnheader"
              style={{ width: c.ancho }}
              className={`shrink-0 border-b border-r border-slate-300 px-2 py-1 ${c.alinear ? 'text-right' : ''}`}
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
                  className="absolute flex w-full items-center gap-2 bg-slate-200 px-2 py-1 font-semibold"
                >
                  {fila.plegable && (
                    <button
                      type="button"
                      aria-expanded={!fila.plegable.plegado}
                      aria-label={`${fila.plegable.plegado ? 'Mostrar' : 'Ocultar'} rubros`}
                      onClick={fila.plegable.alAlternar}
                    >
                      {fila.plegable.plegado ? '▸' : '▾'}
                    </button>
                  )}
                  <span>{fila.seccion}</span>
                  {fila.plegable?.alQuitar && !soloLectura && (
                    <button
                      type="button"
                      onClick={fila.plegable.alQuitar}
                      className="ml-auto text-xs font-normal underline"
                    >
                      Quitar capítulo
                    </button>
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
                className="absolute flex w-full border-b border-slate-100"
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
                      style={{ width: c.ancho }}
                      className={`shrink-0 truncate border-r border-slate-100 px-2 py-1 ${
                        c.alinear ? 'text-right tabular-nums' : ''
                      } ${editadas.has(fila.clave) && c.editar ? 'bg-yellow-100' : ''} ${
                        activa ? 'outline outline-2 -outline-offset-2 outline-blue-500' : ''
                      }`}
                    >
                      {editando ? (
                        <Editor
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
      <p role="status" className="mt-1 h-5 text-sm text-red-700">
        {aviso}
      </p>
    </div>
  );
}

function Editor({
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
