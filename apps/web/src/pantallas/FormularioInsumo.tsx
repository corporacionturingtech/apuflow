import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import type { Insumo, InsumoCrear, TipoInsumo } from 'tipos';
import { api, ErrorApi } from '../lib/api';
import { cn } from '../lib/cn';
import { money } from '../lib/formato';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { precioATexto } from './precio';

const VACIO = { codigo: '', descripcion: '', unidad: '', pu: '', seccion: '' };
type Campo = keyof typeof VACIO;
const OBLIGATORIOS: Campo[] = ['codigo', 'descripcion', 'unidad'];

// Alta de un insumo (ux.md regla 3: todo con teclado; Enter guarda, Esc cierra).
// Tras guardar queda abierto y vuelve a «Código»: se cargan varios seguidos sin el mouse.
export function FormularioInsumo({
  tipo,
  singular,
  alCerrar,
}: {
  tipo: TipoInsumo;
  singular: string;
  alCerrar: () => void;
}) {
  const cliente = useQueryClient();
  const [v, setV] = useState(VACIO);
  const [aviso, setAviso] = useState('');
  const [faltan, setFaltan] = useState<ReadonlySet<Campo>>(new Set());
  const [agregado, setAgregado] = useState('');
  const primero = useRef<HTMLInputElement>(null);

  const crear = useMutation({
    mutationFn: (cuerpo: InsumoCrear) => api<Insumo>('/api/insumos', { metodo: 'POST', cuerpo }),
    onSuccess: (i) => {
      void cliente.invalidateQueries({ queryKey: ['insumos', tipo] });
      setV(VACIO);
      setAviso('');
      setAgregado(`Se agregó «${i.descripcion}» a ${money(Number(i.pu))}.`);
      primero.current?.focus();
    },
    onError: (e) => setAviso(e instanceof ErrorApi ? e.message : 'No pudimos agregarlo.'),
  });

  function enviar() {
    const pu = v.pu.trim() ? precioATexto(v.pu) : '0';
    const vacios = new Set(OBLIGATORIOS.filter((c) => !v[c].trim()));
    setFaltan(vacios);
    setAgregado('');
    if (vacios.size) return setAviso('Complete código, descripción y unidad');
    if (pu === null) return setAviso('Escriba un precio válido, por ejemplo 10,40');
    crear.mutate({
      tipo,
      codigo: v.codigo.trim(),
      descripcion: v.descripcion.trim(),
      unidad: v.unidad.trim(),
      pu,
      seccion: v.seccion.trim() || null,
    });
  }

  const campo = (id: Campo, etiqueta: string, ancho: string, placeholder = '') => (
    <label className={cn('flex flex-col gap-1 text-xs font-medium text-slate-600', ancho)}>
      {etiqueta}
      <Input
        ref={id === 'codigo' ? primero : undefined}
        autoFocus={id === 'codigo'}
        value={v[id]}
        placeholder={placeholder}
        aria-invalid={faltan.has(id) || undefined}
        inputMode={id === 'pu' ? 'decimal' : undefined}
        onChange={(e) => {
          setV({ ...v, [id]: e.target.value });
          if (faltan.has(id)) setFaltan((s) => new Set([...s].filter((c) => c !== id)));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') enviar();
          if (e.key === 'Escape') alCerrar();
        }}
        className={cn(
          id === 'pu' && 'text-right tabular-nums',
          faltan.has(id) && 'border-red-400 ring-2 ring-red-500/15',
        )}
      />
    </label>
  );

  return (
    <form
      aria-label="Agregar"
      onSubmit={(e) => e.preventDefault()}
      className="aparecer mb-3 rounded-lg border border-borde bg-white p-3 shadow-xs"
    >
      <div className="mb-2 flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-800">Agregar {singular}</p>
        <span className="text-xs text-slate-500">Enter guarda · Esc cierra</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label="Cerrar"
          onClick={alCerrar}
        >
          <X aria-hidden />
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {campo('codigo', 'Código', 'w-28')}
        {campo('descripcion', 'Descripción', 'min-w-60 flex-1')}
        {campo('unidad', 'Unidad', 'w-20', 'm, u, kg')}
        {campo('pu', 'P.U.', 'w-28', '0,00')}
        {campo('seccion', 'Sección (opcional)', 'w-40')}
        <Button type="button" onClick={enviar} disabled={crear.isPending}>
          Guardar
        </Button>
      </div>
      {(aviso || agregado) && (
        <p
          role={aviso ? 'alert' : 'status'}
          className={cn(
            'mt-2 flex items-center gap-1.5 text-sm',
            aviso ? 'text-red-700' : 'text-emerald-700',
          )}
        >
          {!aviso && <CheckCircle2 aria-hidden className="size-4" />}
          {aviso || `${agregado} Puede seguir con el siguiente.`}
        </p>
      )}
    </form>
  );
}
