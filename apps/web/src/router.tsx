import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { Layout } from './layout/Layout';
import { Inicio } from './pantallas/Inicio';
import { Equipos, ManoObra, Materiales, Transporte } from './pantallas/Listas';
import { Apus } from './pantallas/Apus';
import { Bloques } from './pantallas/Bloques';
import { PantallaApu } from './pantallas/PantallaApu';
import { Importar } from './pantallas/Importar';
import { ImportarPrecios } from './pantallas/ImportarPrecios';
import { Ofertas } from './pantallas/Ofertas';
import { Presupuesto } from './pantallas/Presupuesto';
import { Historial } from './pantallas/Historial';
import { Usuarios } from './pantallas/Usuarios';
import { Empresa } from './pantallas/Empresa';
import { Licencia } from './pantallas/Licencia';
import { ResumenMensual } from './pantallas/ResumenMensual';
import { Login } from './pantallas/Login';
import { ErrorRuta, NoEncontrada } from './pantallas/ErrorRuta';
import { usuarioActual } from './sesion';

export function crearRouter(cliente: QueryClient) {
  const raiz = createRootRoute({ component: Outlet });

  const login = createRoute({
    getParentRoute: () => raiz,
    path: '/login',
    beforeLoad: async () => {
      if (await usuarioActual(cliente)) throw redirect({ to: '/' });
    },
    component: Login,
  });

  const protegida = createRoute({
    getParentRoute: () => raiz,
    id: 'protegida',
    beforeLoad: async () => {
      if (!(await usuarioActual(cliente))) throw redirect({ to: '/login' });
    },
    component: Layout,
  });

  const inicio = createRoute({ getParentRoute: () => protegida, path: '/', component: Inicio });

  const materiales = createRoute({
    getParentRoute: () => protegida,
    path: '/materiales',
    component: Materiales,
  });

  const equipos = createRoute({
    getParentRoute: () => protegida,
    path: '/equipos',
    component: Equipos,
  });
  const manoObra = createRoute({
    getParentRoute: () => protegida,
    path: '/mano-de-obra',
    component: ManoObra,
  });
  const transporte = createRoute({
    getParentRoute: () => protegida,
    path: '/transporte',
    component: Transporte,
  });

  const apus = createRoute({ getParentRoute: () => protegida, path: '/apus', component: Apus });
  const apu = createRoute({
    getParentRoute: () => protegida,
    path: '/apus/$id',
    component: PantallaApu,
  });

  const bloques = createRoute({
    getParentRoute: () => protegida,
    path: '/bloques',
    component: Bloques,
  });
  const ofertas = createRoute({
    getParentRoute: () => protegida,
    path: '/ofertas',
    component: Ofertas,
  });
  const importar = createRoute({
    getParentRoute: () => protegida,
    path: '/importar',
    component: Importar,
  });
  const importarPrecios = createRoute({
    getParentRoute: () => protegida,
    path: '/importar/precios',
    component: ImportarPrecios,
  });
  const usuarios = createRoute({
    getParentRoute: () => protegida,
    path: '/usuarios',
    beforeLoad: async () => {
      if ((await usuarioActual(cliente))?.rol !== 'admin') throw redirect({ to: '/' });
    },
    component: Usuarios,
  });
  const empresa = createRoute({
    getParentRoute: () => protegida,
    path: '/configuracion/empresa',
    beforeLoad: async () => {
      if ((await usuarioActual(cliente))?.rol !== 'admin') throw redirect({ to: '/' });
    },
    component: Empresa,
  });
  const licencia = createRoute({
    getParentRoute: () => protegida,
    path: '/configuracion/licencia',
    beforeLoad: async () => {
      if ((await usuarioActual(cliente))?.rol !== 'admin') throw redirect({ to: '/' });
    },
    component: Licencia,
  });
  const resumen = createRoute({
    getParentRoute: () => protegida,
    path: '/resumen',
    validateSearch: (s: Record<string, unknown>): { mes?: string } =>
      typeof s.mes === 'string' ? { mes: s.mes } : {},
    beforeLoad: async () => {
      if ((await usuarioActual(cliente))?.rol !== 'admin') throw redirect({ to: '/' });
    },
    component: ResumenMensual,
  });
  const historial = createRoute({
    getParentRoute: () => protegida,
    path: '/historial',
    component: Historial,
  });
  const oferta = createRoute({
    getParentRoute: () => protegida,
    path: '/ofertas/$id',
    component: Presupuesto,
  });

  return createRouter({
    defaultErrorComponent: ErrorRuta,
    defaultNotFoundComponent: NoEncontrada,
    routeTree: raiz.addChildren([
      login,
      protegida.addChildren([
        inicio,
        materiales,
        equipos,
        manoObra,
        transporte,
        apus,
        apu,
        bloques,
        ofertas,
        importar,
        importarPrecios,
        usuarios,
        empresa,
        licencia,
        historial,
        resumen,
        oferta,
      ]),
    ]),
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof crearRouter>;
  }
}
