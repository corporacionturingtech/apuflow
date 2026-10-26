import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EstadoLicencia, LicenciaEstado } from 'tipos';
import { api, ErrorApi } from '../lib/api';

export const consultaLicencia = {
  queryKey: ['licencia'],
  queryFn: () => api<LicenciaEstado>('/api/licencia/estado'),
};

const ETIQUETA: Record<EstadoLicencia, [string, string]> = {
  sin_licencia: ['Sin licencia (modo desarrollo)', 'bg-slate-200 text-slate-800'],
  vigente: ['Vigente', 'bg-green-100 text-green-800'],
  por_vencer: ['Por vencer', 'bg-amber-100 text-amber-800'],
  gracia: ['Vencida, en período de gracia', 'bg-orange-100 text-orange-800'],
  solo_lectura: ['Vencida: solo lectura', 'bg-red-100 text-red-800'],
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

  if (!l) return <p className="text-sm text-slate-500">Cargando…</p>;
  const [texto, color] = ETIQUETA[l.estado];
  const dias = l.diasParaVencer;

  return (
    <section className="max-w-2xl">
      <h1 className="text-xl font-semibold">Configuración › Licencia</h1>
      <p className={`mt-4 inline-block rounded-full px-3 py-1 text-sm font-medium ${color}`}>
        {texto}
      </p>
      {l.estado === 'solo_lectura' && (
        <p className="mt-2 text-sm text-slate-700">
          Puede ver y exportar a Excel, pero no editar. Suba una licencia vigente para volver a
          trabajar.
        </p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-4">
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
      <p className="mt-2 text-xs text-slate-500">
        Envíe el ID de instalación a Corporación Turingtech para recibir su archivo de licencia.
      </p>

      <label className="mt-6 block text-sm font-medium" htmlFor="archivo-licencia">
        Cargar archivo de licencia
      </label>
      <input
        id="archivo-licencia"
        type="file"
        accept=".json,application/json"
        className="mt-1 text-sm"
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
      {subir.isSuccess && <p className="mt-2 text-sm text-green-700">Licencia actualizada.</p>}
    </section>
  );
}
