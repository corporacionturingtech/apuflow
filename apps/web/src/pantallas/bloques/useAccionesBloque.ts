import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { BloqueLista, OfertaDetalle } from 'tipos';
import { ErrorApi, api } from '../../lib/api';
import { calcularPresupuesto } from '../presupuesto/calculo';
import type { Aviso } from './AvisoBloque';

const mensaje = (e: unknown, otro: string) => (e instanceof ErrorApi ? e.message : otro);

/** Añadir a la oferta, borrar a la papelera y deshacer ambas cosas, con su aviso. */
export function useAccionesBloque(destino: string) {
  const cliente = useQueryClient();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [error, setError] = useState('');
  const refrescar = () => cliente.invalidateQueries({ queryKey: ['bloques'] });

  const anadir = useMutation({
    mutationFn: ({ b, valor }: { b: BloqueLista; valor: string }) =>
      api<{ capituloId: string; oferta: OfertaDetalle }>(`/api/ofertas/${destino}/bloques`, {
        metodo: 'POST',
        cuerpo: { bloqueId: b.id, ...(b.tamano ? { tamano: valor } : { veces: valor }) },
      }),
    onSuccess: ({ capituloId, oferta }) => {
      setError('');
      cliente.setQueryData(['oferta', oferta.id], oferta);
      void cliente.invalidateQueries({ queryKey: ['ofertas'] });
      const cap = oferta.capitulos.find((c) => c.id === capituloId)!;
      setAviso({
        tipo: 'anadido',
        nombre: cap.nombre,
        oferta: { id: oferta.id, nombre: oferta.nombre },
        capitulo: { id: cap.id, version: cap.version },
        rubros: oferta.rubros.filter((r) => r.capituloId === capituloId).length,
        subtotal: calcularPresupuesto(oferta).capitulos[capituloId]!.totalOfertado.toNumber(),
      });
    },
    onError: (e) => setError(mensaje(e, 'No pudimos añadir el bloque.')),
  });

  const quitarCapitulo = useMutation({
    mutationFn: (a: Extract<Aviso, { tipo: 'anadido' }>) =>
      api<void>(`/api/capitulos/${a.capitulo.id}?version=${a.capitulo.version}`, {
        metodo: 'DELETE',
      }).then(() => a),
    onSuccess: (a) => {
      void cliente.invalidateQueries({ queryKey: ['oferta', a.oferta.id] });
      void cliente.invalidateQueries({ queryKey: ['ofertas'] });
      setAviso({ tipo: 'texto', texto: `Se quitó «${a.nombre}» de ${a.oferta.nombre}.` });
    },
    onError: (e) => setError(mensaje(e, 'No pudimos quitar el capítulo.')),
  });

  const borrar = useMutation({
    mutationFn: (b: BloqueLista) =>
      api<BloqueLista>(`/api/bloques/${b.id}?version=${b.version}`, { metodo: 'DELETE' }),
    onSuccess: (b) => {
      setError('');
      setAviso({ tipo: 'borrado', bloque: b });
    },
    onSettled: refrescar,
    onError: (e) => setError(mensaje(e, 'No pudimos borrar el bloque.')),
  });

  const restaurar = useMutation({
    mutationFn: (b: BloqueLista) =>
      api<BloqueLista>(`/api/bloques/${b.id}/restaurar`, {
        metodo: 'POST',
        cuerpo: { version: b.version },
      }),
    onSuccess: (b) => {
      setError('');
      setAviso({ tipo: 'texto', texto: `«${b.nombre}» volvió a la lista de bloques.` });
    },
    onSettled: refrescar,
    onError: (e) => setError(mensaje(e, 'No pudimos restaurar el bloque.')),
  });

  return { anadir, quitarCapitulo, borrar, restaurar, aviso, setAviso, error };
}
