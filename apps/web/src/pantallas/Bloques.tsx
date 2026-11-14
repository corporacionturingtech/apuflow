import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Blocks, Search, SearchX, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BloquesRespuesta } from 'tipos';
import { api } from '../lib/api';
import { cn } from '../lib/cn';
import { normalizar, plural } from '../lib/disciplina';
import { consultaYo } from '../sesion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cargando, Vacio } from '../ui/estado';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { AvisoBloque } from './bloques/AvisoBloque';
import { useAccionesBloque } from './bloques/useAccionesBloque';
import { COLUMNAS_BLOQUE, FilaBloque } from './bloques/FilaBloque';
import { FiltroDisciplina } from '../componentes/FiltroDisciplina';

const SIN_DISCIPLINA = 'Sin disciplina';

export function Bloques() {
  const { data: yo } = useQuery(consultaYo);
  const [papelera, setPapelera] = useState(false);
  const activos = useQuery({
    queryKey: ['bloques'],
    queryFn: () => api<BloquesRespuesta>('/api/bloques'),
  });
  const borrados = useQuery({
    queryKey: ['bloques', 'papelera'],
    queryFn: () => api<BloquesRespuesta>('/api/bloques?papelera=1'),
  });
  const { data: ofertas } = useQuery({
    queryKey: ['ofertas'],
    queryFn: () => api<{ items: { id: string; nombre: string; estado: string }[] }>('/api/ofertas'),
  });
  const [ofertaId, setOfertaId] = useState('');
  const [q, setQ] = useState('');
  const [disciplina, setDisciplina] = useState('');

  const consulta = papelera ? borrados : activos;
  const data = consulta.data;
  const puedeEscribir = yo?.rol === 'admin' || yo?.rol === 'cotizador';
  // La API las ordena por última modificación: la primera es la oferta en la que se trabaja.
  const borradores = (ofertas?.items ?? []).filter((o) => o.estado !== 'emitida');
  const destino = borradores.some((o) => o.id === ofertaId) ? ofertaId : (borradores[0]?.id ?? '');
  const todos = useMemo(() => data?.items ?? [], [data]);
  const apus = useMemo(() => new Map((data?.apus ?? []).map((a) => [a.id, a])), [data]);

  const conteo = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of todos) {
      const d = b.disciplina ?? SIN_DISCIPLINA;
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return m;
  }, [todos]);
  const visibles = useMemo(() => {
    const t = normalizar(q.trim());
    return todos.filter(
      (b) =>
        (!disciplina || (b.disciplina ?? SIN_DISCIPLINA) === disciplina) &&
        (!t || normalizar(b.nombre).includes(t)),
    );
  }, [todos, q, disciplina]);
  const filtrando = q.trim() !== '' || disciplina !== '';
  const limpiar = () => {
    setQ('');
    setDisciplina('');
  };
  const { anadir, quitarCapitulo, borrar, restaurar, aviso, setAviso, error } =
    useAccionesBloque(destino);

  const bloqueo = !destino
    ? 'Primero cree una oferta en borrador.'
    : anadir.isPending
      ? 'Añadiendo…'
      : '';
  const nBorrados = borrados.data?.items.length ?? 0;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {papelera ? 'Papelera de bloques' : 'Bloques de rubros'}
        </h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {todos.length > 0 && (
            <span aria-live="polite">
              {filtrando
                ? `${visibles.length} de ${plural(todos.length, 'bloque', 'bloques')}`
                : plural(todos.length, 'bloque', 'bloques')}
            </span>
          )}
          {(papelera || nBorrados > 0) && (
            <Button
              size="sm"
              variant={papelera ? 'outline' : 'ghost'}
              aria-pressed={papelera}
              onClick={() => {
                setPapelera((v) => !v);
                limpiar();
              }}
            >
              {papelera ? (
                'Volver a los bloques'
              ) : (
                <>
                  <Trash2 aria-hidden />
                  Papelera ({nBorrados})
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {papelera
          ? 'Los bloques borrados se pueden restaurar con sus rubros y cantidades.'
          : 'Un bloque entra completo a la oferta como capítulo. Escriba cuántas veces (o el tamaño real) y vea el costo antes de añadirlo.'}
      </p>

      {puedeEscribir && !papelera && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-borde bg-white px-3 py-2 text-sm shadow-xs">
          {borradores.length > 0 ? (
            <>
              <label htmlFor="oferta-destino" className="font-medium text-slate-700">
                Oferta destino
              </label>
              <Select
                id="oferta-destino"
                value={destino}
                onChange={(e) => setOfertaId(e.target.value)}
                className="max-w-full sm:w-96"
              >
                {borradores.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </Select>
              <span className="text-xs text-slate-500">
                {ofertaId ? 'Elegida por usted.' : 'La oferta en borrador que modificó al último.'}
              </span>
            </>
          ) : !ofertas ? (
            <span className="text-slate-500">Cargando sus ofertas…</span>
          ) : (
            <>
              <span className="text-slate-700">
                Para añadir un bloque necesita una oferta en borrador.
              </span>
              <Button size="sm" asChild>
                <Link to="/ofertas">Crear una oferta</Link>
              </Button>
            </>
          )}
        </div>
      )}

      {todos.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="search"
              aria-label="Buscar bloque"
              placeholder="Buscar por nombre"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQ('')}
              className="pl-8"
            />
          </div>
          <FiltroDisciplina
            conteo={conteo}
            total={todos.length}
            valor={disciplina}
            alCambiar={setDisciplina}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {consulta.isPending && <Cargando texto="Cargando bloques…" />}
      {consulta.isError && (
        <Vacio
          titulo="No pudimos cargar los bloques"
          className="mt-4"
          acciones={
            <Button size="sm" variant="outline" onClick={() => void consulta.refetch()}>
              Reintentar
            </Button>
          }
        >
          Revise su conexión e intente de nuevo.
        </Vacio>
      )}
      {data && todos.length === 0 && !papelera && (
        <Vacio
          icono={Blocks}
          titulo="Aún no hay bloques"
          className="mt-4"
          acciones={
            <Button variant="outline" size="sm" asChild>
              <Link to="/ofertas">Ir a las ofertas</Link>
            </Button>
          }
        >
          Abra un presupuesto y use «Guardar como bloque» en un capítulo: la próxima vez entra
          completo con un clic.
        </Vacio>
      )}
      {data && todos.length === 0 && papelera && (
        <Vacio icono={Trash2} titulo="La papelera está vacía" className="mt-4" />
      )}
      {data && todos.length > 0 && visibles.length === 0 && (
        <Vacio
          icono={SearchX}
          titulo={
            q.trim() ? `Ningún bloque coincide con «${q.trim()}»` : 'Ningún bloque en ese filtro'
          }
          className="mt-4"
          acciones={
            <Button variant="outline" size="sm" onClick={limpiar}>
              Ver todos los bloques
            </Button>
          }
        />
      )}

      {data && visibles.length > 0 && (
        <Card className="mt-4 overflow-hidden">
          <div
            aria-hidden
            className={cn(
              COLUMNAS_BLOQUE,
              'border-b border-borde bg-slate-50/70 py-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500',
            )}
          >
            <span />
            <span>Bloque</span>
            <span className="hidden md:block">{papelera ? '' : 'Cantidad'}</span>
            <span className="hidden text-right md:block">Costo directo</span>
            <span />
          </div>
          <ul className="divide-y divide-borde">
            {visibles.map((b, i) => (
              <FilaBloque
                key={b.id}
                b={b}
                data={data}
                apus={apus}
                guia={i === 0}
                puedeEscribir={puedeEscribir}
                bloqueo={bloqueo}
                alAnadir={(valor) => anadir.mutate({ b, valor })}
                alBorrar={() => borrar.mutate(b)}
                alRestaurar={() => restaurar.mutate(b)}
              />
            ))}
          </ul>
          {!papelera && (
            <p className="border-t border-borde bg-slate-50/70 px-3 py-1.5 text-xs text-slate-500">
              Costo directo, sin indirectos ni IVA: la oferta suma sus propios indirectos al
              añadirlo.
            </p>
          )}
        </Card>
      )}

      {aviso && (
        <AvisoBloque
          aviso={aviso}
          deshaciendo={quitarCapitulo.isPending || restaurar.isPending}
          alDeshacer={() =>
            aviso.tipo === 'anadido'
              ? quitarCapitulo.mutate(aviso)
              : aviso.tipo === 'borrado' && restaurar.mutate(aviso.bloque)
          }
          alCerrar={() => setAviso(null)}
        />
      )}
    </div>
  );
}
