import type { QueryClient } from '@tanstack/react-query';
import type { UsuarioSesion } from 'tipos';
import { api, ErrorApi } from './lib/api';

export const consultaYo = {
  queryKey: ['yo'],
  retry: false,
  queryFn: async (): Promise<UsuarioSesion | null> => {
    try {
      return await api<UsuarioSesion>('/api/auth/yo');
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 401) return null;
      throw e;
    }
  },
};

export const usuarioActual = (c: QueryClient) => c.fetchQuery({ ...consultaYo, staleTime: 30_000 });
