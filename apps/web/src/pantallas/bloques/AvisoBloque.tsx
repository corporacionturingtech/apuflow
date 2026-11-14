import { Link } from '@tanstack/react-router';
import { Undo2, X } from 'lucide-react';
import type { BloqueLista } from 'tipos';
import { plural } from '../../lib/disciplina';
import { money } from '../../lib/formato';
import { Button, variantesBoton } from '../../ui/button';

export type Aviso =
  | {
      tipo: 'anadido';
      nombre: string;
      oferta: { id: string; nombre: string };
      capitulo: { id: string; version: number };
      rubros: number;
      subtotal: number;
    }
  | { tipo: 'borrado'; bloque: BloqueLista }
  | { tipo: 'texto'; texto: string };

interface Props {
  aviso: Aviso;
  deshaciendo: boolean;
  alDeshacer: () => void;
  alCerrar: () => void;
}

/** Flota abajo a la derecha: se ve aunque la fila esté al final de la lista y ofrece deshacer. */
export function AvisoBloque({ aviso, deshaciendo, alDeshacer, alCerrar }: Props) {
  return (
    <div
      role="status"
      className="aparecer fixed bottom-6 right-6 z-30 flex w-[min(36rem,calc(100vw-3rem))] flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm shadow-lg ring-4 ring-emerald-500/5"
    >
      <p className="min-w-60 flex-1 leading-6">
        {aviso.tipo === 'anadido' &&
          `Se añadió «${aviso.nombre}» a ${aviso.oferta.nombre}: ${plural(aviso.rubros, 'rubro', 'rubros')}, subtotal ${money(aviso.subtotal)}.`}
        {aviso.tipo === 'borrado' && `«${aviso.bloque.nombre}» se movió a la papelera.`}
        {aviso.tipo === 'texto' && aviso.texto}
      </p>
      {aviso.tipo === 'anadido' && (
        <Link
          to="/ofertas/$id"
          params={{ id: aviso.oferta.id }}
          className={variantesBoton({ size: 'sm' })}
        >
          Ver en el presupuesto
        </Link>
      )}
      {aviso.tipo !== 'texto' && (
        <Button size="sm" variant="outline" disabled={deshaciendo} onClick={alDeshacer}>
          <Undo2 aria-hidden />
          Deshacer
        </Button>
      )}
      <Button size="icon-sm" variant="ghost" aria-label="Cerrar aviso" onClick={alCerrar}>
        <X aria-hidden />
      </Button>
    </div>
  );
}
