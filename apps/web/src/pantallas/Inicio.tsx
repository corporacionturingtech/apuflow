import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { Oferta } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { iniciarMision, useGuia } from '../misiones/guia';
import { MISIONES } from '../misiones/misiones';
import { consultaYo } from '../sesion';
import { PanelValor } from './PanelValor';

export function Inicio() {
  const cliente = useQueryClient();
  const { data: yo } = useQuery(consultaYo);
  const guia = useGuia();
  const [error, setError] = useState('');
  const { data } = useQuery({
    queryKey: ['ofertas'],
    queryFn: () => api<{ items: Oferta[] }>('/api/ofertas'),
  });
  const cargar = useMutation({
    mutationFn: () => api<{ ofertaId: string }>('/api/demo/cargar', { metodo: 'POST' }),
    onSuccess: () => {
      setError('');
      return cliente.invalidateQueries();
    },
    onError: (e) =>
      setError(e instanceof ErrorApi ? e.message : 'No pudimos cargar la empresa demo.'),
  });

  const hayOfertas = (data?.items.length ?? 0) > 0;
  return (
    <section>
      <h1 className="text-xl font-semibold">Inicio</h1>
      {yo?.rol === 'admin' && <PanelValor />}
      {data && !hayOfertas && (
        <div className="mt-4 max-w-2xl rounded border border-slate-300 bg-white p-4">
          <h2 className="font-semibold">Empiece con una empresa de ejemplo</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cargamos una subestación ficticia con sus listas de precios, APUs y bloques, para que
            pruebe APUflow sin tocar sus datos. Después puede importar su propio libro de Excel.
          </p>
          {yo?.rol === 'admin' ? (
            <button
              type="button"
              disabled={cargar.isPending}
              onClick={() => cargar.mutate()}
              className="mt-3 rounded border border-slate-900 bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {cargar.isPending ? 'Cargando…' : 'Cargar empresa demo'}
            </button>
          ) : (
            <p className="mt-3 text-sm">Pídale a un administrador que cargue la empresa demo.</p>
          )}
          <p className="mt-2 text-sm">
            ¿Ya tiene su libro?{' '}
            <Link to="/importar" className="underline">
              Importe su libro de Excel
            </Link>
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
      {hayOfertas && (
        <div className="mt-4 max-w-3xl">
          <h2 className="font-semibold">Misiones guiadas</h2>
          <p className="mt-1 text-sm text-slate-600">
            Siete tareas del día a día, paso a paso, sobre la oferta de ejemplo. Cada una le muestra
            qué gana su empresa.
          </p>
          <ol aria-label="Misiones" className="mt-3 space-y-2">
            {MISIONES.map((m, i) => {
              const hecha = guia.hechas.includes(m.id);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <span className="w-5 text-slate-500">{i + 1}</span>
                  <span className="flex-1">
                    <b>{m.titulo}</b>
                    <span className="block text-xs text-slate-500">{m.frase}</span>
                  </span>
                  {hecha && <span className="text-green-700">Cumplida</span>}
                  <button
                    type="button"
                    onClick={() => iniciarMision(m.id)}
                    className="rounded border border-slate-300 px-2 py-0.5"
                  >
                    {hecha ? 'Repetir' : 'Empezar'}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
