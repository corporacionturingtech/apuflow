import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import type { OfertaDetalle } from 'tipos';
import { TablaEditable, type FilaTabla } from '../componentes/TablaEditable';
import { fijarTotales } from '../layout/totales';
import { api } from '../lib/api';
import { money } from '../lib/formato';
import { consultaYo } from '../sesion';
import { AnadirRubro } from './presupuesto/AnadirRubro';
import { calcularPresupuesto } from './presupuesto/calculo';
import { columnasPresupuesto, type FilaRubro } from './presupuesto/columnas';
import { useCambiosOferta } from './presupuesto/mutaciones';
import { precioATexto } from './precio';

export function Presupuesto() {
  const { id } = useParams({ strict: false }) as { id: string };
  const clave = ['oferta', id] as const;
  const { data: yo } = useQuery(consultaYo);
  const [ofertado, setOfertado] = useState(true);
  const [plegados, setPlegados] = useState<ReadonlySet<string>>(new Set());
  const [anadiendo, setAnadiendo] = useState(false);
  const [nuevoCapitulo, setNuevoCapitulo] = useState('');
  const { aviso, editadas, guardar, anadir, quitarRubro, quitarCapitulo, anadirCapitulo } =
    useCambiosOferta(id);

  const { data, error } = useQuery({
    queryKey: clave,
    queryFn: () => api<OfertaDetalle>(`/api/ofertas/${id}`),
  });

  const calculo = useMemo(() => (data ? calcularPresupuesto(data) : null), [data]);

  useEffect(() => {
    if (!calculo) return;
    const t = calculo.totales;
    fijarTotales({
      subtotal: t.subtotal.toNumber(),
      iva: t.iva.toNumber(),
      total: t.total.toNumber(),
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
        seccion: `${ci + 1} · ${c.nombre} — ${rubros.length} rubros · Subtotal del capítulo: ${sub}`,
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

  function alGuardar(fila: FilaRubro, columna: string, texto: string) {
    const t = texto.trim();
    const cambio = (c: Parameters<typeof guardar.mutate>[0]['cambio']) =>
      guardar.mutate({ rubroId: fila.id, cambio: c });
    if (columna === 'cantidad') {
      const valor = precioATexto(texto);
      if (valor === null) return 'Escriba una cantidad válida, por ejemplo 12,5';
      if (Number(valor) !== Number(fila.cantidad)) cambio({ cantidad: valor });
    } else if (columna === 'codigo') {
      if (!t) return 'El código no puede quedar vacío';
      if (t !== fila.codigo) cambio({ codigo: t });
    } else if (columna === 'cpc') {
      if (t !== fila.cpc) cambio({ cpc: t || null });
    } else if (columna === 'origen') {
      const o = t.toUpperCase();
      if (o && !['P', 'ND', 'I'].includes(o)) return 'El origen es P, ND o I';
      if (o !== fila.origen) cambio({ origen: (o || null) as 'P' | 'ND' | 'I' | null });
    } else if (columna === 'vae') {
      const valor = t ? precioATexto(t) : null;
      if (t && (valor === null || Number(valor) > 100)) return 'Escriba un VAE entre 0 y 100';
      if ((valor ?? '') !== (fila.vae ? String(Number(fila.vae)) : '')) cambio({ vae: valor });
    }
  }

  function anadirCap() {
    const nombre = nuevoCapitulo.trim();
    if (!nombre) return;
    anadirCapitulo.mutate(nombre);
    setNuevoCapitulo('');
  }

  return (
    <div>
      <Link to="/ofertas" className="text-sm underline">
        ← Todas las ofertas
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-6">
        <h1 className="text-xl font-semibold">{data.nombre}</h1>
        <span className="text-sm text-slate-600">
          {data.cliente ?? 'Sin cliente'} · {publico ? 'Oferta pública (SERCOP)' : 'Oferta privada'}{' '}
          · {data.rubros.length} rubros
        </span>
        <div role="group" aria-label="Qué columnas ver" className="ml-auto flex gap-1 text-sm">
          {[
            [false, 'Costo directo'],
            [true, 'Ofertado'],
          ].map(([v, texto]) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={ofertado === v}
              onClick={() => setOfertado(v as boolean)}
              className={`rounded border px-2 py-0.5 ${ofertado === v ? 'bg-slate-900 text-white' : 'border-slate-300'}`}
            >
              {texto as string}
            </button>
          ))}
        </div>
      </div>
      {aviso && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {aviso}
        </p>
      )}
      {puedeEscribir && data.estado !== 'emitida' && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            disabled={data.capitulos.length === 0}
            onClick={() => setAnadiendo(true)}
            className="rounded border border-slate-300 px-2 py-0.5"
          >
            Añadir rubro
          </button>
          <input
            aria-label="Nombre del capítulo nuevo"
            placeholder="Nombre del capítulo"
            value={nuevoCapitulo}
            onChange={(e) => setNuevoCapitulo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && anadirCap()}
            className="w-56 rounded border border-slate-300 px-2 py-0.5"
          />
          <button
            type="button"
            onClick={anadirCap}
            className="rounded border border-slate-300 px-2 py-0.5"
          >
            Añadir capítulo
          </button>
        </div>
      )}
      {anadiendo && (
        <AnadirRubro
          capitulos={data.capitulos}
          alCerrar={() => setAnadiendo(false)}
          alElegir={(apuId, capituloId) => anadir.mutate({ apuId, capituloId })}
        />
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
            columnas={columnas}
            filas={filas}
            editadas={editadas}
            soloLectura={!puedeEscribir || data.estado === 'emitida'}
            alGuardar={alGuardar}
            alEliminar={(f) => quitarRubro.mutate(f.id)}
          />
        </div>
      )}
    </div>
  );
}
