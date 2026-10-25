import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { OfertaDetalle, VersionOfertaDetalle, VersionOfertaResumen } from 'tipos';
import { ErrorApi, api } from '../../lib/api';
import { money, pct, sgn } from '../../lib/formato';
import { compararOfertas, type EstadoFila } from './comparar';

type Props = { data: OfertaDetalle; soloLectura: boolean };

const ETIQUETA: Record<EstadoFila, string> = {
  igual: '',
  cambio: 'Cambió',
  nuevo: 'Nuevo',
  quitado: 'Quitado',
};

// Sube el costo: rojo; baja: verde (como la brecha del costo objetivo).
const color = (d: number) => (d > 0 ? 'text-red-700' : d < 0 ? 'text-green-700' : 'text-slate-500');

function Diferencia({ antes, despues }: { antes: number | null; despues: number | null }) {
  const d = (despues ?? 0) - (antes ?? 0);
  const p = antes ? (d / antes) * 100 : null;
  return (
    <span className={color(d)}>
      {sgn(d)}
      {p !== null && d !== 0 ? ` (${pct(p, 1)})` : ''}
    </span>
  );
}

export function Versiones({ data, soloLectura }: Props) {
  const cliente = useQueryClient();
  const clave = ['versiones', data.id] as const;
  const [nombre, setNombre] = useState('');
  const [elegida, setElegida] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const lista = useQuery({
    queryKey: clave,
    queryFn: () => api<{ items: VersionOfertaResumen[] }>(`/api/ofertas/${data.id}/versiones`),
  });
  const detalle = useQuery({
    queryKey: ['version', data.id, elegida],
    queryFn: () => api<VersionOfertaDetalle>(`/api/ofertas/${data.id}/versiones/${elegida}`),
    enabled: !!elegida,
  });
  const guardar = useMutation({
    mutationFn: () =>
      api<VersionOfertaResumen>(`/api/ofertas/${data.id}/versiones`, {
        metodo: 'POST',
        cuerpo: { nombre },
      }),
    onSuccess: (v) => {
      setMensaje(`Versión V${v.numero} «${v.nombre}» guardada.`);
      setNombre('');
      void cliente.invalidateQueries({ queryKey: clave });
    },
    onError: (e) =>
      setMensaje(e instanceof ErrorApi ? e.message : 'No pudimos guardar la versión.'),
  });
  const comparacion = useMemo(
    () => (detalle.data ? compararOfertas(detalle.data.snapshot, data) : null),
    [detalle.data, data],
  );
  const versiones = lista.data?.items ?? [];
  const sel = versiones.find((v) => v.id === elegida);

  return (
    <section aria-label="Versiones" className="mt-3 max-w-4xl rounded border p-3 text-sm">
      <p className="mb-2 text-slate-600">
        Guarde una foto de la oferta antes de ajustar precios o cantidades; luego compárela con lo
        que tiene hoy, rubro por rubro.
      </p>
      {!soloLectura && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input
            aria-label="Nombre de la versión"
            placeholder="Ej.: Antes de negociar con el cliente"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-72 rounded border border-slate-300 px-2 py-0.5"
          />
          <button
            type="button"
            disabled={!nombre.trim() || guardar.isPending}
            onClick={() => guardar.mutate()}
            className="rounded border border-slate-300 px-2 py-0.5"
          >
            Guardar versión
          </button>
          {mensaje && <span role="status">{mensaje}</span>}
        </div>
      )}
      {versiones.length === 0 ? (
        <p className="text-slate-500">Aún no hay versiones guardadas.</p>
      ) : (
        <ul className="mb-2 flex flex-wrap gap-2">
          {versiones.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                aria-pressed={elegida === v.id}
                onClick={() => setElegida(elegida === v.id ? null : v.id)}
                className={`rounded border px-2 py-0.5 ${elegida === v.id ? 'bg-slate-900 text-white' : 'border-slate-300'}`}
              >
                V{v.numero} · {v.nombre} · {money(Number(v.total))}
              </button>
            </li>
          ))}
        </ul>
      )}
      {sel && comparacion && (
        <table aria-label={`Comparación V${sel.numero} con la actual`} className="w-full">
          <thead>
            <tr className="border-b text-left text-slate-600">
              <th className="py-1">Capítulo / rubro</th>
              <th className="text-right">V{sel.numero}</th>
              <th className="text-right">Actual</th>
              <th className="text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {comparacion.capitulos.map((c) => (
              <CapituloFilas key={c.id} c={c} />
            ))}
            <tr className="border-t">
              <td className="py-1">Subtotal</td>
              <td className="text-right">{money(comparacion.subtotal.antes)}</td>
              <td className="text-right">{money(comparacion.subtotal.despues)}</td>
              <td className="text-right">
                <Diferencia {...comparacion.subtotal} />
              </td>
            </tr>
            <tr className="font-semibold">
              <td className="py-1">Total con IVA</td>
              <td className="text-right">{money(comparacion.total.antes)}</td>
              <td className="text-right">{money(comparacion.total.despues)}</td>
              <td className="text-right">
                <Diferencia {...comparacion.total} />
              </td>
            </tr>
          </tbody>
        </table>
      )}
      {sel && comparacion && comparacion.cambios === 0 && (
        <p role="status" className="mt-1 text-slate-500">
          La oferta actual es igual a V{sel.numero}.
        </p>
      )}
    </section>
  );
}

function CapituloFilas({ c }: { c: ReturnType<typeof compararOfertas>['capitulos'][number] }) {
  return (
    <>
      <tr className="bg-slate-50 font-medium">
        <td className="py-1">{c.nombre}</td>
        <td className="text-right">{money(c.antes)}</td>
        <td className="text-right">{money(c.despues)}</td>
        <td className="text-right">
          <Diferencia antes={c.antes} despues={c.despues} />
        </td>
      </tr>
      {c.filas.map((f) => (
        <tr
          key={f.clave}
          data-estado={f.estado}
          className={f.estado === 'igual' ? 'text-slate-500' : ''}
        >
          <td className="py-0.5 pl-4">
            {f.codigo} {f.descripcion}
            {ETIQUETA[f.estado] && (
              <em className="ml-2 text-xs not-italic">{ETIQUETA[f.estado]}</em>
            )}
          </td>
          <td className="text-right">{f.antes === null ? '—' : money(f.antes)}</td>
          <td className="text-right">{f.despues === null ? '—' : money(f.despues)}</td>
          <td className="text-right">
            <Diferencia antes={f.antes} despues={f.despues} />
          </td>
        </tr>
      ))}
    </>
  );
}
