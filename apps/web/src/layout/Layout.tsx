import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { api } from '../lib/api';
import { consultaYo } from '../sesion';
import { BarraTotales } from './BarraTotales';

const LISTAS = [
  ['/materiales', 'Materiales'],
  ['/equipos', 'Equipos'],
  ['/mano-de-obra', 'Mano de obra'],
  ['/transporte', 'Transporte'],
] as const;
const PANTALLAS = ['Historial', 'Configuración'];
const ENLACE = 'rounded px-2 py-1.5 hover:bg-slate-800 [&.active]:bg-slate-700';

export function Layout() {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const { data: usuario } = useQuery(consultaYo);

  async function salir() {
    await api('/api/auth/logout', { metodo: 'POST' });
    cliente.setQueryData(['yo'], null);
    await navegar({ to: '/login' });
  }

  return (
    <div className="flex min-h-screen">
      <nav
        aria-label="Navegación principal"
        className="flex w-52 flex-col bg-slate-900 p-3 text-sm text-slate-200"
      >
        <span className="mb-4 px-2 text-lg font-semibold text-white">APUflow</span>
        <Link to="/" className="rounded px-2 py-1.5 hover:bg-slate-800 [&.active]:bg-slate-700">
          Inicio
        </Link>
        <span className="mt-2 px-2 text-xs uppercase text-slate-500">Listas de precios</span>
        {LISTAS.map(([to, texto]) => (
          <Link
            key={to}
            to={to}
            className="rounded px-2 py-1.5 hover:bg-slate-800 [&.active]:bg-slate-700"
          >
            {texto}
          </Link>
        ))}
        <Link
          to="/ofertas"
          className="mt-2 rounded px-2 py-1.5 hover:bg-slate-800 [&.active]:bg-slate-700"
        >
          Ofertas
        </Link>
        <Link to="/apus" className="rounded px-2 py-1.5 hover:bg-slate-800 [&.active]:bg-slate-700">
          APUs
        </Link>
        <Link
          to="/bloques"
          className="rounded px-2 py-1.5 hover:bg-slate-800 [&.active]:bg-slate-700"
        >
          Bloques
        </Link>
        {usuario?.rol === 'admin' && (
          <Link to="/usuarios" className={ENLACE}>
            Usuarios
          </Link>
        )}
        {PANTALLAS.map((p) => (
          <span key={p} aria-disabled="true" className="rounded px-2 py-1.5 text-slate-500">
            {p}
          </span>
        ))}
        <div className="mt-auto px-2 text-xs">
          <p className="text-slate-300">{usuario?.nombre}</p>
          <button onClick={salir} className="mt-1 text-slate-400 underline">
            Salir
          </button>
          <p className="mt-3 text-slate-500">Corporación Turingtech</p>
        </div>
      </nav>
      <main className="flex-1 p-6 pb-16">
        <Outlet />
      </main>
      <BarraTotales />
    </div>
  );
}
