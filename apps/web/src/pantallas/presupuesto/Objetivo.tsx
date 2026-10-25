import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { rubrosQueMasPesan } from 'motor';
import type { OfertaDetalle } from 'tipos';
import { money, n2, pct } from '../../lib/formato';
import { precioATexto } from '../precio';
import type { calcularPresupuesto } from './calculo';
import type { useCambiosOferta } from './mutaciones';

type Props = {
  data: OfertaDetalle;
  calculo: ReturnType<typeof calcularPresupuesto>;
  cambios: ReturnType<typeof useCambiosOferta>;
  soloLectura: boolean;
};

const COMPOSICION = [
  ['eq', 'Equipos', 'bg-slate-400'],
  ['mo', 'Mano de obra', 'bg-amber-500'],
  ['ma', 'Materiales', 'bg-red-500'],
  ['tra', 'Transporte', 'bg-sky-500'],
] as const;

export function Objetivo({ data, calculo, cambios, soloLectura }: Props) {
  const guardado = data.costoObjetivo ? n2(Number(data.costoObjetivo)) : '';
  const [texto, setTexto] = useState(guardado);
  useEffect(() => setTexto(guardado), [guardado]);
  const sub = calculo.totales.subtotal.toNumber();
  // Sugerencia para probar: 3 % por debajo del subtotal, redondeado al millar.
  const sugerido = Math.floor((sub * 0.97) / 1000) * 1000;

  function confirmar() {
    if (!texto.trim()) {
      if (data.costoObjetivo) cambios.cambiarObjetivo.mutate(null);
      return;
    }
    const v = precioATexto(texto);
    if (v === null || Number(v) <= 0) return setTexto(guardado);
    if (Number(v) !== Number(data.costoObjetivo)) cambios.cambiarObjetivo.mutate(v);
  }

  const g = calculo.brecha;
  const apus = new Map(data.apus.map((a) => [a.id, a]));
  const top = rubrosQueMasPesan(calculo.oferta, 8).map((k) => {
    const i = calculo.oferta.rubros.indexOf(k);
    return {
      k,
      rubro: data.rubros[i]!,
      apu: apus.get(k.rubro.apu)!,
      u: calculo.oferta.apus[k.rubro.apu]!,
    };
  });
  const objetivo = Number(data.costoObjetivo);
  const ancho = g ? (g.llego ? (sub / objetivo) * 100 : 100) : 0;
  const marca = g ? (g.llego ? 100 : (objetivo / sub) * 100) : 0;

  return (
    <section aria-label="Costo objetivo" className="mt-3 max-w-4xl rounded border p-3 text-sm">
      <p className="mb-2 text-slate-600">
        Cuando el cliente dice «esto tengo», escriba ese costo referencial. Verá cuánto falta y qué
        rubros pesan más para decidir dónde ajustar: menos gente, menos horas o un mejor precio.
      </p>
      <label className="font-medium" htmlFor="costo-objetivo">
        Costo referencial del cliente (sin IVA)
      </label>
      <div className="mt-1">
        $
        <input
          id="costo-objetivo"
          inputMode="decimal"
          autoComplete="off"
          disabled={soloLectura}
          placeholder={n2(sugerido)}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="ml-1 w-44 rounded border border-slate-300 px-2 py-1 text-right text-base"
        />
      </div>
      {g && (
        <div className="mt-2">
          <div className="relative h-3 w-full max-w-md rounded bg-slate-200">
            <div
              className={`h-3 rounded ${g.llego ? 'bg-green-600' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, ancho)}%` }}
            />
            <div
              className="absolute -top-0.5 h-4 w-0.5 bg-black"
              style={{ left: `calc(${Math.min(100, marca)}% - 2px)` }}
            />
          </div>
          <p
            role="status"
            className={`mt-1 font-semibold ${g.llego ? 'text-green-700' : 'text-red-700'}`}
          >
            {g.llego
              ? `Dentro del objetivo por ${money(-g.brecha.toNumber())}`
              : `Faltan ${money(g.brecha.toNumber())} (${pct(g.pct.toNumber())})`}
          </p>
          <p className="text-xs text-slate-500">
            Oferta sin IVA {money(sub)} frente a un costo referencial de {money(objetivo)}. La línea
            negra marca el objetivo.
          </p>
        </div>
      )}
      <h3 className="mt-4 font-semibold">Los rubros que más pesan</h3>
      <p className="text-xs text-slate-500">
        Ordenados por su peso en el costo directo. La barra muestra de qué está hecho cada uno:{' '}
        {COMPOSICION.map(([, n, c]) => (
          <span key={n} className="mr-2 inline-flex items-center gap-1">
            <i className={`inline-block h-2 w-2 ${c}`} />
            {n}
          </span>
        ))}
      </p>
      <table aria-label="Rubros que más pesan" className="mt-2 w-full">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th>#</th>
            <th>Rubro</th>
            <th className="text-right">Peso</th>
            <th className="px-3">Composición</th>
            <th className="text-right">Total ofertado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {top.map(({ k, rubro, apu, u }, i) => (
            <tr key={rubro.id} className="border-t">
              <td>{i + 1}</td>
              <td>
                {rubro.codigo} · {apu.descripcion}
              </td>
              <td className="text-right">{pct(k.peso.toNumber() * 100, 1)}</td>
              <td className="px-3">
                <span className="flex h-2 w-32 overflow-hidden rounded bg-slate-100">
                  {COMPOSICION.map(([campo, n, c]) => (
                    <i
                      key={n}
                      className={c}
                      style={{
                        width: `${u.cu.isZero() ? 0 : u[campo].div(u.cu).times(100).toNumber()}%`,
                      }}
                    />
                  ))}
                </span>
              </td>
              <td className="text-right font-medium">{money(k.totalOfertado.toNumber())}</td>
              <td className="text-right">
                <Link
                  to="/apus/$id"
                  params={{ id: apu.id }}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs"
                >
                  Abrir APU
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
