import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { PanelValor as Panel } from 'tipos';
import { ErrorApi, api } from '../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cifra } from '../ui/cifra';
import { Input } from '../ui/input';
import { dinero, fraseFormula, horas, minutos, nombreMes } from './valor';

const hoy = () => new Date().toISOString().slice(0, 7);

export function PanelValor() {
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
  return (
    <div className="mt-6 max-w-4xl" aria-label="Panel de valor">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">Valor de APUflow en {nombreMes(mes)}</h2>
        <Input
          type="month"
          aria-label="Mes"
          value={mes}
          max={hoy()}
          onChange={(e) => e.target.value && setMes(e.target.value)}
          className="w-40"
        />
        <Link to="/resumen" search={{ mes }} className="ml-auto text-sm underline">
          Resumen para imprimir
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Cifra etiqueta="Ofertas creadas" valor={String(data.ofertasCreadas)} />
        <Cifra
          etiqueta="Ofertas emitidas"
          valor={String(data.ofertasEmitidas)}
          nota={`Monto cotizado ${dinero(data.montoCotizado)}`}
        />
        <Cifra
          etiqueta="Rubros recalculados por cambio de precio"
          valor={String(data.rubrosRecalculados)}
        />
        <Cifra
          etiqueta="Bloques reutilizados"
          valor={String(data.bloquesAplicados)}
          nota={`${data.rubrosPorBloque} rubros sin copiar a mano`}
        />
        <Cifra
          etiqueta="Ofertas en el costo objetivo"
          valor={`${data.ofertasEnObjetivo} de ${data.ofertasConObjetivo}`}
        />
        <Cifra etiqueta="Horas ahorradas (estimado)" valor={horas(data.horasAhorradas)} />
      </div>
      <Card className="mt-3 p-3 text-sm">
        <b>Cómo calculamos las horas</b>
        <p className="mt-1 text-slate-600">{fraseFormula(data.parametros)}</p>
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
    </div>
  );
}
