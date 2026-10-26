import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EstadoLicencia, LicenciaEstado } from 'tipos';
import { api, ErrorApi } from '../lib/api';
import { Badge, type BadgeProps } from '../ui/badge';
import { Card } from '../ui/card';
import { Cargando } from '../ui/estado';
import { Label } from '../ui/label';

export const consultaLicencia = {
  queryKey: ['licencia'],
  queryFn: () => api<LicenciaEstado>('/api/licencia/estado'),
};

const ETIQUETA: Record<EstadoLicencia, [string, BadgeProps['variant']]> = {
  sin_licencia: ['Sin licencia (modo desarrollo)', 'neutro'],
  vigente: ['Vigente', 'exito'],
  por_vencer: ['Por vencer', 'aviso'],
  gracia: ['Vencida, en período de gracia', 'aviso'],
  solo_lectura: ['Vencida: solo lectura', 'peligro'],
};

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{titulo}</dt>
      <dd className="text-sm text-slate-900">{valor}</dd>
    </div>
  );
}

export function Licencia() {
  const cliente = useQueryClient();
  const { data: l } = useQuery(consultaLicencia);

  const subir = useMutation({
    mutationFn: async (archivo: File) => {
      let cuerpo: unknown;
      try {
        cuerpo = JSON.parse(await archivo.text());
      } catch {
        throw new ErrorApi(400, 'El archivo no es una licencia válida de Turingtech');
      }
      return api<LicenciaEstado>('/api/licencia', { metodo: 'PUT', cuerpo });
    },
    onSuccess: (nueva) => cliente.setQueryData(['licencia'], nueva),
  });

  if (!l) return <Cargando />;
  const [texto, variante] = ETIQUETA[l.estado];
  const dias = l.diasParaVencer;

  return (
    <section className="max-w-2xl">
      <h1 className="text-xl font-semibold">Configuración › Licencia</h1>
      <Badge variant={variante} className="mt-4 px-3 py-1 text-sm">
        {texto}
      </Badge>
      {l.estado === 'solo_lectura' && (
        <p className="mt-2 text-sm text-slate-700">
          Puede ver y exportar a Excel, pero no editar. Suba una licencia vigente para volver a
          trabajar.
        </p>
      )}
      <Card asChild className="mt-4 p-4">
        <dl className="grid grid-cols-2 gap-4">
          {l.cliente && <Dato titulo="Cliente" valor={l.cliente} />}
          {l.plan && <Dato titulo="Plan" valor={l.plan} />}
          {l.vence && (
            <Dato
              titulo="Vence"
              valor={`${l.vence}${dias !== null ? (dias >= 0 ? ` (en ${dias} días)` : ` (hace ${-dias} días)`) : ''}`}
            />
          )}
          <Dato
            titulo="Usuarios activos"
            valor={`${l.usuariosActivos}${l.maxUsuarios ? ` de ${l.maxUsuarios}` : ''}`}
          />
          <Dato titulo="ID de instalación" valor={l.instalacion} />
        </dl>
      </Card>
      <p className="mt-2 text-xs text-slate-500">
        Envíe el ID de instalación a Corporación Turingtech para recibir su archivo de licencia.
      </p>

      <Label className="mt-6 block" htmlFor="archivo-licencia">
        Cargar archivo de licencia
      </Label>
      <input
        id="archivo-licencia"
        type="file"
        accept=".json,application/json"
        className="mt-1 text-sm file:mr-3 file:h-8 file:rounded-md file:border file:border-borde file:bg-white file:px-3 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) subir.mutate(f);
          e.target.value = '';
        }}
      />
      {subir.isError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {subir.error instanceof ErrorApi ? subir.error.message : 'Algo salió mal.'}
        </p>
      )}
      {subir.isSuccess && (
        <p role="status" className="mt-2 text-sm text-emerald-700">
          Licencia actualizada.
        </p>
      )}
    </section>
  );
}
