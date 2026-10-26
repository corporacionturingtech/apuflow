import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import {
  Blocks,
  Building2,
  FileSpreadsheet,
  Hammer,
  History,
  House,
  KeyRound,
  Layers,
  LogOut,
  Package,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Rol } from 'tipos';
import { api } from '../lib/api';
import { fijarFormato } from '../lib/formato';
import { consultaEmpresa } from '../pantallas/Empresa';
import { consultaYo } from '../sesion';
import { AvisoLicencia } from './AvisoLicencia';
import { BarraGuia } from '../misiones/BarraGuia';
import { BarraTotales } from './BarraTotales';

interface Enlace {
  to: string;
  texto: string;
  icono: LucideIcon;
  guia?: string;
  soloAdmin?: boolean;
}

const GRUPOS: { titulo?: string; enlaces: Enlace[] }[] = [
  {
    enlaces: [
      { to: '/', texto: 'Inicio', icono: House, guia: 'nav-inicio' },
      { to: '/ofertas', texto: 'Ofertas', icono: FileSpreadsheet, guia: 'nav-ofertas' },
      { to: '/apus', texto: 'APUs', icono: Layers, guia: 'nav-apus' },
      { to: '/bloques', texto: 'Bloques', icono: Blocks, guia: 'nav-bloques' },
    ],
  },
  {
    titulo: 'Listas de precios',
    enlaces: [
      { to: '/materiales', texto: 'Materiales', icono: Package, guia: 'nav-materiales' },
      { to: '/equipos', texto: 'Equipos', icono: Wrench, guia: 'nav-equipos' },
      { to: '/mano-de-obra', texto: 'Mano de obra', icono: Hammer, guia: 'nav-mano-de-obra' },
      { to: '/transporte', texto: 'Transporte', icono: Truck, guia: 'nav-transporte' },
    ],
  },
  {
    titulo: 'Control',
    enlaces: [{ to: '/historial', texto: 'Historial', icono: History, guia: 'nav-historial' }],
  },
  {
    titulo: 'Configuración',
    enlaces: [
      { to: '/usuarios', texto: 'Usuarios', icono: Users, soloAdmin: true },
      { to: '/configuracion/empresa', texto: 'Empresa', icono: Building2, soloAdmin: true },
      { to: '/configuracion/licencia', texto: 'Licencia', icono: KeyRound, soloAdmin: true },
    ],
  },
];

const ROL: Record<Rol, string> = {
  admin: 'Administrador',
  precios: 'Precios',
  cotizador: 'Cotizador',
  lector: 'Consulta',
};

const iniciales = (nombre = '') =>
  nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

// La barra de acento a la izquierda marca la página actual sin teñir todo el enlace.
const ENLACE =
  'flex h-8 items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100 [&.active]:bg-white/10 [&.active]:font-medium [&.active]:text-white [&.active]:shadow-[inset_3px_0_0_var(--acento)] [&_svg]:size-4 [&_svg]:shrink-0';

export function Layout() {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const { data: usuario } = useQuery(consultaYo);
  const { data: empresa, isPending: cargandoEmpresa } = useQuery(consultaEmpresa);
  if (empresa) fijarFormato(empresa.moneda, empresa.formatoNumero);
  const admin = usuario?.rol === 'admin';

  async function salir() {
    await api('/api/auth/logout', { metodo: 'POST' });
    cliente.setQueryData(['yo'], null);
    await navegar({ to: '/login' });
  }

  return (
    <div
      className="flex min-h-screen"
      style={empresa ? ({ '--acento': empresa.acento } as React.CSSProperties) : undefined}
    >
      <nav
        aria-label="Navegación principal"
        className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-slate-950 px-3 pb-14 pt-4 text-[13px]"
      >
        <div className="mb-5 flex h-9 items-center px-2.5">
          {empresa?.logo ? (
            <img src={empresa.logo} alt={empresa.nombre} className="max-h-9 max-w-full" />
          ) : (
            <span className="flex items-center gap-2 text-base font-semibold tracking-tight text-white">
              <span className="grid size-6 place-items-center rounded-md bg-primario text-[11px] font-bold">
                A
              </span>
              APUflow
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {GRUPOS.map((g) => {
            const enlaces = g.enlaces.filter((e) => !e.soloAdmin || admin);
            if (!enlaces.length) return null;
            return (
              <div key={g.titulo ?? 'principal'} className="flex flex-col gap-0.5">
                {g.titulo && (
                  <span className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    {g.titulo}
                  </span>
                )}
                {enlaces.map(({ to, texto, icono: Icono, guia }) => (
                  <Link key={to} to={to} data-guia={guia} className={ENLACE}>
                    <Icono aria-hidden />
                    {texto}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white">
              {iniciales(usuario?.nombre)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-100">{usuario?.nombre}</p>
              <p className="truncate text-xs text-slate-500">{usuario && ROL[usuario.rol]}</p>
            </div>
            <button
              type="button"
              onClick={salir}
              aria-label="Salir"
              title="Salir"
              className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mt-3 px-1 text-[11px] text-slate-600">Corporación Turingtech</p>
        </div>
      </nav>
      <main className="min-w-0 flex-1 px-6 pb-20 pt-5">
        <BarraGuia />
        <AvisoLicencia />
        {/* sin esperar, el cambio de formato remontaría la pantalla a mitad de una carga */}
        {!cargandoEmpresa && <Outlet key={`${empresa?.moneda}-${empresa?.formatoNumero}`} />}
      </main>
      <BarraTotales />
    </div>
  );
}
