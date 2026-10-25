import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ApuDeOferta, OfertaDetalle, Rubro, RubroCambio } from 'tipos';
import { ErrorApi, api } from '../../lib/api';

type Cambio = Omit<RubroCambio, 'version'>;

// Todas las escrituras de una oferta van en una misma cola (scope): cada una lee la versión que
// dejó la anterior y así no hay 409 falsos al editar y borrar la misma fila seguidas.
export function useCambiosOferta(id: string) {
  const clave = ['oferta', id] as const;
  const cliente = useQueryClient();
  const [aviso, setAviso] = useState('');
  const [editadas, setEditadas] = useState<ReadonlySet<string>>(new Set());
  const scope = { id: `oferta-${id}` };

  const poner = (f: (d: OfertaDetalle) => OfertaDetalle) =>
    cliente.setQueryData<OfertaDetalle>(clave, (d) => d && f(d));
  const leer = () => cliente.getQueryData<OfertaDetalle>(clave)!;
  const onError = (e: Error) => {
    setAviso(e instanceof ErrorApi ? e.message : 'No pudimos guardar el cambio.');
    void cliente.invalidateQueries({ queryKey: clave });
  };

  const guardar = useMutation({
    scope,
    mutationFn: ({ rubroId, cambio }: { rubroId: string; cambio: Cambio }) =>
      api<Rubro>(`/api/rubros/${rubroId}`, {
        metodo: 'PATCH',
        cuerpo: { version: leer().rubros.find((r) => r.id === rubroId)!.version, ...cambio },
      }),
    onMutate: ({ rubroId, cambio }) => {
      poner((d) => ({
        ...d,
        rubros: d.rubros.map((r) => (r.id === rubroId ? ({ ...r, ...cambio } as Rubro) : r)),
      }));
      setEditadas((s) => new Set(s).add(rubroId));
    },
    onSuccess: (fila) => {
      setAviso('');
      poner((d) => ({
        ...d,
        rubros: d.rubros.map((r) => (r.id === fila.id ? { ...r, ...fila } : r)),
      }));
    },
    onError,
  });

  const anadir = useMutation({
    scope,
    mutationFn: (v: { apuId: string; capituloId: string }) =>
      api<{ rubro: Rubro; apu: ApuDeOferta }>(`/api/ofertas/${id}/rubros`, {
        metodo: 'POST',
        cuerpo: v,
      }),
    onSuccess: ({ rubro, apu }) => {
      setAviso('');
      poner((d) => ({
        ...d,
        rubros: [...d.rubros, rubro],
        apus: d.apus.some((a) => a.id === apu.id) ? d.apus : [...d.apus, apu],
      }));
      setEditadas((s) => new Set(s).add(rubro.id));
    },
    onError,
  });

  // La versión se lee antes de sacar la fila del caché (si no, ya no hay de dónde leerla).
  const quitarRubro = useMutation({
    scope,
    mutationFn: async (rubroId: string) => {
      const version = leer().rubros.find((r) => r.id === rubroId)!.version;
      poner((d) => ({ ...d, rubros: d.rubros.filter((r) => r.id !== rubroId) }));
      await api<void>(`/api/rubros/${rubroId}?version=${version}`, { metodo: 'DELETE' });
    },
    onSuccess: () => setAviso(''),
    onError,
  });

  const quitarCapitulo = useMutation({
    scope,
    mutationFn: async (capId: string) => {
      const version = leer().capitulos.find((c) => c.id === capId)!.version;
      poner((d) => ({
        ...d,
        capitulos: d.capitulos.filter((c) => c.id !== capId),
        rubros: d.rubros.filter((r) => r.capituloId !== capId),
      }));
      await api<void>(`/api/capitulos/${capId}?version=${version}`, { metodo: 'DELETE' });
    },
    onSuccess: () => setAviso(''),
    onError,
  });

  const anadirCapitulo = useMutation({
    scope,
    mutationFn: (nombre: string) =>
      api<OfertaDetalle>(`/api/ofertas/${id}/capitulos`, { metodo: 'POST', cuerpo: { nombre } }),
    onSuccess: (detalle) => {
      setAviso('');
      poner((d) => ({ ...d, capitulos: detalle.capitulos }));
    },
    onError,
  });

  const cambiarIndirecto = useMutation({
    scope,
    mutationFn: ({ indId, porcentaje }: { indId: string; porcentaje: string }) =>
      api<{ id: string; porcentaje: string; version: number }>(
        `/api/ofertas/${id}/indirectos/${indId}`,
        {
          metodo: 'PATCH',
          cuerpo: { version: leer().indirectos.find((i) => i.id === indId)!.version, porcentaje },
        },
      ),
    onMutate: ({ indId, porcentaje }) =>
      poner((d) => ({
        ...d,
        indirectos: d.indirectos.map((i) => (i.id === indId ? { ...i, porcentaje } : i)),
      })),
    onSuccess: (fila) => {
      setAviso('');
      poner((d) => ({
        ...d,
        indirectos: d.indirectos.map((i) => (i.id === fila.id ? { ...i, ...fila } : i)),
      }));
    },
    onError,
  });

  const cambiarIva = useMutation({
    scope,
    mutationFn: (iva: string) =>
      api<OfertaDetalle>(`/api/ofertas/${id}`, {
        metodo: 'PATCH',
        cuerpo: { version: leer().version, iva },
      }),
    onMutate: (iva) => poner((d) => ({ ...d, iva })),
    onSuccess: (detalle) => {
      setAviso('');
      poner((d) => ({ ...d, iva: detalle.iva, version: detalle.version }));
    },
    onError,
  });

  return {
    aviso,
    editadas,
    guardar,
    anadir,
    quitarRubro,
    quitarCapitulo,
    anadirCapitulo,
    cambiarIndirecto,
    cambiarIva,
  };
}
