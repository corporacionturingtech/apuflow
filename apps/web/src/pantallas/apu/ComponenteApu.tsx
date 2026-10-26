import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Hammer, Package, Search, Truck, Wrench, X, type LucideIcon } from 'lucide-react';
import type { ApuCalculado } from 'motor';
import type { ApuDetalle, Insumo } from 'tipos';
import { api } from '../../lib/api';
import { money, n2, qty } from '../../lib/formato';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { precioATexto } from '../precio';
import type { COMPONENTES } from './calculo';

type Componente = (typeof COMPONENTES)[number];

// Los mismos íconos que las listas de precios en la navegación.
const ICONOS: Record<Componente['tipo'], LucideIcon> = {
  EQ: Wrench,
  MO: Hammer,
  MA: Package,
  TR: Truck,
};

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
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-2 top-2 size-4 text-slate-400"
        aria-hidden
      />
      <Input
        aria-label={`Añadir ${def.singular}`}
        placeholder={`Añadir ${def.singular}…`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-8 w-64 pl-8"
      />
      {q.trim() && (
        <ul className="absolute z-20 mt-1 max-h-56 w-96 overflow-auto rounded-md border border-borde bg-white text-sm shadow-lg">
          {opciones.length === 0 && <li className="px-2 py-1 text-slate-500">Sin resultados</li>}
          {opciones.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                className="block w-full px-2.5 py-1.5 text-left hover:bg-slate-50"
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
  const Icono = ICONOS[def.tipo];

  return (
    <Card asChild className="mt-4 overflow-visible">
      <section aria-label={def.titulo} data-guia={`apu-${def.tipo}`}>
        <h3 className="flex items-center gap-2.5 border-b border-borde px-4 py-2.5 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-primario/10 text-primario">
            <Icono className="size-4" aria-hidden />
          </span>
          {def.titulo}
          <Badge>{def.letra}</Badge>
          <span className="ml-auto text-sm font-normal text-slate-500">
            Subtotal {def.letra}:{' '}
            <b className="font-semibold text-slate-900 tabular-nums">
              {money(subtotal.toNumber())}
            </b>
          </span>
        </h3>
        <table className="w-full table-fixed text-sm">
          {/* Anchos fijos: las cuatro tablas del APU alinean sus columnas. */}
          <colgroup>
            <col />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-36" />
            <col className="w-12" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-1.5 pl-4">Descripción</th>
              <th>Unidad</th>
              <th className="text-right">Cantidad A</th>
              <th className="text-right">Precio B</th>
              <th className="text-right">{conRendimiento ? 'Costo D = A×B×R' : 'Costo C = A×B'}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="truncate py-1 pl-4">{l.descripcion}</td>
                <td>{l.unidad}</td>
                <td className="text-right">
                  <Input
                    key={l.cantidad}
                    aria-label={`Cantidad ${l.descripcion}`}
                    defaultValue={qty(Number(l.cantidad))}
                    disabled={!puedeEditar}
                    className="ml-auto h-7 w-20 text-right tabular-nums"
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
                    className="text-primario underline-offset-2 hover:underline"
                  >
                    {money(importes[i]?.precio.toNumber() ?? 0)}
                  </Link>
                </td>
                <td className="text-right font-medium tabular-nums">
                  {n2(importes[i]?.importe.toNumber() ?? 0)}
                </td>
                <td className="pr-2 text-right">
                  {puedeEditar && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Quitar ${l.descripcion}`}
                      title="Quitar"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => onQuitar(l.id)}
                    >
                      <X aria-hidden />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {def.tipo === 'EQ' && (
              <tr className="border-t border-slate-100 text-slate-600">
                <td className="py-1.5 pl-4">
                  Herramienta menor ({qty(Number(detalle.herramientaMenor))} % de la mano de obra)
                </td>
                <td colSpan={3} />
                <td className="text-right font-medium tabular-nums">
                  {n2(calculado.hm.toNumber())}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
        {puedeEditar && (
          <div className="border-t border-slate-100 px-4 py-2">
            <BuscadorInsumo
              def={def}
              usados={new Set(lineas.map((l) => l.insumoId))}
              onElegir={onAgregar}
            />
          </div>
        )}
      </section>
    </Card>
  );
}
