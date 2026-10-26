import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { FileSpreadsheet, FolderOpen, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import type { Oferta, OfertaDetalle } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { consultaYo } from '../sesion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cargando, Vacio } from '../ui/estado';
import { Input } from '../ui/input';
import { EstadoOferta } from './EstadoOferta';
import { dinero } from './valor';

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function Ofertas() {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const { data: yo } = useQuery(consultaYo);
  const [nombre, setNombre] = useState('');
  const [buscar, setBuscar] = useState('');
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
  const q = normal(buscar.trim());
  const items = (data?.items ?? []).filter(
    (o) => !q || normal(`${o.nombre} ${o.cliente ?? ''}`).includes(q),
  );

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold">Ofertas</h1>
      <p className="mt-1 text-sm text-slate-600">
        Cada oferta es un presupuesto completo: capítulos, rubros y totales.
      </p>
      {puedeEscribir && (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nombre.trim()) crear.mutate();
          }}
        >
          <Input
            aria-label="Nombre de la oferta"
            placeholder="Nombre de la nueva oferta"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-80"
          />
          <Button disabled={crear.isPending}>
            <Plus aria-hidden />
            Crear oferta
          </Button>
          <Button variant="outline" asChild>
            <Link to="/importar">
              <FileSpreadsheet aria-hidden />
              Importar libro de Excel
            </Link>
          </Button>
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
      {isPending && <Cargando />}
      {data && data.items.length === 0 && (
        <Vacio icono={FolderOpen} titulo="Todavía no hay ofertas" className="mt-4">
          {puedeEscribir
            ? 'Cree la primera arriba o importe su libro de Excel.'
            : 'Cuando su equipo cree una oferta, aparecerá aquí.'}
        </Vacio>
      )}
      {data && data.items.length > 0 && (
        <Card className="mt-4 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-borde px-3 py-2">
            <div className="relative w-72">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-2 left-2 size-4 text-slate-400"
              />
              <Input
                type="search"
                aria-label="Buscar ofertas"
                placeholder="Buscar por nombre o cliente"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="pl-8"
              />
            </div>
            <span className="ml-auto text-xs text-slate-500 tabular-nums">
              {items.length === data.items.length
                ? `${data.items.length} ofertas`
                : `${items.length} de ${data.items.length} ofertas`}
            </span>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              Ninguna oferta coincide con «{buscar.trim()}».
            </p>
          ) : (
            <table aria-label="Ofertas" className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Oferta</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 text-right font-medium">Rubros</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5">
                      <Link
                        to="/ofertas/$id"
                        params={{ id: o.id }}
                        data-guia={`oferta-${o.id}`}
                        className="font-medium text-slate-900 hover:text-primario hover:underline"
                      >
                        {o.nombre}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">{o.cliente ?? 'Sin cliente'}</td>
                    <td className="px-3 py-1.5 text-slate-600">
                      {o.tipo === 'publico' ? 'Pública' : 'Privada'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{o.rubros}</td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                      {dinero(o.total)}
                    </td>
                    <td className="px-3 py-1.5">
                      <EstadoOferta estado={o.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
