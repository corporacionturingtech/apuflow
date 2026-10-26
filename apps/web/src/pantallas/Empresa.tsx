import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { Empresa as DatosEmpresa } from 'tipos';
import { api } from '../lib/api';
import { parseNum } from '../lib/formato';

type Ficha = DatosEmpresa & { version: number };

export const consultaEmpresa = {
  queryKey: ['empresa'],
  queryFn: () => api<Ficha>('/api/empresa'),
  staleTime: 60_000,
};

const MAX_LOGO = 150_000;
const CAMPO = 'mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm';

export function Empresa() {
  const { data } = useQuery(consultaEmpresa);
  if (!data) return <p className="text-sm text-slate-500">Cargando…</p>;
  return <Formulario inicial={data} />;
}

function Formulario({ inicial }: { inicial: Ficha }) {
  const cliente = useQueryClient();
  const [f, setF] = useState({
    ...inicial,
    iva: String(Number(inicial.iva)).replace('.', ','),
  });
  const [errorLogo, setErrorLogo] = useState('');
  const poner = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((x) => ({ ...x, [k]: v }));

  const guardar = useMutation({
    mutationFn: () => {
      const iva = parseNum(f.iva);
      return api<Ficha>('/api/empresa', {
        metodo: 'PUT',
        cuerpo: { ...f, iva: Number.isFinite(iva) ? String(iva) : 'x', version: inicial.version },
      });
    },
    onSuccess: (nuevo) => {
      cliente.setQueryData(['empresa'], nuevo);
      // el IVA de la empresa entra en el total de toda oferta que no tenga el suyo
      void cliente.invalidateQueries({ queryKey: ['oferta'] });
      void cliente.invalidateQueries({ queryKey: ['ofertas'] });
    },
  });

  function leerLogo(archivo: File | undefined) {
    setErrorLogo('');
    if (!archivo) return;
    if (archivo.size > MAX_LOGO) return setErrorLogo('El logo pesa más de 150 KB');
    const lector = new FileReader();
    lector.onload = () => poner('logo', String(lector.result));
    lector.readAsDataURL(archivo);
  }

  return (
    <section className="max-w-2xl">
      <h1 className="text-xl font-semibold">Configuración › Empresa</h1>
      <form
        className="mt-4 grid grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          guardar.mutate();
        }}
      >
        <label className="col-span-2 text-sm font-medium">
          Nombre de la empresa
          <input
            className={CAMPO}
            value={f.nombre}
            onChange={(e) => poner('nombre', e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          IVA (%)
          <input
            className={CAMPO}
            inputMode="decimal"
            value={f.iva}
            onChange={(e) => poner('iva', e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Moneda (código)
          <input
            className={CAMPO}
            maxLength={3}
            value={f.moneda}
            onChange={(e) => poner('moneda', e.target.value.toUpperCase())}
          />
        </label>
        <label className="text-sm font-medium">
          Formato de números
          <select
            className={CAMPO}
            value={f.formatoNumero}
            onChange={(e) => poner('formatoNumero', e.target.value as 'es' | 'en')}
          >
            <option value="es">1.313,64 (punto de miles, coma decimal)</option>
            <option value="en">1,313.64 (coma de miles, punto decimal)</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Tipo de oferta por defecto
          <select
            className={CAMPO}
            value={f.tipoOfertaDefecto}
            onChange={(e) => poner('tipoOfertaDefecto', e.target.value as 'publico' | 'privado')}
          >
            <option value="privado">Privada</option>
            <option value="publico">Pública</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Color de acento
          <input
            type="color"
            className="mt-1 block h-8 w-16"
            value={f.acento}
            onChange={(e) => poner('acento', e.target.value)}
          />
        </label>
        <div className="text-sm font-medium">
          Logo
          <div className="mt-1 flex items-center gap-3">
            {f.logo && (
              <img src={f.logo} alt="Logo actual" className="max-h-10 rounded bg-slate-900 p-1" />
            )}
            <input
              type="file"
              aria-label="Subir logo"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={(e) => leerLogo(e.target.files?.[0])}
            />
            {f.logo && (
              <button
                type="button"
                className="text-xs underline"
                onClick={() => poner('logo', null)}
              >
                Quitar
              </button>
            )}
          </div>
          {errorLogo && (
            <p role="alert" className="mt-1 text-xs text-red-700">
              {errorLogo}
            </p>
          )}
        </div>
        <p className="col-span-2 text-sm text-slate-600">
          Las disciplinas se administran en{' '}
          <Link to="/usuarios" className="underline">
            Usuarios
          </Link>
          .
        </p>
        <div className="col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={guardar.isPending}
            className="rounded bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Guardar cambios
          </button>
          {guardar.isSuccess && (
            <span role="status" className="text-sm text-green-700">
              Cambios guardados
            </span>
          )}
          {guardar.isError && (
            <span role="alert" className="text-sm text-red-700">
              {guardar.error.message}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
