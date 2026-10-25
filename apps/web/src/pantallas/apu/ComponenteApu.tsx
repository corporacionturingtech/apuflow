import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ApuCalculado } from 'motor';
import type { ApuDetalle, Insumo } from 'tipos';
import { api } from '../../lib/api';
import { money, n2, qty } from '../../lib/formato';
import { precioATexto } from '../precio';
import type { COMPONENTES } from './calculo';

type Componente = (typeof COMPONENTES)[number];

interface Props {
  def: Componente;
  detalle: ApuDetalle;
  calculado: ApuCalculado;
  puedeEditar: boolean;
  onCantidad: (lineaId: string, cantidad: string) => void;
  onQuitar: (lineaId: string) => void;
  onAgregar: (insumoId: string) => void;
}

function BuscadorInsumo({
  def,
  usados,
  onElegir,
}: {
  def: Componente;
  usados: Set<string>;
  onElegir: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['insumos', def.tipo, 'buscar-apu', q],
    queryFn: () =>
      api<{ items: Insumo[] }>(`/api/insumos?tipo=${def.tipo}&q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
  });
  const opciones = (data?.items ?? []).filter((i) => !usados.has(i.id)).slice(0, 8);
  return (
    <div className="relative mt-2">
      <input
        aria-label={`Añadir ${def.singular}`}
        placeholder={`+ Añadir ${def.singular}…`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-64 rounded border border-slate-300 px-2 py-1 text-sm"
      />
      {q.trim() && (
        <ul className="absolute z-10 mt-1 max-h-56 w-96 overflow-auto rounded border border-slate-300 bg-white text-sm shadow">
          {opciones.length === 0 && <li className="px-2 py-1 text-slate-500">Sin resultados</li>}
          {opciones.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                className="block w-full px-2 py-1 text-left hover:bg-slate-100"
                onClick={() => {
                  onElegir(i.id);
                  setQ('');
                }}
              >
                <code className="mr-2 text-xs">{i.codigo}</code>
                {i.descripcion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ComponenteApu({
  def,
  detalle,
  calculado,
  puedeEditar,
  onCantidad,
  onQuitar,
  onAgregar,
}: Props) {
  const lineas = detalle.lineasApu.filter((l) => l.tipo === def.tipo);
  const importes = calculado[def.clave];
  const subtotal = { EQ: calculado.eq, MO: calculado.mo, MA: calculado.ma, TR: calculado.tra }[
    def.tipo
  ];
  const conRendimiento = def.tipo === 'EQ' || def.tipo === 'MO';

  return (
    <section className="mt-5" aria-label={def.titulo}>
      <h3 className="flex items-baseline justify-between border-b border-slate-300 pb-1 font-semibold">
        {def.titulo}
        <span className="text-sm font-normal">
          Subtotal {def.letra}: <b className="tabular-nums">{money(subtotal.toNumber())}</b>
        </span>
      </h3>
      <table className="mt-1 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="py-1">Descripción</th>
            <th>Unidad</th>
            <th className="text-right">Cantidad A</th>
            <th className="text-right">Precio B</th>
            <th className="text-right">{conRendimiento ? 'Costo D = A×B×R' : 'Costo C = A×B'}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lineas.map((l, i) => (
            <tr key={l.id} className="border-t border-slate-100">
              <td className="py-1">{l.descripcion}</td>
              <td>{l.unidad}</td>
              <td className="text-right">
                <input
                  key={l.cantidad}
                  aria-label={`Cantidad ${l.descripcion}`}
                  defaultValue={qty(Number(l.cantidad))}
                  disabled={!puedeEditar}
                  className="w-20 rounded border border-slate-300 px-1 text-right tabular-nums"
                  onBlur={(e) => {
                    const t = precioATexto(e.target.value);
                    if (t === null) e.target.value = qty(Number(l.cantidad));
                    else if (Number(t) !== Number(l.cantidad)) onCantidad(l.id, t);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </td>
              <td className="text-right tabular-nums">
                <Link
                  to={def.lista}
                  title={`Este precio vive en la lista de ${def.titulo}`}
                  className="underline"
                >
                  {money(importes[i]?.precio.toNumber() ?? 0)}
                </Link>
              </td>
              <td className="text-right font-medium tabular-nums">
                {n2(importes[i]?.importe.toNumber() ?? 0)}
              </td>
              <td className="text-right">
                {puedeEditar && (
                  <button
                    type="button"
                    aria-label={`Quitar ${l.descripcion}`}
                    title="Quitar"
                    className="px-1 text-slate-400 hover:text-red-600"
                    onClick={() => onQuitar(l.id)}
                  >
                    ✕
                  </button>
                )}
              </td>
            </tr>
          ))}
          {def.tipo === 'EQ' && (
            <tr className="border-t border-slate-100">
              <td className="py-1">
                Herramienta menor ({qty(Number(detalle.herramientaMenor))} % de la mano de obra)
              </td>
              <td colSpan={3} />
              <td className="text-right font-medium tabular-nums">{n2(calculado.hm.toNumber())}</td>
              <td />
            </tr>
          )}
        </tbody>
      </table>
      {puedeEditar && (
        <BuscadorInsumo
          def={def}
          usados={new Set(lineas.map((l) => l.insumoId))}
          onElegir={onAgregar}
        />
      )}
    </section>
  );
}
