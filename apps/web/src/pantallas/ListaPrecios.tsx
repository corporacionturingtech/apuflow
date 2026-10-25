import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { precioMaterial } from 'motor';
import type { Insumo, InsumoCambio, ListaInsumos, TipoInsumo } from 'tipos';
import { HerramientaMenor } from './HerramientaMenor';
import { TablaEditable, type Columna, type FilaTabla } from '../componentes/TablaEditable';
import { api, ErrorApi } from '../lib/api';
import { money, n2, parseNum } from '../lib/formato';
import { consultaYo } from '../sesion';

export interface ConfigLista {
  tipo: TipoInsumo;
  titulo: string;
  plural: string; // para el contador y los mensajes: "materiales"
  buscar: string; // aria-label del buscador
  tabla: string; // aria-label de la tabla
  conFactor?: boolean;
  herramientaMenor?: boolean;
}

export const LISTAS: Record<'materiales' | 'equipos' | 'manoObra' | 'transporte', ConfigLista> = {
  materiales: {
    tipo: 'MA',
    titulo: 'Materiales',
    plural: 'materiales',
    buscar: 'Buscar material',
    tabla: 'Lista de materiales',
    conFactor: true,
  },
  equipos: {
    tipo: 'EQ',
    titulo: 'Equipos',
    plural: 'equipos',
    buscar: 'Buscar equipo',
    tabla: 'Lista de equipos',
    herramientaMenor: true,
  },
  manoObra: {
    tipo: 'MO',
    titulo: 'Mano de obra',
    plural: 'cargos',
    buscar: 'Buscar cargo',
    tabla: 'Lista de mano de obra',
  },
  transporte: {
    tipo: 'TR',
    titulo: 'Transporte',
    plural: 'tarifas',
    buscar: 'Buscar tarifa',
    tabla: 'Lista de transporte',
  },
};

// Texto decimal que acepta el API ("10.4"); null si no es un precio válido.
export function precioATexto(texto: string): string | null {
  const n = parseNum(texto);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(6).replace(/\.?0+$/, '') || '0';
}

const variacion = (i: Insumo) => {
  if (i.precioAnterior === null) return '';
  const d = Number(i.pu) - Number(i.precioAnterior);
  return `${money(Number(i.precioAnterior))} ${d > 0 ? '↑' : d < 0 ? '↓' : ''}`.trim();
};

export function ListaPrecios({ config }: { config: ConfigLista }) {
  const CLAVE = ['insumos', config.tipo] as const;
  const cliente = useQueryClient();
  const { data: yo } = useQuery(consultaYo);
  const [busqueda, setBusqueda] = useState('');
  const [editadas, setEditadas] = useState<ReadonlySet<string>>(new Set());
  const [aviso, setAviso] = useState('');

  const { data, isPending, error } = useQuery({
    queryKey: [...CLAVE, busqueda],
    queryFn: () =>
      api<ListaInsumos>(`/api/insumos?tipo=${config.tipo}&q=${encodeURIComponent(busqueda)}`),
    placeholderData: (previo) => previo,
  });

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
    onSuccess: (fila) => {
      setAviso('');
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

  const factor = Number(data?.factor ?? 1);
  const columnas: Columna<Insumo>[] = useMemo(
    () => [
      { id: 'codigo', titulo: 'Código', ancho: 110, ver: (i) => i.codigo, editar: (i) => i.codigo },
      {
        id: 'descripcion',
        titulo: 'Descripción',
        ancho: 420,
        ver: (i) => i.descripcion,
        editar: (i) => i.descripcion,
      },
      { id: 'unidad', titulo: 'Unidad', ancho: 80, ver: (i) => i.unidad, editar: (i) => i.unidad },
      {
        id: 'pu',
        titulo: 'P.U.',
        ancho: 120,
        alinear: 'der',
        ver: (i) => money(Number(i.pu)),
        editar: (i) => n2(Number(i.pu)).replace(/\./g, ''),
      },
      ...(config.conFactor
        ? [
            {
              id: 'puFactor',
              titulo: `P.U. × FACTOR (${factor})`,
              ancho: 170,
              alinear: 'der' as const,
              ver: (i: Insumo) => money(precioMaterial(i.pu, factor).toNumber()),
            },
          ]
        : []),
      { id: 'anterior', titulo: 'Precio referencial', ancho: 160, alinear: 'der', ver: variacion },
    ],
    [factor, config.conFactor],
  );

  const filas: FilaTabla<Insumo>[] = useMemo(() => {
    const r: FilaTabla<Insumo>[] = [];
    let seccion: string | null | undefined;
    for (const i of data?.items ?? []) {
      if (i.seccion !== seccion && i.seccion)
        r.push({ clave: `s-${i.seccion}`, seccion: i.seccion });
      seccion = i.seccion;
      r.push({ clave: i.id, dato: i });
    }
    return r;
  }, [data]);

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

  return (
    <section>
      <div className="mb-3 flex items-center gap-4">
        <h1 className="text-xl font-semibold">{config.titulo}</h1>
        <input
          type="search"
          aria-label={config.buscar}
          placeholder="Buscar por código o descripción"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-80 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <span className="text-sm text-slate-500">
          {data?.items.length ?? 0} {config.plural}
        </span>
        {puedeEscribir && (
          <span className="ml-auto text-xs text-slate-500">
            F2 o Enter para editar · flechas para moverse · Esc cancela
          </span>
        )}
      </div>
      {aviso && (
        <p role="alert" className="mb-2 rounded bg-red-50 px-3 py-1 text-sm text-red-800">
          {aviso}
        </p>
      )}
      {isPending && <p>Cargando {config.plural}…</p>}
      {error && <p role="alert">No pudimos cargar {config.plural}. Intente de nuevo.</p>}
      {data && (
        <TablaEditable
          nombre={config.tabla}
          columnas={columnas}
          filas={filas}
          editadas={editadas}
          soloLectura={!puedeEscribir}
          alGuardar={alGuardar}
        />
      )}
      {config.herramientaMenor && data && (
        <HerramientaMenor
          valor={data.herramientaMenor}
          puedeEscribir={puedeEscribir}
          clave={CLAVE}
        />
      )}
    </section>
  );
}
