import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import type { OfertaDetalle } from 'tipos';
import { TablaEditable, type Columna, type FilaTabla } from '../componentes/TablaEditable';
import { fijarTotales } from '../layout/totales';
import { ErrorApi, api } from '../lib/api';
import { money, pct, qty } from '../lib/formato';
import { consultaYo } from '../sesion';
import { calcularPresupuesto } from './presupuesto/calculo';
import { precioATexto } from './precio';

interface FilaRubro {
  id: string;
  version: number;
  numero: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: string;
  cpc: string;
  origen: string;
  vae: string;
  cu: number;
  cuTotal: number;
  pu: number;
  total: number;
  peso: number;
}

export function Presupuesto() {
  const { id } = useParams({ strict: false }) as { id: string };
  const clave = ['oferta', id] as const;
  const cliente = useQueryClient();
  const { data: yo } = useQuery(consultaYo);
  const [aviso, setAviso] = useState('');
  const [ofertado, setOfertado] = useState(true);
  const [editadas, setEditadas] = useState<ReadonlySet<string>>(new Set());

  const { data, error } = useQuery({
    queryKey: clave,
    queryFn: () => api<OfertaDetalle>(`/api/ofertas/${id}`),
  });

  const guardar = useMutation({
    // Una cola por oferta: cada cambio lee la versión que dejó el anterior (sin 409 falsos).
    scope: { id: `oferta-${id}` },
    mutationFn: ({ rubroId, valor }: { rubroId: string; valor: string }) => {
      const version = cliente
        .getQueryData<OfertaDetalle>(clave)!
        .rubros.find((r) => r.id === rubroId)!.version;
      return api<{ id: string; cantidad: string; version: number }>(`/api/rubros/${rubroId}`, {
        metodo: 'PATCH',
        cuerpo: { version, cantidad: valor },
      });
    },
    onMutate: ({ rubroId, valor }) => {
      // Optimista: los totales se recalculan con el motor antes de que responda el servidor.
      cliente.setQueryData<OfertaDetalle>(
        clave,
        (d) =>
          d && {
            ...d,
            rubros: d.rubros.map((r) => (r.id === rubroId ? { ...r, cantidad: valor } : r)),
          },
      );
      setEditadas((s) => new Set(s).add(rubroId));
    },
    onSuccess: (fila) => {
      setAviso('');
      cliente.setQueryData<OfertaDetalle>(
        clave,
        (d) =>
          d && {
            ...d,
            rubros: d.rubros.map((r) => (r.id === fila.id ? { ...r, version: fila.version } : r)),
          },
      );
    },
    onError: (e) => {
      setAviso(e instanceof ErrorApi ? e.message : 'No pudimos guardar el cambio.');
      void cliente.invalidateQueries({ queryKey: clave });
    },
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
      });
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
  }, [data, calculo, ofertado]);

  const columnas: Columna<FilaRubro>[] = useMemo(
    () => [
      { id: 'numero', titulo: 'Número', ancho: 70, ver: (f) => f.numero },
      { id: 'codigo', titulo: 'Código', ancho: 80, ver: (f) => f.codigo },
      { id: 'descripcion', titulo: 'Descripción del rubro', ancho: 380, ver: (f) => f.descripcion },
      ...(publico
        ? [
            { id: 'cpc', titulo: 'CPC', ancho: 100, ver: (f: FilaRubro) => f.cpc },
            { id: 'origen', titulo: 'Origen', ancho: 70, ver: (f: FilaRubro) => f.origen },
            { id: 'vae', titulo: 'VAE %', ancho: 80, ver: (f: FilaRubro) => f.vae },
          ]
        : []),
      { id: 'unidad', titulo: 'Unidad', ancho: 70, ver: (f) => f.unidad },
      {
        id: 'cantidad',
        titulo: 'Cantidad',
        ancho: 110,
        alinear: 'der',
        ver: (f) => qty(Number(f.cantidad)),
        editar: (f) => qty(Number(f.cantidad)).replace(/\./g, ''),
      },
      ofertado
        ? { id: 'pu', titulo: 'P.U. ofertado', ancho: 130, alinear: 'der', ver: (f) => money(f.pu) }
        : {
            id: 'cu',
            titulo: 'CU (costo directo)',
            ancho: 140,
            alinear: 'der',
            ver: (f) => money(f.cu),
          },
      ofertado
        ? {
            id: 'total',
            titulo: 'Total ofertado',
            ancho: 140,
            alinear: 'der',
            ver: (f) => money(f.total),
          }
        : {
            id: 'cuTotal',
            titulo: 'CU total',
            ancho: 140,
            alinear: 'der',
            ver: (f) => money(f.cuTotal),
          },
      { id: 'peso', titulo: 'Peso', ancho: 80, alinear: 'der', ver: (f) => pct(f.peso) },
    ],
    [publico, ofertado],
  );

  if (error)
    return (
      <p role="alert" className="text-red-700">
        No encontramos esa oferta.
      </p>
    );
  if (!data) return <p className="text-slate-500">Cargando…</p>;

  const puedeEscribir = yo?.rol === 'admin' || yo?.rol === 'cotizador';

  function alGuardar(fila: FilaRubro, columna: string, texto: string) {
    if (columna !== 'cantidad') return;
    const valor = precioATexto(texto);
    if (valor === null) return 'Escriba una cantidad válida, por ejemplo 12,5';
    if (Number(valor) === Number(fila.cantidad)) return;
    guardar.mutate({ rubroId: fila.id, valor });
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
      {data.rubros.length === 0 ? (
        <p className="mt-4 text-slate-600">
          La oferta está vacía. Los rubros se añaden desde bloques y la biblioteca de APUs.
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
          />
        </div>
      )}
    </div>
  );
}
