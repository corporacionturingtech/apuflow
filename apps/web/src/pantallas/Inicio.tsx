import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FilePen, FileCheck2, ListOrdered, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { Oferta } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { qty } from '../lib/formato';
import { iniciarMision, useGuia } from '../misiones/guia';
import { MISIONES } from '../misiones/misiones';
import { consultaYo } from '../sesion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cifra } from '../ui/cifra';
import { Cargando } from '../ui/estado';
import { EstadoOferta } from './EstadoOferta';
import { PanelValor } from './PanelValor';
import { dinero } from './valor';

const RECIENTES = 5;

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

  const ofertas = data?.items ?? [];
  const hayOfertas = ofertas.length > 0;
  const emitidas = ofertas.filter((o) => o.estado === 'emitida').length;
  const rubros = ofertas.reduce((n, o) => n + o.rubros, 0);
  return (
    <section>
      <h1 className="text-xl font-semibold">Inicio</h1>
      {!data && <Cargando />}
      {hayOfertas && (
        <div aria-label="Cifras de sus ofertas" className="mt-4 grid max-w-4xl grid-cols-3 gap-3">
          <Cifra
            icono={FilePen}
            etiqueta="Ofertas en borrador"
            valor={String(ofertas.length - emitidas)}
          />
          <Cifra icono={FileCheck2} etiqueta="Ofertas emitidas (todas)" valor={String(emitidas)} />
          <Cifra icono={ListOrdered} etiqueta="Rubros presupuestados" valor={qty(rubros)} />
        </div>
      )}
      {hayOfertas && (
        <Card className="mt-4 max-w-4xl overflow-hidden" aria-label="Ofertas recientes">
          <div className="flex items-center border-b border-borde px-3 py-2">
            <h2 className="font-semibold">Ofertas recientes</h2>
            <Button variant="link" asChild className="ml-auto text-sm">
              <Link to="/ofertas">Ver todas</Link>
            </Button>
          </div>
          <ul className="divide-y divide-borde text-sm">
            {ofertas.slice(0, RECIENTES).map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                <Link
                  to="/ofertas/$id"
                  params={{ id: o.id }}
                  className="min-w-0 flex-1 truncate font-medium hover:text-primario hover:underline"
                >
                  {o.nombre}
                </Link>
                <span className="text-xs text-slate-500">{o.cliente ?? 'Sin cliente'}</span>
                <span className="w-32 text-right font-medium tabular-nums">{dinero(o.total)}</span>
                <EstadoOferta estado={o.estado} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {yo?.rol === 'admin' && <PanelValor />}
      {data && !hayOfertas && (
        <Card className="mt-4 max-w-2xl p-4">
          <h2 className="font-semibold">Empiece con una empresa de ejemplo</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cargamos una subestación ficticia con sus listas de precios, APUs y bloques, para que
            pruebe APUflow sin tocar sus datos. Después puede importar su propio libro de Excel.
          </p>
          {yo?.rol === 'admin' ? (
            <Button className="mt-3" disabled={cargar.isPending} onClick={() => cargar.mutate()}>
              <Sparkles aria-hidden />
              {cargar.isPending ? 'Cargando…' : 'Cargar empresa demo'}
            </Button>
          ) : (
            <p className="mt-3 text-sm">Pídale a un administrador que cargue la empresa demo.</p>
          )}
          <p className="mt-2 text-sm">
            ¿Ya tiene su libro?{' '}
            <Button variant="link" asChild>
              <Link to="/importar">Importe su libro de Excel</Link>
            </Button>
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </Card>
      )}
      {hayOfertas && (
        <div className="mt-6 max-w-4xl">
          <h2 className="font-semibold">Misiones guiadas</h2>
          <p className="mt-1 text-sm text-slate-600">
            Siete tareas del día a día, paso a paso, sobre la oferta de ejemplo. Cada una le muestra
            qué gana su empresa.
          </p>
          <ol aria-label="Misiones" className="mt-3 space-y-2">
            {MISIONES.map((m, i) => {
              const hecha = guia.hechas.includes(m.id);
              return (
                <Card asChild key={m.id}>
                  <li className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-5 text-slate-500">{i + 1}</span>
                    <span className="flex-1">
                      <b>{m.titulo}</b>
                      <span className="block text-xs text-slate-500">{m.frase}</span>
                    </span>
                    {hecha && <Badge variant="exito">Cumplida</Badge>}
                    <Button
                      size="sm"
                      variant={hecha ? 'ghost' : 'outline'}
                      onClick={() => iniciarMision(m.id)}
                    >
                      {hecha ? 'Repetir' : 'Empezar'}
                    </Button>
                  </li>
                </Card>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
