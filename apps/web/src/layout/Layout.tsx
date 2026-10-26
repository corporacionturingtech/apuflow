import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { api } from '../lib/api';
import { fijarFormato } from '../lib/formato';
import { consultaEmpresa } from '../pantallas/Empresa';
import { consultaYo } from '../sesion';
import { AvisoLicencia } from './AvisoLicencia';
import { BarraGuia } from '../misiones/BarraGuia';
import { BarraTotales } from './BarraTotales';

const LISTAS = [
  ['/materiales', 'Materiales'],
  ['/equipos', 'Equipos'],
  ['/mano-de-obra', 'Mano de obra'],
  ['/transporte', 'Transporte'],
] as const;
const ENLACE = 'rounded px-2 py-1.5 hover:bg-slate-800 [&.active]:bg-[var(--acento)]';

export function Layout() {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const { data: usuario } = useQuery(consultaYo);
  const { data: empresa, isPending: cargandoEmpresa } = useQuery(consultaEmpresa);
  if (empresa) fijarFormato(empresa.moneda, empresa.formatoNumero);

  async function salir() {
    await api('/api/auth/logout', { metodo: 'POST' });
    cliente.setQueryData(['yo'], null);
    await navegar({ to: '/login' });
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ '--acento': empresa?.acento ?? '#334155' } as React.CSSProperties}
    >
      <nav
        aria-label="Navegación principal"
        className="flex w-52 flex-col bg-slate-900 p-3 text-sm text-slate-200"
      >
        {empresa?.logo ? (
          <img src={empresa.logo} alt={empresa.nombre} className="mb-4 max-h-12 self-start px-2" />
        ) : (
          <span className="mb-4 px-2 text-lg font-semibold text-white">APUflow</span>
        )}
        <Link to="/" data-guia="nav-inicio" className={ENLACE}>
          Inicio
        </Link>
        <span className="mt-2 px-2 text-xs uppercase text-slate-500">Listas de precios</span>
        {LISTAS.map(([to, texto]) => (
          <Link key={to} to={to} data-guia={`nav-${to.slice(1)}`} className={ENLACE}>
            {texto}
          </Link>
        ))}
        <Link
          to="/ofertas"
          data-guia="nav-ofertas"
          className="mt-2 rounded px-2 py-1.5 hover:bg-slate-800 [&.active]:bg-[var(--acento)]"
        >
          Ofertas
        </Link>
        <Link to="/apus" data-guia="nav-apus" className={ENLACE}>
          APUs
        </Link>
        <Link
          to="/bloques"
          data-guia="nav-bloques"
          className="rounded px-2 py-1.5 hover:bg-slate-800 [&.active]:bg-[var(--acento)]"
        >
          Bloques
        </Link>
        {usuario?.rol === 'admin' && (
          <Link to="/usuarios" className={ENLACE}>
            Usuarios
          </Link>
        )}
        <Link to="/historial" data-guia="nav-historial" className={ENLACE}>
          Historial
        </Link>
        {usuario?.rol === 'admin' && (
          <>
            <Link to="/configuracion/empresa" className={ENLACE}>
              Empresa
            </Link>
            <Link to="/configuracion/licencia" className={ENLACE}>
              Licencia
            </Link>
          </>
        )}
        <div className="mt-auto px-2 text-xs">
          <p className="text-slate-300">{usuario?.nombre}</p>
          <button onClick={salir} className="mt-1 text-slate-400 underline">
            Salir
          </button>
          <p className="mt-3 text-slate-500">Corporación Turingtech</p>
        </div>
      </nav>
      <main className="flex-1 p-6 pb-16">
        <BarraGuia />
        <AvisoLicencia />
        {/* sin esperar, el cambio de formato remontaría la pantalla a mitad de una carga */}
        {!cargandoEmpresa && <Outlet key={`${empresa?.moneda}-${empresa?.formatoNumero}`} />}
      </main>
      <BarraTotales />
    </div>
  );
}
