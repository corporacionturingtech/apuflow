import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, FileUp, Mail, MessageCircle } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import type { EstadoLicencia, LicenciaEstado } from 'tipos';
import { api, ErrorApi } from '../lib/api';
import { cn } from '../lib/cn';
import { Badge, type BadgeProps } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cargando } from '../ui/estado';

export const consultaLicencia = {
  queryKey: ['licencia'],
  queryFn: () => api<LicenciaEstado>('/api/licencia/estado'),
};

const CORREO = 'info@turingtech.com.ec';
const WHATSAPP = '593990686162';

const ETIQUETA: Record<EstadoLicencia, [string, BadgeProps['variant']]> = {
  sin_licencia: ['Sin licencia (modo desarrollo)', 'neutro'],
  vigente: ['Vigente', 'exito'],
  por_vencer: ['Por vencer', 'aviso'],
  gracia: ['Vencida, en período de gracia', 'aviso'],
  solo_lectura: ['Vencida: solo lectura', 'peligro'],
};

/** `vence` llega como fecha ISO; a mediodía para que la zona horaria no la corra un día. */
function fechaLarga(iso: string) {
  const f = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
  return isNaN(f.getTime()) ? iso : f.toLocaleDateString('es-EC', { dateStyle: 'long' });
}

const plural = (n: number, palabra: string) => `${n} ${palabra}${n === 1 ? '' : 's'}`;

function explicacion(l: LicenciaEstado): string {
  const d = l.diasParaVencer;
  const vence = l.vence ? fechaLarga(l.vence) : '';
  switch (l.estado) {
    case 'sin_licencia':
      return 'Todas las funciones están habilitadas. Cargue su licencia cuando Corporación Turingtech se la entregue.';
    case 'vigente':
      return `Vence el ${vence}${d !== null ? ` (en ${plural(d, 'día')})` : ''}.`;
    case 'por_vencer':
      return `Vence el ${vence}${d !== null ? `, en ${plural(d, 'día')}` : ''}. Pida la renovación para no interrumpir el trabajo.`;
    case 'gracia':
      return `Venció el ${vence}. Puede seguir trabajando ${l.diasDeGracia !== null ? `${plural(l.diasDeGracia, 'día')} más` : 'unos días más'}; luego quedará en solo lectura.`;
    case 'solo_lectura':
      return 'Puede ver y exportar a Excel, pero no editar. Cargue una licencia vigente para volver a trabajar.';
  }
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(texto).then(() => {
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        });
      }}
    >
      {copiado ? <Check className="text-emerald-600" /> : <Copy />}
      {copiado ? 'Copiado' : 'Copiar'}
    </Button>
  );
}

function Paso({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primario/10 text-xs font-semibold text-primario">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{titulo}</p>
        <div className="mt-2">{children}</div>
      </div>
    </li>
  );
}

export function Licencia() {
  const cliente = useQueryClient();
  const { data: l } = useQuery(consultaLicencia);
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);

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
  const id = l.instalacion;
  const mensaje = `Hola, solicito la licencia de Turing APU para la instalación ${id}.`;
  const mailto = `mailto:${CORREO}?subject=${encodeURIComponent(`Licencia Turing APU – ${id}`)}&body=${encodeURIComponent(mensaje)}`;
  const whatsapp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  const tieneLicencia = l.estado !== 'sin_licencia';

  const cargar = (f: File | undefined) => {
    if (f && !subir.isPending) subir.mutate(f);
  };

  return (
    <section className="max-w-2xl">
      <h1 className="text-xl font-semibold">Configuración › Licencia</h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge variant={variante} className="px-3 py-1 text-sm">
          {texto}
        </Badge>
        <p className="text-sm text-slate-600">{explicacion(l)}</p>
      </div>

      <Card asChild className="mt-4 p-4">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {l.cliente && <Dato titulo="Cliente">{l.cliente}</Dato>}
          {l.plan && <Dato titulo="Plan">{l.plan}</Dato>}
          {l.vence && <Dato titulo="Vence">{fechaLarga(l.vence)}</Dato>}
          <Dato titulo="Usuarios activos">
            {l.usuariosActivos}
            {l.maxUsuarios ? ` de ${l.maxUsuarios}` : ''}
          </Dato>
          <Dato titulo="ID de instalación">
            <span className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-sm">{id}</code>
              <BotonCopiar texto={id} />
            </span>
          </Dato>
        </dl>
      </Card>

      <h2 className="mt-8 text-base font-semibold">
        {tieneLicencia ? 'Renovar o cambiar la licencia' : 'Obtener su licencia'}
      </h2>
      <ol className="mt-3 space-y-5">
        <Paso n={1} titulo="Envíe su ID de instalación a Corporación Turingtech">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={mailto}>
                <Mail /> Enviar por correo
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle /> Enviar por WhatsApp
              </a>
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            El mensaje ya incluye su ID. También puede escribir a {CORREO}.
          </p>
        </Paso>
        <Paso n={2} titulo="Cargue el archivo de licencia (.json) que le enviaremos">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              cargar(e.dataTransfer.files[0]);
            }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
              arrastrando ? 'border-primario bg-primario/5' : 'border-borde bg-white',
            )}
          >
            <FileUp className="size-6 text-slate-400" aria-hidden />
            <p className="text-sm text-slate-600">Arrastre el archivo aquí o</p>
            <Button onClick={() => entrada.current?.click()} disabled={subir.isPending}>
              {subir.isPending ? 'Cargando licencia…' : 'Seleccionar archivo'}
            </Button>
            <input
              ref={entrada}
              type="file"
              accept=".json,application/json"
              aria-label="Cargar archivo de licencia"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                cargar(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          {subir.isError && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {subir.error instanceof ErrorApi ? subir.error.message : 'Algo salió mal.'}
            </p>
          )}
          {subir.isSuccess && (
            <p
              role="status"
              className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            >
              Licencia cargada.{' '}
              {subir.data.vence ? `Vigente hasta el ${fechaLarga(subir.data.vence)}.` : ''}
            </p>
          )}
        </Paso>
      </ol>
    </section>
  );
}
