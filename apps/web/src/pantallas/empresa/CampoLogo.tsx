import { ImageUp } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { LogoTuringApu } from '../../ui/LogoTuringApu';

// 150 KB de archivo son ~200 KB en base64, el tope que acepta la API.
const MAX_LOGO = 150_000;
const TIPOS = ['image/png', 'image/jpeg', 'image/svg+xml'];

/** Logo con vista previa sobre el fondo del menú lateral, que es donde se muestra. */
export function CampoLogo({
  logo,
  nombre,
  onCambio,
}: {
  logo: string | null;
  nombre: string;
  onCambio: (logo: string | null) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [arrastrando, setArrastrando] = useState(false);

  function leer(archivo: File | undefined) {
    setError('');
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) return setError('Suba una imagen PNG, JPG o SVG.');
    if (archivo.size > MAX_LOGO)
      return setError(`El logo pesa ${Math.ceil(archivo.size / 1000)} KB; el máximo es 150 KB.`);
    const lector = new FileReader();
    lector.onload = () => onCambio(String(lector.result));
    lector.readAsDataURL(archivo);
  }

  return (
    <div className="sm:col-span-2">
      <span id="emp-logo" className="text-sm font-medium text-slate-700">
        Logo
      </span>
      <div
        role="group"
        aria-labelledby="emp-logo"
        aria-describedby="emp-logo-ayuda"
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          leer(e.dataTransfer.files[0]);
        }}
        className={cn(
          'mt-1 flex flex-wrap items-center gap-4 rounded-lg border border-dashed p-3 transition-colors',
          arrastrando ? 'border-primario bg-primario/5' : 'border-borde',
        )}
      >
        <div className="flex h-14 w-full shrink-0 items-center sm:w-48 justify-center rounded-md bg-slate-950 px-3">
          {logo ? (
            <img src={logo} alt={`Logo de ${nombre}`} className="max-h-9 max-w-full" />
          ) : (
            <LogoTuringApu variante="oscuro" className="text-sm opacity-60" />
          )}
        </div>
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => entrada.current?.click()}>
              <ImageUp aria-hidden />
              {logo ? 'Cambiar logo' : 'Subir logo'}
            </Button>
            {logo && (
              <Button type="button" variant="ghost" onClick={() => onCambio(null)}>
                Quitar
              </Button>
            )}
          </div>
          <p id="emp-logo-ayuda" className="mt-1.5 text-xs text-slate-500">
            {logo ? '' : 'Sin logo se muestra el de Turing APU. '}
            PNG, JPG o SVG hasta 150 KB; también puede arrastrarlo aquí. Se ve en el menú lateral.
          </p>
        </div>
        <input
          ref={entrada}
          type="file"
          accept={TIPOS.join(',')}
          aria-label="Subir logo"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            leer(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
