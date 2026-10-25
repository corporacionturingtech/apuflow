import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { BloqueLista } from 'tipos';
import { ErrorApi, api } from '../../lib/api';

interface Props {
  capitulos: { id: string; nombre: string }[];
  alCerrar: () => void;
}

// Copia los rubros y cantidades de un capítulo a la biblioteca de bloques.
export function GuardarBloque({ capitulos, alCerrar }: Props) {
  const cliente = useQueryClient();
  const [capituloId, setCapituloId] = useState(capitulos[0]?.id ?? '');
  const [nombre, setNombre] = useState(capitulos[0]?.nombre ?? '');
  const [mensaje, setMensaje] = useState('');
  const guardar = useMutation({
    mutationFn: () =>
      api<BloqueLista>('/api/bloques', { metodo: 'POST', cuerpo: { capituloId, nombre } }),
    onSuccess: (b) => {
      setMensaje(`Bloque «${b.nombre}» guardado con ${b.lineas.length} rubros.`);
      void cliente.invalidateQueries({ queryKey: ['bloques'] });
    },
    onError: (e) => setMensaje(e instanceof ErrorApi ? e.message : 'No pudimos guardar el bloque.'),
  });

  return (
    <section
      aria-label="Guardar como bloque"
      className="mt-3 flex flex-wrap items-center gap-3 rounded border border-slate-300 bg-white p-3 text-sm"
    >
      <label>
        Capítulo{' '}
        <select
          value={capituloId}
          onChange={(e) => {
            setCapituloId(e.target.value);
            setNombre(capitulos.find((c) => c.id === e.target.value)?.nombre ?? '');
          }}
          className="rounded border border-slate-300 px-1 py-0.5"
        >
          {capitulos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <input
        aria-label="Nombre del bloque"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-64 rounded border border-slate-300 px-2 py-0.5"
      />
      <button
        type="button"
        disabled={!nombre.trim() || guardar.isPending}
        onClick={() => guardar.mutate()}
        className="rounded border border-slate-300 px-2 py-0.5"
      >
        Guardar bloque
      </button>
      {mensaje && <span role="status">{mensaje}</span>}
      <button type="button" onClick={alCerrar} className="ml-auto underline">
        Cerrar
      </button>
    </section>
  );
}
