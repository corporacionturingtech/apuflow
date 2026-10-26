import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { Oferta, OfertaDetalle } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { consultaYo } from '../sesion';

export function Ofertas() {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const { data: yo } = useQuery(consultaYo);
  const [nombre, setNombre] = useState('');
  const [aviso, setAviso] = useState('');
  const { data, isPending, error } = useQuery({
    queryKey: ['ofertas'],
    queryFn: () => api<{ items: Oferta[] }>('/api/ofertas'),
  });
  const crear = useMutation({
    mutationFn: () =>
      api<OfertaDetalle>('/api/ofertas', { metodo: 'POST', cuerpo: { nombre: nombre.trim() } }),
    onSuccess: async (o) => {
      void cliente.invalidateQueries({ queryKey: ['ofertas'] });
      await navegar({ to: '/ofertas/$id', params: { id: o.id } });
    },
    onError: (e) => setAviso(e instanceof ErrorApi ? e.message : 'No pudimos crear la oferta.'),
  });
  const puedeEscribir = yo?.rol === 'admin' || yo?.rol === 'cotizador';

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Ofertas</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cada oferta es un presupuesto completo: capítulos, rubros y totales.
      </p>
      {puedeEscribir && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nombre.trim()) crear.mutate();
          }}
        >
          <input
            aria-label="Nombre de la oferta"
            placeholder="Nombre de la nueva oferta"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-96 rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white">
            Crear oferta
          </button>
          <Link
            to="/importar"
            className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
          >
            Importar libro de Excel
          </Link>
        </form>
      )}
      {aviso && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          No pudimos cargar las ofertas.
        </p>
      )}
      {isPending && <p className="mt-3 text-slate-500">Cargando…</p>}
      {data && data.items.length === 0 && (
        <p className="mt-4 text-slate-600">Todavía no hay ofertas. Cree la primera arriba.</p>
      )}
      <ul className="mt-4 space-y-2">
        {data?.items.map((o) => (
          <li key={o.id}>
            <Link
              to="/ofertas/$id"
              params={{ id: o.id }}
              data-guia={`oferta-${o.id}`}
              className="block rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <b>{o.nombre}</b>
              <span className="block text-xs text-slate-500">
                {o.cliente ?? 'Sin cliente'} · {o.tipo === 'publico' ? 'Pública' : 'Privada'} ·{' '}
                {o.rubros} rubros · {o.estado === 'emitida' ? 'Emitida' : 'Borrador'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
