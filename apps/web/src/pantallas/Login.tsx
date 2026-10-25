import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { UsuarioSesion } from 'tipos';
import { api } from '../lib/api';

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

  const campo = 'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm';
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <form
        onSubmit={entrar}
        className="w-80 rounded border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-4 text-xl font-semibold">Ingresar a APUflow</h1>
        <label className="block text-sm">
          Usuario
          <input name="usuario" autoComplete="username" required className={campo} />
        </label>
        <label className="mt-3 block text-sm">
          Clave
          <input
            name="clave"
            type="password"
            autoComplete="current-password"
            required
            className={campo}
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="mt-4 w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p className="mt-6 text-xs text-slate-400">Corporación Turingtech</p>
    </main>
  );
}
