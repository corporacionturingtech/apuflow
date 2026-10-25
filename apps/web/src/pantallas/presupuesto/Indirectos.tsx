import { useEffect, useState } from 'react';
import type { OfertaDetalle } from 'tipos';
import { money, pct } from '../../lib/formato';
import { precioATexto } from '../precio';
import type { calcularPresupuesto } from './calculo';
import type { useCambiosOferta } from './mutaciones';

type Props = {
  data: OfertaDetalle;
  calculo: ReturnType<typeof calcularPresupuesto>;
  cambios: ReturnType<typeof useCambiosOferta>;
  soloLectura: boolean;
};

/** Campo de porcentaje: guarda al salir o con Enter; si el texto no vale, vuelve al valor guardado. */
function CampoPorcentaje(p: {
  etiqueta: string;
  valor: string;
  deshabilitado: boolean;
  alGuardar: (v: string) => void;
}) {
  const mostrar = (v: string) => String(Number(v)).replace('.', ',');
  const [texto, setTexto] = useState(mostrar(p.valor));
  useEffect(() => setTexto(mostrar(p.valor)), [p.valor]);
  const confirmar = () => {
    const v = precioATexto(texto);
    if (v === null || Number(v) > 100) return setTexto(mostrar(p.valor));
    if (Number(v) !== Number(p.valor)) p.alGuardar(v);
  };
  return (
    <input
      aria-label={p.etiqueta}
      inputMode="decimal"
      disabled={p.deshabilitado}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-20 rounded border border-slate-300 px-2 py-0.5 text-right"
    />
  );
}

export function Indirectos({ data, calculo, cambios, soloLectura }: Props) {
  const t = calculo.totales;
  return (
    <section
      aria-label="Indirectos y utilidad"
      className="mt-3 max-w-xl rounded border p-3 text-sm"
    >
      <p className="mb-2 text-slate-600">
        Cada porcentaje se aplica sobre el costo directo de cada APU y cambia el precio unitario
        ofertado de todos los rubros.
      </p>
      <table className="w-full">
        <tbody>
          {data.indirectos.map((i) => (
            <tr key={i.id}>
              <td className="py-0.5">{i.nombre}</td>
              <td className="text-right">
                <CampoPorcentaje
                  etiqueta={`Porcentaje ${i.nombre}`}
                  valor={i.porcentaje}
                  deshabilitado={soloLectura}
                  alGuardar={(porcentaje) =>
                    cambios.cambiarIndirecto.mutate({ indId: i.id, porcentaje })
                  }
                />{' '}
                %
              </td>
            </tr>
          ))}
          <tr className="border-t font-medium">
            <td className="py-0.5">Total indirectos y utilidad</td>
            <td className="text-right">{pct(t.pctIndirectos.toNumber())}</td>
          </tr>
          <tr>
            <td className="py-0.5">IVA</td>
            <td className="text-right">
              <CampoPorcentaje
                etiqueta="Porcentaje de IVA"
                valor={data.iva}
                deshabilitado={soloLectura}
                alGuardar={(v) => cambios.cambiarIva.mutate(v)}
              />{' '}
              %
            </td>
          </tr>
        </tbody>
      </table>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-0.5">
        <dt>Costo directo de la oferta</dt>
        <dd className="text-right">{money(t.cuTotalOferta.toNumber())}</dd>
        <dt>Indirectos y utilidad ({pct(t.pctIndirectos.toNumber())})</dt>
        <dd className="text-right">{money(t.indirectos.toNumber())}</dd>
        <dt>Subtotal sin IVA</dt>
        <dd className="text-right">{money(t.subtotal.toNumber())}</dd>
        <dt>IVA ({pct(Number(data.iva), 0)})</dt>
        <dd className="text-right">{money(t.iva.toNumber())}</dd>
        <dt className="font-semibold">Total de la oferta</dt>
        <dd className="text-right font-semibold">{money(t.total.toNumber())}</dd>
      </dl>
    </section>
  );
}
