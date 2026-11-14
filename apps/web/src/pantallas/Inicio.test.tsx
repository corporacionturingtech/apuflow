// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { Inicio } from './Inicio';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: unknown }) => <a href="#">{children as string}</a>,
}));

vi.mock('../lib/api', () => ({
  ErrorApi: class extends Error {},
  api: vi.fn(async (ruta: string) => {
    if (ruta === '/api/auth/yo') return { id: 'u', nombre: 'Byron', rol: 'admin' };
    if (ruta === '/api/ofertas') return { items: [] };
    if (ruta === '/api/empresa') return { nombre: 'Demo', vista: 'sencilla' };
    if (ruta === '/api/demo/cargar') return { ofertaId: 'o1' };
    return {};
  }),
}));
vi.mock('./PanelValor', () => ({ PanelValor: () => null }));

afterEach(cleanup);

it('sin ofertas ofrece dos empresas demo y carga la de vivienda', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Inicio />
    </QueryClientProvider>,
  );
  const vivienda = await screen.findByRole('button', { name: 'Vivienda y obra civil' });
  expect(screen.getByRole('button', { name: 'Subestación eléctrica' })).toBeTruthy();
  fireEvent.click(vivienda);
  await vi.waitFor(() =>
    expect(api).toHaveBeenCalledWith('/api/demo/cargar', {
      metodo: 'POST',
      cuerpo: { sector: 'vivienda' },
    }),
  );
});

it('con ofertas muestra la acción principal y el avance de las misiones', async () => {
  vi.mocked(api).mockImplementation(async (ruta: string) => {
    if (ruta === '/api/auth/yo') return { id: 'u', nombre: 'Byron', rol: 'admin' };
    if (ruta === '/api/ofertas')
      return {
        items: [
          {
            id: 'o1',
            nombre: 'Casa',
            cliente: null,
            total: '10',
            estado: 'borrador',
            rubros: 3,
            actualizadoEn: '2026-11-01T10:00:00Z',
          },
        ],
      };
    if (ruta === '/api/empresa') return { nombre: 'Demo', vista: 'sencilla' };
    return {};
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Inicio />
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Nueva oferta')).toBeTruthy();
  expect(screen.getByText('Importar Excel')).toBeTruthy();
  expect(screen.getByTestId('progreso-misiones').textContent).toMatch(/^0 de \d+ cumplidas$/);
});
