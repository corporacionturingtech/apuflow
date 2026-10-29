import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { UsuarioSesion } from 'tipos';
import { CircleCheck } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { LogoTuringApu } from '../ui/LogoTuringApu';

const VENTAJAS = [
  'Cambie un precio y vea al instante qué APUs y rubros se recalcularon.',
  'Arme una bahía completa con un clic usando sus bloques.',
  'Exporte a Excel en el formato de siempre, con fórmulas.',
];

export function Login() {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setEnviando(true);
    setError('');
    try {
      const u = await api<UsuarioSesion>('/api/auth/login', {
        metodo: 'POST',
        cuerpo: { nombreUsuario: datos.get('usuario'), clave: datos.get('clave') },
      });
      cliente.setQueryData(['yo'], u);
      await navegar({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-primario/30 blur-3xl"
        />
        <LogoTuringApu variante="oscuro" descriptor className="relative text-2xl" />
        <div className="relative max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Sus presupuestos y APUs, siempre cuadrados.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            {VENTAJAS.map((v) => (
              <li key={v} className="flex items-start gap-2.5">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-primario" aria-hidden />
                {v}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">Turing APU · Corporación Turingtech</p>
      </section>
      <section className="flex flex-col items-center justify-center p-6">
        <form onSubmit={entrar} className="w-full max-w-sm">
          <LogoTuringApu descriptor className="mb-8 text-xl lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight">Ingresar a Turing APU</h1>
          <p className="mt-1 text-sm text-slate-500">Use el usuario que le asignó su empresa.</p>
          <div className="mt-8 space-y-4">
            <Label className="block">
              Usuario
              <Input name="usuario" autoComplete="username" required className="mt-1.5 h-10" />
            </Label>
            <Label className="block">
              Clave
              <Input
                name="clave"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1.5 h-10"
              />
            </Label>
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200"
            >
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={enviando} className="mt-6 w-full">
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
        <p className="mt-10 text-xs text-slate-400 lg:hidden">
          Turing APU · Corporación Turingtech
        </p>
      </section>
    </main>
  );
}
