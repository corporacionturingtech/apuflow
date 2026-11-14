import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FileCheck2, FilePen, FileSpreadsheet, Home, ListOrdered, Plus, Zap } from 'lucide-react';
import { useState } from 'react';
import type { Oferta, SectorDemo } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { qty } from '../lib/formato';
import { iniciarMision, useGuia } from '../misiones/guia';
import { misionesDe } from '../misiones/misiones';
import { useSencilla } from '../lib/vista';
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
  const misiones = misionesDe(useSencilla());
  const [error, setError] = useState('');
  const { data } = useQuery({
    queryKey: ['ofertas'],
    queryFn: () => api<{ items: Oferta[] }>('/api/ofertas'),
  });
  const cargar = useMutation({
    mutationFn: (sector: SectorDemo) =>
      api<{ ofertaId: string }>('/api/demo/cargar', { metodo: 'POST', cuerpo: { sector } }),
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
  const cumplidas = misiones.filter((m) => guia.hechas.includes(m.id)).length;
  const siguiente = misiones.find((m) => !guia.hechas.includes(m.id))?.id;
  const misionesPendientes = cumplidas < misiones.length;
  const panelValor = yo?.rol === 'admin' && <PanelValor />;

  const bloqueMisiones = (
    <section className="mt-8 max-w-4xl" aria-label="Misiones guiadas">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-semibold">Misiones guiadas</h2>
        <span className="text-sm text-slate-500" data-testid="progreso-misiones">
          {cumplidas} de {misiones.length} cumplidas
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="Avance de las misiones"
        aria-valuemin={0}
        aria-valuemax={misiones.length}
        aria-valuenow={cumplidas}
      >
        <div
          className="h-full rounded-full bg-primario transition-all"
          style={{ width: `${(cumplidas / Math.max(misiones.length, 1)) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Tareas del día a día, paso a paso, sobre la oferta de ejemplo. Cada una le muestra qué gana
        su empresa.
      </p>
      <ol aria-label="Misiones" className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {misiones.map((m, i) => {
          const hecha = guia.hechas.includes(m.id);
          return (
            <Card asChild key={m.id}>
              <li className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-5 text-slate-500">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <b>{m.titulo}</b>
                  <span className="block text-xs text-slate-500">{m.frase}</span>
                </span>
                {hecha && <Badge variant="exito">Cumplida</Badge>}
                <Button
                  size="sm"
                  variant={hecha ? 'ghost' : m.id === siguiente ? 'default' : 'outline'}
                  onClick={() => iniciarMision(m.id)}
                >
                  {hecha ? 'Repetir' : 'Empezar'}
                </Button>
              </li>
            </Card>
          );
        })}
      </ol>
    </section>
  );

  return (
    <section>
      <div className="flex max-w-4xl flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Inicio</h1>
        {hayOfertas && (
          <>
            <Button variant="outline" asChild>
              <Link to="/importar">
                <FileSpreadsheet aria-hidden />
                Importar Excel
              </Link>
            </Button>
            <Button asChild>
              <Link to="/ofertas">
                <Plus aria-hidden />
                Nueva oferta
              </Link>
            </Button>
          </>
        )}
      </div>
      {!data && <Cargando />}
      {hayOfertas && (
        <div
          aria-label="Cifras de sus ofertas"
          className="mt-4 grid max-w-4xl grid-cols-3 gap-2 sm:gap-3"
        >
          <Cifra
            icono={FilePen}
            etiqueta="Ofertas en borrador"
            valor={String(ofertas.length - emitidas)}
          />
          <Cifra icono={FileCheck2} etiqueta="Ofertas emitidas" valor={String(emitidas)} />
          <Cifra icono={ListOrdered} etiqueta="Rubros cotizados" valor={qty(rubros)} />
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
                <span className="hidden w-40 truncate text-xs text-slate-500 sm:block">
                  {o.cliente ?? 'Sin cliente'}
                </span>
                <span className="w-28 text-right font-medium tabular-nums">{dinero(o.total)}</span>
                <EstadoOferta estado={o.estado} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {hayOfertas && misionesPendientes && bloqueMisiones}
      {panelValor}
      {data && !hayOfertas && (
        <Card className="mt-4 max-w-2xl p-4">
          <h2 className="font-semibold">Empiece con una empresa de ejemplo</h2>
          <p className="mt-1 text-sm text-slate-600">
            Elija el ejemplo más parecido a su trabajo. Trae listas de precios, APUs y bloques
            ficticios para que pruebe Turing APU sin tocar sus datos. Después puede importar su
            propio libro de Excel.
          </p>
          {yo?.rol === 'admin' ? (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Cargar empresa demo">
              <Button disabled={cargar.isPending} onClick={() => cargar.mutate('vivienda')}>
                <Home aria-hidden />
                Vivienda y obra civil
              </Button>
              <Button
                variant="outline"
                disabled={cargar.isPending}
                onClick={() => cargar.mutate('electrico')}
              >
                <Zap aria-hidden />
                Subestación eléctrica
              </Button>
              {cargar.isPending && <span className="self-center text-sm">Cargando…</span>}
            </div>
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
      {hayOfertas && !misionesPendientes && bloqueMisiones}
    </section>
  );
}
