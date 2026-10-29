import { useQuery } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import type { PanelValor } from 'tipos';
import { api } from '../lib/api';
import { dinero, fraseFormula, horas, nombreMes } from './valor';

export function ResumenMensual() {
  const { mes } = useSearch({ strict: false }) as { mes?: string };
  const { data } = useQuery({
    queryKey: ['valor', mes ?? 'actual'],
    queryFn: () => api<PanelValor>(`/api/valor${mes ? `?mes=${mes}` : ''}`),
  });
  if (!data) return null;
  const filas: [string, string][] = [
    ['Ofertas creadas', String(data.ofertasCreadas)],
    ['Ofertas emitidas', String(data.ofertasEmitidas)],
    ['Monto cotizado', dinero(data.montoCotizado)],
    ['Rubros recalculados por cambio de precio', String(data.rubrosRecalculados)],
    ['Bloques reutilizados', String(data.bloquesAplicados)],
    ['Rubros que no hubo que copiar a mano', String(data.rubrosPorBloque)],
    ['Ofertas en el costo objetivo', `${data.ofertasEnObjetivo} de ${data.ofertasConObjetivo}`],
    ['Horas ahorradas (estimado)', horas(data.horasAhorradas)],
  ];
  return (
    <article className="mx-auto max-w-2xl bg-white p-8">
      <h1 className="text-xl font-semibold">{data.empresa}</h1>
      <p className="text-slate-600">Resumen de {nombreMes(data.mes)}</p>
      <table className="mt-4 w-full text-sm">
        <tbody>
          {filas.map(([k, v]) => (
            <tr key={k} className="border-b border-slate-200">
              <td className="py-1.5">{k}</td>
              <td className="py-1.5 text-right font-semibold">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-slate-600">{fraseFormula(data.parametros)}</p>
      <p className="mt-6 text-xs text-slate-500">
        Generado por Turing APU · Corporación Turingtech
      </p>
      <button
        type="button"
        onClick={() => window.print()}
        className="no-imprimir mt-4 rounded border border-slate-900 bg-slate-900 px-3 py-1 text-sm text-white"
      >
        Descargar PDF
      </button>
    </article>
  );
}
