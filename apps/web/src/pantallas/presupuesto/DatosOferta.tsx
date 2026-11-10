import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import type { OfertaDetalle } from 'tipos';
import { ErrorApi, api } from '../../lib/api';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

// Nombre y cliente de la oferta: salen en el Excel que recibe el cliente.
export function DatosOferta({ data, soloLectura }: { data: OfertaDetalle; soloLectura: boolean }) {
  const cliente = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(data.nombre);
  const [paraQuien, setParaQuien] = useState(data.cliente ?? '');
  const [error, setError] = useState('');
  const guardar = useMutation({
    mutationFn: () =>
      api<OfertaDetalle>(`/api/ofertas/${data.id}`, {
        metodo: 'PATCH',
        cuerpo: { version: data.version, nombre: nombre.trim(), cliente: paraQuien.trim() || null },
      }),
    onSuccess: (o) => {
      cliente.setQueryData(['oferta', data.id], o);
      void cliente.invalidateQueries({ queryKey: ['ofertas'] });
      setAbierto(false);
      setError('');
    },
    onError: (e) => setError(e instanceof ErrorApi ? e.message : 'No pudimos guardar los datos.'),
  });

  if (soloLectura) return null;
  if (!abierto)
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setNombre(data.nombre);
          setParaQuien(data.cliente ?? '');
          setAbierto(true);
        }}
      >
        <Pencil aria-hidden />
        {data.cliente ? 'Editar datos' : 'Poner cliente'}
      </Button>
    );
  return (
    <form
      aria-label="Datos de la oferta"
      className="flex w-full flex-wrap items-center gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (nombre.trim()) guardar.mutate();
      }}
    >
      <Input
        aria-label="Nombre de la oferta"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-64"
      />
      <Input
        aria-label="Cliente"
        placeholder="Cliente (por ejemplo, Familia Torres)"
        value={paraQuien}
        onChange={(e) => setParaQuien(e.target.value)}
        className="w-64"
        autoFocus
      />
      <Button type="submit" size="sm" disabled={!nombre.trim() || guardar.isPending}>
        Guardar
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
        Cancelar
      </Button>
      {error && (
        <span role="alert" className="text-red-700">
          {error}
        </span>
      )}
    </form>
  );
}
