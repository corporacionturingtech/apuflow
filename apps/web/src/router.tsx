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
import { PantallaApu } from './pantallas/PantallaApu';
import { Login } from './pantallas/Login';
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

  return createRouter({
    routeTree: raiz.addChildren([
      login,
      protegida.addChildren([inicio, materiales, equipos, manoObra, transporte, apus, apu]),
    ]),
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof crearRouter>;
  }
}
