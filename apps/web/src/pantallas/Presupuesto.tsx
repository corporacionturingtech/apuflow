import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import type { OfertaDetalle } from 'tipos';
import { TablaEditable, type FilaTabla } from '../componentes/TablaEditable';
import { fijarTotales } from '../layout/totales';
import { api } from '../lib/api';
import { money } from '../lib/formato';
import { Tabs, TabsContent } from '../ui/tabs';
import { consultaYo } from '../sesion';
import { AnadirRubro } from './presupuesto/AnadirRubro';
import { BarraRubros } from './presupuesto/BarraRubros';
import { calcularPresupuesto } from './presupuesto/calculo';
import { Versiones } from './presupuesto/Versiones';
import { EditarApu } from './presupuesto/EditarApu';
import { Objetivo } from './presupuesto/Objetivo';
import { Indirectos } from './presupuesto/Indirectos';
import { GuardarBloque } from './presupuesto/GuardarBloque';
import { Encabezado, type Pestana } from './presupuesto/Encabezado';
import { cambioDeCelda } from './presupuesto/guardarCelda';
import { columnasPresupuesto, type FilaRubro } from './presupuesto/columnas';
import { useCambiosOferta } from './presupuesto/mutaciones';
import { useEventosOferta } from '../lib/useEventosOferta';

export function Presupuesto() {
  const { id } = useParams({ strict: false }) as { id: string };
  const clave = ['oferta', id] as const;
  const { data: yo } = useQuery(consultaYo);
  const [ofertado, setOfertado] = useState(true);
  const [plegados, setPlegados] = useState<ReadonlySet<string>>(new Set());
  const [anadiendo, setAnadiendo] = useState(false);
  const [guardandoBloque, setGuardandoBloque] = useState(false);
  const [editandoApu, setEditandoApu] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('rubros');
  const cambios = useCambiosOferta(id);
  const { aviso, editadas, guardar, anadir, quitarRubro, quitarCapitulo, anadirCapitulo } = cambios;

  const { data, error } = useQuery({
    queryKey: clave,
    queryFn: () => api<OfertaDetalle>(`/api/ofertas/${id}`),
  });

  const [ubicacion, setUbicacion] = useState<{
    capituloId: string | null;
    capitulo: string | null;
  }>({
    capituloId: null,
    capitulo: null,
  });
  const presentes = useEventosOferta(id, yo?.id, ubicacion);
  // El capítulo en el que estoy es el de la última fila que toqué.
  function alTocarFila(e: SyntheticEvent) {
    if (!data) return;
    const k = (e.target as HTMLElement).closest<HTMLElement>('[data-clave]')?.dataset.clave;
    if (!k) return;
    const capId = k.startsWith('c-') ? k.slice(2) : data.rubros.find((r) => r.id === k)?.capituloId;
    const cap = data.capitulos.find((c) => c.id === capId);
    if (cap && cap.id !== ubicacion.capituloId)
      setUbicacion({ capituloId: cap.id, capitulo: cap.nombre });
  }

  const calculo = useMemo(() => (data ? calcularPresupuesto(data) : null), [data]);

  useEffect(() => {
    if (!calculo) return;
    const t = calculo.totales;
    fijarTotales({
      subtotal: t.subtotal.toNumber(),
      iva: t.iva.toNumber(),
      total: t.total.toNumber(),
      brecha: calculo.brecha
        ? { valor: calculo.brecha.brecha.toNumber(), llego: calculo.brecha.llego }
        : undefined,
    });
    return () => fijarTotales(null);
  }, [calculo]);

  const publico = data?.tipo === 'publico';

  const filas = useMemo(() => {
    const r: FilaTabla<FilaRubro>[] = [];
    if (!data || !calculo) return r;
    const apus = new Map(data.apus.map((a) => [a.id, a]));
    const calculados = new Map(calculo.rubros.map((c, i) => [data.rubros[i]!.id, c]));
    data.capitulos.forEach((c, ci) => {
      const rubros = data.rubros.filter((x) => x.capituloId === c.id);
      const cc = calculo.capitulos[c.id]!;
      const sub = money((ofertado ? cc.totalOfertado : cc.cuTotal).toNumber());
      r.push({
        clave: `c-${c.id}`,
        seccion: `${ci + 1} · ${c.nombre}`,
        detalle: `${rubros.length} rubros · Subtotal del capítulo: ${sub}`,
        plegable: {
          plegado: plegados.has(c.id),
          alAlternar: () =>
            setPlegados((p) => {
              const n = new Set(p);
              if (!n.delete(c.id)) n.add(c.id);
              return n;
            }),
          alQuitar: () => {
            if (window.confirm(`¿Quitar el capítulo «${c.nombre}» y sus ${rubros.length} rubros?`))
              quitarCapitulo.mutate(c.id);
          },
        },
      });
      if (plegados.has(c.id)) return;
      rubros.forEach((x, ri) => {
        const a = apus.get(x.apuId)!;
        const k = calculados.get(x.id)!;
        r.push({
          clave: x.id,
          dato: {
            id: x.id,
            version: x.version,
            numero: `${ci + 1}.${ri + 1}`,
            codigo: x.codigo,
            descripcion: a.descripcion,
            unidad: a.unidad,
            cantidad: x.cantidad,
            cpc: x.cpc ?? '',
            origen: x.origen ?? '',
            vae: x.vae ?? '',
            cu: k.cu.toNumber(),
            cuTotal: k.cuTotal.toNumber(),
            pu: k.puOfertado.toNumber(),
            total: k.totalOfertado.toNumber(),
            peso: k.peso.toNumber() * 100,
          },
        });
      });
    });
    return r;
  }, [data, calculo, ofertado, plegados]);

  const columnas = useMemo(() => columnasPresupuesto(publico, ofertado), [publico, ofertado]);

  if (error)
    return (
      <p role="alert" className="text-red-700">
        No encontramos esa oferta.
      </p>
    );
  if (!data) return <p className="text-slate-500">Cargando…</p>;

  const puedeEscribir = yo?.rol === 'admin' || yo?.rol === 'cotizador';

  const soloLectura = !puedeEscribir || data.estado === 'emitida';

  function alGuardar(fila: FilaRubro, columna: string, texto: string) {
    const r = cambioDeCelda(fila, columna, texto);
    if (typeof r === 'string') return r;
    if (r) guardar.mutate({ rubroId: fila.id, cambio: r });
  }

  return (
    <Tabs
      value={pestana}
      onValueChange={(v) => setPestana(v as Pestana)}
      onClickCapture={alTocarFila}
      onFocusCapture={alTocarFila}
    >
      <Encabezado
        data={data}
        presentes={presentes}
        ofertado={ofertado}
        alCambiarVista={setOfertado}
      />
      {aviso && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {aviso}
        </p>
      )}
      <TabsContent value="indirectos">
        {calculo && (
          <Indirectos data={data} calculo={calculo} cambios={cambios} soloLectura={soloLectura} />
        )}
      </TabsContent>
      <TabsContent value="objetivo">
        {calculo && (
          <Objetivo data={data} calculo={calculo} cambios={cambios} soloLectura={soloLectura} />
        )}
      </TabsContent>
      <TabsContent value="versiones">
        <Versiones data={data} soloLectura={soloLectura} />
      </TabsContent>
      <TabsContent value="rubros">
        {!soloLectura && (
          <BarraRubros
            sinCapitulos={data.capitulos.length === 0}
            sinRubros={data.rubros.length === 0}
            alAnadirRubro={() => setAnadiendo(true)}
            alGuardarBloque={() => setGuardandoBloque(true)}
            alAnadirCapitulo={(nombre) => anadirCapitulo.mutate(nombre)}
          />
        )}
        {anadiendo && (
          <AnadirRubro
            capitulos={data.capitulos}
            alCerrar={() => setAnadiendo(false)}
            alElegir={(apuId, capituloId) => anadir.mutate({ apuId, capituloId })}
          />
        )}
        {guardandoBloque && (
          <GuardarBloque capitulos={data.capitulos} alCerrar={() => setGuardandoBloque(false)} />
        )}
        {editandoApu && (
          <EditarApu ofertaId={id} rubroId={editandoApu} alCerrar={() => setEditandoApu(null)} />
        )}
        {data.rubros.length === 0 ? (
          <p className="mt-4 text-slate-600">
            {data.capitulos.length === 0
              ? 'La oferta está vacía. Cree un capítulo para empezar.'
              : 'Este presupuesto no tiene rubros. Use «Añadir rubro» para traerlos de la biblioteca de APUs.'}
          </p>
        ) : (
          <div className="mt-3">
            <TablaEditable
              nombre="Presupuesto"
              guia="tabla-presupuesto"
              columnas={columnas}
              filas={filas}
              editadas={editadas}
              soloLectura={soloLectura}
              alGuardar={alGuardar}
              alEliminar={(f) => quitarRubro.mutate(f.id)}
              alAbrir={soloLectura ? undefined : (f) => setEditandoApu(f.id)}
            />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
