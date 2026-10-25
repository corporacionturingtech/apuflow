import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { ApuDeOferta, OfertaDetalle, Rubro } from 'tipos';
import { ErrorApi, api } from '../../lib/api';

interface Props {
  ofertaId: string;
  rubroId: string;
  alCerrar: () => void;
}

// Un APU es de la empresa y lo comparten las ofertas: antes de editarlo se pregunta el alcance.
export function EditarApu({ ofertaId, rubroId, alCerrar }: Props) {
  const clave = ['oferta', ofertaId] as const;
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const [mensaje, setMensaje] = useState('');
  const rubro = cliente.getQueryData<OfertaDetalle>(clave)!.rubros.find((r) => r.id === rubroId)!;
  const apu = cliente.getQueryData<OfertaDetalle>(clave)!.apus.find((a) => a.id === rubro.apuId)!;
  const uso = useQuery({
    queryKey: ['apu-uso', apu.id],
    queryFn: () => api<{ rubros: number; ofertas: number }>(`/api/apus/${apu.id}/uso`),
  });

  const copiar = useMutation({
    scope: { id: `oferta-${ofertaId}` },
    mutationFn: () =>
      api<{ rubro: Rubro; apu: ApuDeOferta }>(`/api/rubros/${rubroId}/apu/copia`, {
        metodo: 'POST',
        cuerpo: {
          version: cliente.getQueryData<OfertaDetalle>(clave)!.rubros.find((r) => r.id === rubroId)!
            .version,
        },
      }),
    onSuccess: ({ rubro: r, apu: a }) => {
      cliente.setQueryData<OfertaDetalle>(
        clave,
        (d) =>
          d && {
            ...d,
            rubros: d.rubros.map((x) => (x.id === r.id ? { ...x, ...r } : x)),
            apus: [...d.apus, a],
          },
      );
      void navegar({ to: '/apus/$id', params: { id: a.id } });
    },
    onError: (e) => {
      setMensaje(e instanceof ErrorApi ? e.message : 'No pudimos crear la copia.');
      void cliente.invalidateQueries({ queryKey: clave });
    },
  });

  const u = uso.data;
  return (
    <section
      aria-label="Editar APU"
      className="mt-3 rounded border border-slate-300 bg-white p-3 text-sm"
    >
      <p>
        ¿Dónde quiere cambiar el APU <b>{apu.codigo}</b> · {apu.descripcion}?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void navegar({ to: '/apus/$id', params: { id: apu.id } })}
          className="rounded border border-slate-300 px-2 py-1 text-left"
        >
          <b>En todas las ofertas</b>
          <span className="block text-xs text-slate-600">
            {u
              ? `Lo usan ${u.rubros} ${u.rubros === 1 ? 'rubro' : 'rubros'} de ${u.ofertas} ${u.ofertas === 1 ? 'oferta' : 'ofertas'}.`
              : 'Calculando dónde se usa…'}
          </span>
        </button>
        <button
          type="button"
          disabled={copiar.isPending}
          onClick={() => copiar.mutate()}
          className="rounded border border-slate-300 px-2 py-1 text-left"
        >
          <b>Solo en esta oferta</b>
          <span className="block text-xs text-slate-600">
            Crea una copia del APU para este rubro; las demás ofertas no cambian.
          </span>
        </button>
        <button type="button" onClick={alCerrar} className="ml-auto self-start underline">
          Cancelar
        </button>
      </div>
      {mensaje && (
        <p role="alert" className="mt-2 text-red-700">
          {mensaje}
        </p>
      )}
    </section>
  );
}
