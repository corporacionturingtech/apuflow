import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight, Clock, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PanelValor as Panel } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { useSencilla } from '../lib/vista';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cifra } from '../ui/cifra';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { dinero, fraseFormula, horas, minutos, nombreMes } from './valor';

/** Los últimos 12 meses (`aaaa-mm`), del actual hacia atrás. */
const ultimosMeses = () => {
  const d = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const f = new Date(d.getFullYear(), d.getMonth() - i, 1);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
  });
};

const hoy = () => ultimosMeses()[0]!;

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function PanelValor() {
  const sencilla = useSencilla();
  const cliente = useQueryClient();
  const [mes, setMes] = useState(hoy);
  const [rubro, setRubro] = useState('');
  const [recalculo, setRecalculo] = useState('');
  const [error, setError] = useState('');
  const { data } = useQuery({
    queryKey: ['valor', mes],
    queryFn: () => api<Panel>(`/api/valor?mes=${mes}`),
  });
  useEffect(() => {
    if (!data) return;
    setRubro(String(data.parametros.minutosPorRubro).replace('.', ','));
    setRecalculo(String(data.parametros.minutosPorRecalculo).replace('.', ','));
  }, [data]);

  const guardar = useMutation({
    mutationFn: (c: { r: number; c: number }) =>
      api('/api/valor/parametros', {
        metodo: 'PUT',
        cuerpo: {
          version: data!.version,
          minutosPorRubro: c.r,
          minutosPorRecalculo: c.c,
        },
      }),
    onSuccess: () => {
      setError('');
      return cliente.invalidateQueries({ queryKey: ['valor'] });
    },
    onError: (e) => setError(e instanceof ErrorApi ? e.message : 'No pudimos guardar los minutos.'),
  });
  const aplicar = () => {
    const r = minutos(rubro);
    const c = minutos(recalculo);
    if (r === null || c === null) return setError('Escriba minutos entre 0 y 240.');
    guardar.mutate({ r, c });
  };

  if (!data) return null;
  const sinMovimiento =
    data.ofertasCreadas === 0 &&
    data.ofertasEmitidas === 0 &&
    data.rubrosRecalculados === 0 &&
    data.bloquesAplicados === 0;
  return (
    <section className="mt-8 max-w-4xl" aria-label="Panel de valor">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-semibold">Lo que Turing APU hizo por su empresa en</h2>
        <Select
          aria-label="Mes"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="font-medium"
        >
          {ultimosMeses().map((m) => (
            <option key={m} value={m}>
              {mayuscula(nombreMes(m))}
            </option>
          ))}
        </Select>
        <Button variant="link" asChild className="ml-auto text-sm">
          <Link to="/resumen" search={{ mes }}>
            <Printer aria-hidden />
            Resumen para imprimir
          </Link>
        </Button>
      </div>
      {sinMovimiento && (
        <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Aún no hay movimiento en {nombreMes(mes)}. Cada oferta, bloque y cambio de precio suma
          aquí horas ahorradas.
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Cifra
          destacada={data.horasAhorradas > 0}
          className="col-span-2 md:col-span-1"
          icono={Clock}
          etiqueta="Horas ahorradas (estimado)"
          valor={horas(data.horasAhorradas)}
          nota={
            data.horasAhorradas > 0
              ? 'Tiempo que no se pasó copiando ni recalculando'
              : 'Aparecen al usar bloques o cambiar precios'
          }
        />
        <Cifra
          etiqueta="Ofertas emitidas"
          valor={String(data.ofertasEmitidas)}
          nota={`Monto cotizado ${dinero(data.montoCotizado)}`}
        />
        <Cifra etiqueta="Ofertas creadas" valor={String(data.ofertasCreadas)} />
        <Cifra
          etiqueta="Bloques reutilizados"
          valor={String(data.bloquesAplicados)}
          nota={`${data.rubrosPorBloque} rubros sin copiar a mano`}
        />
        <Cifra
          etiqueta="Rubros recalculados por cambio de precio"
          valor={String(data.rubrosRecalculados)}
        />
        {!sencilla && (
          <Cifra
            etiqueta="Ofertas en el costo objetivo"
            valor={
              data.ofertasConObjetivo === 0
                ? '—'
                : `${data.ofertasEnObjetivo} de ${data.ofertasConObjetivo}`
            }
            nota={data.ofertasConObjetivo === 0 ? 'Ninguna oferta tiene costo objetivo' : undefined}
          />
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">{fraseFormula(data.parametros)}</p>
      <details className="group mt-2 text-sm">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-primario hover:underline [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
          ¿Cómo calculamos las horas? Ajustar minutos
        </summary>
        <Card className="mt-2 p-3">
          <p className="text-slate-600">
            Use los minutos que su equipo tardaba a mano. Una cifra creíble vale más que una grande.
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <label className="text-xs">
              Minutos por rubro copiado a mano
              <Input
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                className="ml-2 inline-block w-16"
              />
            </label>
            <label className="text-xs">
              Minutos por rubro recalculado
              <Input
                value={recalculo}
                onChange={(e) => setRecalculo(e.target.value)}
                className="ml-2 inline-block w-16"
              />
            </label>
            <Button variant="outline" disabled={guardar.isPending} onClick={aplicar}>
              Aplicar minutos
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-red-700">
              {error}
            </p>
          )}
        </Card>
      </details>
    </section>
  );
}
