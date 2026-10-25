import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Insumo, ListaInsumos } from 'tipos';
import type { CambioPrecio } from './PanelImpacto';
import { api, ErrorApi } from '../lib/api';

/** Deshacer el último cambio de precio: un PATCH normal con el precio anterior (botón y Ctrl+Z). */
export function useDeshacerPrecio(
  clave: readonly unknown[],
  impacto: CambioPrecio | null,
  setImpacto: (c: CambioPrecio | null) => void,
  setAviso: (m: string) => void,
) {
  const cliente = useQueryClient();
  const deshacer = useMutation({
    // La versión se lee aquí (no al encolar): si no, el PATCH sale con la versión vieja y da 409.
    mutationFn: async (c: CambioPrecio) => {
      const fila = cliente
        .getQueriesData<ListaInsumos>({ queryKey: clave })
        .flatMap(([, l]) => l?.items ?? [])
        .find((i) => i.id === c.insumoId);
      if (!fila) throw new ErrorApi(0, 'No encontramos ese precio en la lista.');
      return api<Insumo>(`/api/insumos/${c.insumoId}`, {
        metodo: 'PATCH',
        cuerpo: { version: fila.version, pu: c.puAnterior },
      });
    },
    onSuccess: (fila, c) => {
      setAviso('');
      cliente.setQueriesData<ListaInsumos>(
        { queryKey: clave },
        (l) => l && { ...l, items: l.items.map((i) => (i.id === fila.id ? fila : i)) },
      );
      setImpacto({ ...c, puAnterior: c.puNuevo, puNuevo: fila.pu });
    },
    onError: (e) => {
      setAviso(e instanceof ErrorApi ? e.message : 'No pudimos deshacer el cambio.');
      void cliente.invalidateQueries({ queryKey: clave });
    },
  });

  const { mutate, isPending } = deshacer;
  useEffect(() => {
    if (!impacto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
      const t = e.target as HTMLElement | null;
      // En un campo de texto Ctrl+Z es del navegador (deshacer lo escrito).
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      if (!isPending) mutate(impacto);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [impacto, mutate, isPending]);

  return { deshacer: () => impacto && mutate(impacto), deshaciendo: isPending };
}
