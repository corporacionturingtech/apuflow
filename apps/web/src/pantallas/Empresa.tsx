import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { esquemaEmpresaCambio, type Empresa as DatosEmpresa } from 'tipos';
import { api } from '../lib/api';
import { parseNum, simboloDe } from '../lib/formato';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Cargando } from '../ui/estado';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { CampoAcento } from './empresa/CampoAcento';
import { CampoLogo } from './empresa/CampoLogo';
import { Seccion } from './empresa/Seccion';

type Ficha = DatosEmpresa & { version: number };
type Datos = Omit<Ficha, 'version'>;

export const consultaEmpresa = {
  queryKey: ['empresa'],
  queryFn: () => api<Ficha>('/api/empresa'),
  staleTime: 60_000,
};

const CAMPOS = [
  'nombre',
  'iva',
  'moneda',
  'formatoNumero',
  'tipoOfertaDefecto',
  'vista',
  'acento',
  'logo',
] as const;

function aFormulario(ficha: Ficha): Datos {
  const d: Datos & { version?: number } = { ...ficha };
  delete d.version;
  return { ...d, iva: String(Number(d.iva)).replace('.', ',') };
}

export function Empresa() {
  const { data } = useQuery(consultaEmpresa);
  if (!data) return <Cargando />;
  return <Formulario inicial={data} />;
}

function Formulario({ inicial }: { inicial: Ficha }) {
  const cliente = useQueryClient();
  const base = aFormulario(inicial);
  const [f, setF] = useState(base);
  const [errores, setErrores] = useState<Partial<Record<keyof Datos, string>>>({});
  const hayCambios = CAMPOS.some((k) => f[k] !== base[k]);

  const guardar = useMutation({
    mutationFn: (cuerpo: unknown) => api<Ficha>('/api/empresa', { metodo: 'PUT', cuerpo }),
    onSuccess: (nuevo) => {
      cliente.setQueryData(['empresa'], nuevo);
      setF(aFormulario(nuevo));
      // el IVA de la empresa entra en el total de toda oferta que no tenga el suyo
      void cliente.invalidateQueries({ queryKey: ['oferta'] });
      void cliente.invalidateQueries({ queryKey: ['ofertas'] });
    },
  });
  const { isSuccess, reset } = guardar;

  useEffect(() => {
    if (!isSuccess) return;
    const t = setTimeout(reset, 4000);
    return () => clearTimeout(t);
  }, [isSuccess, reset]);

  useEffect(() => {
    if (!hayCambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  const poner = <K extends keyof Datos>(k: K, v: Datos[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrores((e) => ({ ...e, [k]: undefined }));
    if (!guardar.isPending) guardar.reset();
  };

  function enviar() {
    const iva = parseNum(f.iva);
    const cuerpo = {
      ...f,
      iva: Number.isFinite(iva) ? String(iva) : 'x',
      version: inicial.version,
    };
    const r = esquemaEmpresaCambio.safeParse(cuerpo);
    if (!r.success) {
      const nuevos: typeof errores = {};
      for (const i of r.error.issues) {
        const k = i.path[0] as keyof Datos;
        nuevos[k] ??=
          k === 'iva' && i.code !== 'custom' ? 'Escriba un número, p. ej. 15' : i.message;
      }
      setErrores(nuevos);
      const primero = CAMPOS.find((k) => nuevos[k]);
      // centrado, para que la barra fija de guardar no lo tape
      const malo = document.getElementById(`emp-${primero}`);
      malo?.focus({ preventScroll: true });
      malo?.scrollIntoView({ block: 'center' });
      return;
    }
    guardar.mutate(cuerpo);
  }

  // ejemplo vivo: cómo saldrá una cifra con la moneda y el formato elegidos
  const ejemplo = `${simboloDe(f.moneda.trim().toUpperCase() || 'USD')} ${
    f.formatoNumero === 'es' ? '1.313,64' : '1,313.64'
  }`;

  const campo = (k: keyof Datos, ayuda?: boolean) => ({
    id: `emp-${k}`,
    'aria-invalid': !!errores[k],
    'aria-describedby': errores[k] || ayuda ? `emp-${k}-nota` : undefined,
  });
  const nota = (k: keyof Datos, ayuda?: ReactNode) =>
    errores[k] ? (
      <p id={`emp-${k}-nota`} className="mt-1 text-xs text-red-700">
        {errores[k]}
      </p>
    ) : ayuda ? (
      <p id={`emp-${k}-nota`} className="mt-1 text-xs text-slate-500">
        {ayuda}
      </p>
    ) : null;

  return (
    <section className="max-w-3xl">
      <h1 className="text-xl font-semibold">Configuración › Empresa</h1>
      <p className="mt-1 text-sm text-slate-600">
        Datos que usan todas las ofertas y la marca con que se ve el sistema.
      </p>
      <Card asChild className="mt-4">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <Seccion titulo="Identidad" descripcion="Nombre, logo y color con que se ve el sistema.">
            <div className="sm:col-span-2">
              <Label htmlFor="emp-nombre">Nombre de la empresa</Label>
              <Input
                {...campo('nombre')}
                className="mt-1"
                value={f.nombre}
                onChange={(e) => poner('nombre', e.target.value)}
              />
              {nota('nombre')}
            </div>
            <CampoLogo logo={f.logo} nombre={f.nombre} onCambio={(v) => poner('logo', v)} />
            <CampoAcento acento={f.acento} onCambio={(v) => poner('acento', v)} />
          </Seccion>

          <Seccion
            titulo="Cifras y moneda"
            descripcion="Cómo se calculan y se escriben los montos."
          >
            <div>
              <Label htmlFor="emp-iva">IVA (%)</Label>
              <Input
                {...campo('iva', true)}
                className="mt-1"
                inputMode="decimal"
                value={f.iva}
                onChange={(e) => poner('iva', e.target.value)}
              />
              {nota('iva', 'Se aplica a toda oferta que no tenga su propio IVA.')}
            </div>
            <div>
              <Label htmlFor="emp-moneda">Moneda (código)</Label>
              <Input
                {...campo('moneda', true)}
                className="mt-1 uppercase"
                maxLength={3}
                value={f.moneda}
                onChange={(e) => poner('moneda', e.target.value.toUpperCase())}
              />
              {nota('moneda', 'Código de 3 letras: USD, PEN, EUR…')}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="emp-formatoNumero">Formato de números</Label>
              <Select
                {...campo('formatoNumero', true)}
                className="mt-1 block w-full"
                value={f.formatoNumero}
                onChange={(e) => poner('formatoNumero', e.target.value as 'es' | 'en')}
              >
                <option value="es">1.313,64 (punto de miles, coma decimal)</option>
                <option value="en">1,313.64 (coma de miles, punto decimal)</option>
              </Select>
              {nota(
                'formatoNumero',
                <>
                  Un monto se verá así:{' '}
                  <span className="font-medium text-slate-900 tabular-nums">{ejemplo}</span>
                </>,
              )}
            </div>
          </Seccion>

          <Seccion
            titulo="Ofertas"
            descripcion="Valores con que nace cada oferta y qué se muestra."
          >
            <div className="sm:col-span-2">
              <Label htmlFor="emp-tipoOfertaDefecto">Tipo de oferta por defecto</Label>
              <Select
                {...campo('tipoOfertaDefecto', true)}
                className="mt-1 block w-full"
                value={f.tipoOfertaDefecto}
                onChange={(e) =>
                  poner('tipoOfertaDefecto', e.target.value as 'publico' | 'privado')
                }
              >
                <option value="privado">Privada</option>
                <option value="publico">Pública</option>
              </Select>
              {nota(
                'tipoOfertaDefecto',
                'Con el que nace cada oferta nueva; se puede cambiar en ella.',
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="emp-vista">Vista del sistema</Label>
              <Select
                {...campo('vista', true)}
                className="mt-1 block w-full"
                value={f.vista}
                onChange={(e) => poner('vista', e.target.value as 'completa' | 'sencilla')}
              >
                <option value="completa">Completa (equipo con varias personas)</option>
                <option value="sencilla">Sencilla (para quien presupuesta solo)</option>
              </Select>
              {nota(
                'vista',
                'La sencilla esconde Historial, Costo objetivo, Versiones y quién más está en la oferta. No se borra nada: puede volver a la completa cuando quiera.',
              )}
            </div>
            <p className="text-xs text-slate-500 sm:col-span-2">
              Las disciplinas se administran en{' '}
              <Link to="/usuarios" className="font-medium text-primario hover:underline">
                Usuarios
              </Link>
              .
            </p>
          </Seccion>

          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-b-lg border-t border-borde bg-slate-50/95 px-5 py-3 backdrop-blur">
            <Button type="submit" disabled={!hayCambios || guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            {hayCambios && !guardar.isPending && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setF(base);
                  setErrores({});
                  guardar.reset();
                }}
              >
                Descartar
              </Button>
            )}
            {guardar.isSuccess && (
              <span role="status" className="flex items-center gap-1 text-sm text-emerald-700">
                <Check className="size-4" aria-hidden />
                Cambios guardados
              </span>
            )}
            {guardar.isError && (
              <span role="alert" className="text-sm text-red-700">
                {guardar.error.message}
              </span>
            )}
            {hayCambios && !guardar.isError && (
              <span className="ml-auto text-xs text-slate-500">Hay cambios sin guardar</span>
            )}
          </div>
        </form>
      </Card>
    </section>
  );
}
