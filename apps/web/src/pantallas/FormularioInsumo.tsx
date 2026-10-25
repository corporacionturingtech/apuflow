import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Insumo, InsumoCrear, TipoInsumo } from 'tipos';
import { api, ErrorApi } from '../lib/api';
import { precioATexto } from './precio';

const VACIO = { codigo: '', descripcion: '', unidad: '', pu: '', seccion: '' };

// Alta de un insumo (ux.md regla 3: todo con teclado; Enter guarda, Esc cierra).
export function FormularioInsumo({ tipo, alCerrar }: { tipo: TipoInsumo; alCerrar: () => void }) {
  const cliente = useQueryClient();
  const [v, setV] = useState(VACIO);
  const [aviso, setAviso] = useState('');

  const crear = useMutation({
    mutationFn: (cuerpo: InsumoCrear) => api<Insumo>('/api/insumos', { metodo: 'POST', cuerpo }),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ['insumos', tipo] });
      setV(VACIO);
      setAviso('');
    },
    onError: (e) => setAviso(e instanceof ErrorApi ? e.message : 'No pudimos agregarlo.'),
  });

  function enviar() {
    const pu = v.pu.trim() ? precioATexto(v.pu) : '0';
    if (!v.codigo.trim() || !v.descripcion.trim() || !v.unidad.trim())
      return setAviso('Complete código, descripción y unidad');
    if (pu === null) return setAviso('Escriba un precio válido, por ejemplo 10,40');
    crear.mutate({
      tipo,
      codigo: v.codigo,
      descripcion: v.descripcion,
      unidad: v.unidad,
      pu,
      seccion: v.seccion.trim() || null,
    });
  }

  const campo = (id: keyof typeof VACIO, etiqueta: string, ancho: string, primero = false) => (
    <label className="flex flex-col text-xs text-slate-600">
      {etiqueta}
      <input
        autoFocus={primero}
        value={v[id]}
        onChange={(e) => setV({ ...v, [id]: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') enviar();
          if (e.key === 'Escape') alCerrar();
        }}
        className={`${ancho} rounded border border-slate-300 px-2 py-1 text-sm text-slate-900`}
      />
    </label>
  );

  return (
    <form
      aria-label="Agregar"
      onSubmit={(e) => e.preventDefault()}
      className="mb-3 flex flex-wrap items-end gap-2 rounded border border-blue-200 bg-blue-50 p-2"
    >
      {campo('codigo', 'Código', 'w-28', true)}
      {campo('descripcion', 'Descripción', 'w-80')}
      {campo('unidad', 'Unidad', 'w-20')}
      {campo('pu', 'P.U.', 'w-24')}
      {campo('seccion', 'Sección (opcional)', 'w-36')}
      <button
        type="button"
        onClick={enviar}
        className="rounded bg-blue-700 px-3 py-1 text-sm text-white"
      >
        Guardar
      </button>
      <button type="button" onClick={alCerrar} className="px-2 py-1 text-sm text-slate-600">
        Cerrar
      </button>
      {aviso && (
        <span role="alert" className="text-sm text-red-800">
          {aviso}
        </span>
      )}
    </form>
  );
}
