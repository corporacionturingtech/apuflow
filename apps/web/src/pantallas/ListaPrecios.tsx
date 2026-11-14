import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { SearchX, Tags } from 'lucide-react';
import type { Insumo, InsumoCambio, ListaInsumos } from 'tipos';
import { AvisoPapelera } from './AvisoPapelera';
import { BarraLista, BotonAgregar, BotonImportar } from './BarraLista';
import { columnasLista, filasLista } from './columnasLista';
import { FormularioInsumo } from './FormularioInsumo';
import { HistorialPrecios } from './HistorialPrecios';
import { HerramientaMenor } from './HerramientaMenor';
import { clavePapelera, PapeleraInsumos } from './PapeleraInsumos';
import { PanelImpacto, type CambioPrecio } from './PanelImpacto';
import { precioATexto } from './precio';
import { useDeshacerPrecio } from './useDeshacerPrecio';
import { TablaEditable } from '../componentes/TablaEditable';
import { api, ErrorApi } from '../lib/api';
import { consultaYo } from '../sesion';
import { Button } from '../ui/button';
import { Cargando, Vacio } from '../ui/estado';

import { type ConfigLista } from './configListas';

export { LISTAS, type ConfigLista } from './configListas';

export function ListaPrecios({ config }: { config: ConfigLista }) {
  const CLAVE = ['insumos', config.tipo] as const;
  const cliente = useQueryClient();
  const { data: yo } = useQuery(consultaYo);
  const [busqueda, setBusqueda] = useState('');
  const [editadas, setEditadas] = useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [verPapelera, setVerPapelera] = useState(false);
  const [deshacer, setDeshacer] = useState<Insumo | null>(null);
  const [impacto, setImpacto] = useState<CambioPrecio | null>(null);
  const [historial, setHistorial] = useState<Insumo | null>(null);
  const { deshacer: deshacerPrecio, deshaciendo } = useDeshacerPrecio(
    CLAVE,
    impacto,
    setImpacto,
    setAviso,
  );

  // La lista entera llega una vez y se filtra aquí: sin tildes y sin esperar al servidor.
  const consulta = useQuery({
    queryKey: [...CLAVE, ''],
    queryFn: () => api<ListaInsumos>(`/api/insumos?tipo=${config.tipo}`),
  });
  const { data } = consulta;
  const { data: borrados } = useQuery({
    queryKey: clavePapelera(config.tipo),
    queryFn: () => api<ListaInsumos>(`/api/insumos?tipo=${config.tipo}&papelera=true`),
  });
  const nBorrados = borrados?.items.length ?? 0;
  const seccion = useRef<HTMLElement>(null);

  const guardar = useMutation({
    mutationFn: ({ id, cambio }: { id: string; cambio: InsumoCambio }) =>
      api<Insumo>(`/api/insumos/${id}`, { metodo: 'PATCH', cuerpo: cambio }),
    onMutate: ({ id, cambio }) => {
      // Optimista: la celda ya muestra el valor nuevo mientras se guarda en segundo plano.
      const previo = cliente.getQueriesData<ListaInsumos>({ queryKey: CLAVE });
      const campos: Partial<Insumo> = { ...cambio, version: undefined } as Partial<Insumo>;
      delete campos.version;
      cliente.setQueriesData<ListaInsumos>(
        { queryKey: CLAVE },
        (l) => l && { ...l, items: l.items.map((i) => (i.id === id ? { ...i, ...campos } : i)) },
      );
      setEditadas((s) => new Set(s).add(id));
      return { previo };
    },
    onSuccess: (fila, { cambio }) => {
      setAviso('');
      if (cambio.pu !== undefined && fila.precioAnterior !== null) {
        setDeshacer(null);
        setImpacto({
          insumoId: fila.id,
          descripcion: fila.descripcion,
          puAnterior: fila.precioAnterior,
          puNuevo: fila.pu,
        });
      }
      cliente.setQueriesData<ListaInsumos>(
        { queryKey: CLAVE },
        (l) => l && { ...l, items: l.items.map((i) => (i.id === fila.id ? fila : i)) },
      );
    },
    onError: (e, _v, ctx) => {
      ctx?.previo.forEach(([k, v]) => cliente.setQueryData(k, v));
      setAviso(e instanceof ErrorApi ? e.message : 'No pudimos guardar el cambio.');
      void cliente.invalidateQueries({ queryKey: CLAVE });
    },
  });

  const refrescar = () => {
    void cliente.invalidateQueries({ queryKey: CLAVE });
    void cliente.invalidateQueries({ queryKey: clavePapelera(config.tipo) });
  };
  const moverPapelera = useMutation({
    mutationFn: ({ i, accion }: { i: Insumo; accion: 'eliminar' | 'restaurar' }) =>
      api<Insumo>(`/api/insumos/${i.id}/${accion}`, {
        metodo: 'POST',
        cuerpo: { version: i.version },
      }),
    onSuccess: (fila, { accion }) => {
      setAviso('');
      setDeshacer(accion === 'eliminar' ? fila : null);
      if (accion === 'eliminar') setImpacto(null);
    },
    onError: (e) => setAviso(e instanceof ErrorApi ? e.message : 'No pudimos completar la acción.'),
    onSettled: refrescar,
  });

  // Con un guardado en curso la versión de la fila aún es la vieja: se espera para no dar un 409 falso.
  function eliminar(i: Insumo) {
    if (guardar.isPending) return setAviso('Espere un momento: se está guardando el cambio.');
    moverPapelera.mutate({ i, accion: 'eliminar' });
  }

  const factor = Number(data?.factor ?? 1);
  const conReferencial = !!data?.items.some((i) => i.precioAnterior !== null);
  const conSecciones = !!data?.items.some((i) => i.seccion);
  const columnas = useMemo(
    () => columnasLista(factor, !!config.conFactor, conReferencial),
    [factor, config.conFactor, conReferencial],
  );
  const total = data?.items.length ?? 0;
  const { filas, cuantos } = useMemo(
    () => filasLista(data?.items ?? [], busqueda),
    [data, busqueda],
  );

  const puedeEscribir = yo?.rol === 'admin' || yo?.rol === 'precios';

  function alGuardar(fila: Insumo, columna: string, texto: string) {
    let valor = texto.trim();
    if (columna === 'pu') {
      const pu = precioATexto(texto);
      if (pu === null) return 'Escriba un precio válido, por ejemplo 10,40';
      valor = pu;
    } else if (!valor) return 'Este campo no puede quedar vacío';
    if ((fila as Record<string, unknown>)[columna] === valor) return;
    guardar.mutate({ id: fila.id, cambio: { version: fila.version, [columna]: valor } });
  }

  const irATabla = () => seccion.current?.querySelector<HTMLElement>('[role="grid"]')?.focus();
  const abrirAlta = () => setAgregando(true);

  return (
    <section ref={seccion}>
      <BarraLista
        config={config}
        busqueda={busqueda}
        alBuscar={setBusqueda}
        alIrATabla={irATabla}
        conteo={data ? { total, cuantos, factor } : null}
        conSecciones={conSecciones}
        verPapelera={verPapelera}
        nBorrados={nBorrados}
        alAlternarPapelera={() => setVerPapelera((v) => !v)}
        puedeEscribir={puedeEscribir}
        alAgregar={abrirAlta}
      />
      {agregando && puedeEscribir && !verPapelera && (
        <FormularioInsumo
          tipo={config.tipo}
          singular={config.singular}
          alCerrar={() => setAgregando(false)}
        />
      )}
      {impacto && (
        <PanelImpacto
          cambio={impacto}
          alCerrar={() => setImpacto(null)}
          alDeshacer={puedeEscribir ? deshacerPrecio : undefined}
          deshaciendo={deshaciendo}
        />
      )}
      {historial && (
        <HistorialPrecios
          insumoId={historial.id}
          descripcion={historial.descripcion}
          alCerrar={() => setHistorial(null)}
        />
      )}
      {aviso && (
        <p role="alert" className="mb-2 rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-800">
          {aviso}
        </p>
      )}
      {verPapelera && <PapeleraInsumos tipo={config.tipo} puedeEscribir={puedeEscribir} />}
      {!verPapelera && consulta.isPending && <Cargando texto={`Cargando ${config.plural}…`} />}
      {!verPapelera && consulta.isError && (
        <Vacio
          titulo={`No pudimos cargar los ${config.plural}`}
          acciones={
            <Button size="sm" variant="outline" onClick={() => void consulta.refetch()}>
              Reintentar
            </Button>
          }
        >
          Revise su conexión e intente de nuevo.
        </Vacio>
      )}
      {!verPapelera && data && total === 0 && (
        <Vacio
          icono={Tags}
          titulo={`Aún no hay ${config.plural}`}
          acciones={
            puedeEscribir && (
              <>
                <BotonAgregar config={config} alAgregar={abrirAlta} />
                <BotonImportar />
              </>
            )
          }
        >
          Agréguelos uno por uno o suba su lista de precios en Excel: los APUs los toman de aquí.
        </Vacio>
      )}
      {!verPapelera && data && total > 0 && cuantos === 0 && (
        <Vacio
          icono={SearchX}
          titulo={`Sin resultados para «${busqueda.trim()}»`}
          acciones={
            <Button size="sm" variant="outline" onClick={() => setBusqueda('')}>
              Ver todos los {config.plural}
            </Button>
          }
        >
          Busque por código
          {conSecciones ? ', parte de la descripción o sección' : ' o parte de la descripción'}; las
          tildes no importan.
        </Vacio>
      )}
      {!verPapelera && data && cuantos > 0 && (
        <TablaEditable
          nombre={config.tabla}
          guia="tabla-lista"
          columnas={columnas}
          filas={filas}
          editadas={editadas}
          soloLectura={!puedeEscribir}
          alGuardar={alGuardar}
          alEliminar={eliminar}
          alHistorial={setHistorial}
          conAcciones
        />
      )}
      {config.herramientaMenor && data && !verPapelera && (
        <HerramientaMenor
          valor={data.herramientaMenor}
          puedeEscribir={puedeEscribir}
          clave={CLAVE}
        />
      )}
      {deshacer && (
        <AvisoPapelera
          descripcion={deshacer.descripcion}
          deshaciendo={moverPapelera.isPending}
          alDeshacer={() => moverPapelera.mutate({ i: deshacer, accion: 'restaurar' })}
          alCerrar={() => setDeshacer(null)}
        />
      )}
    </section>
  );
}
