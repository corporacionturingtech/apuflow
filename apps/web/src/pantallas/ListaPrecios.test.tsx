// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { LISTAS, ListaPrecios } from './ListaPrecios';

vi.mock('../lib/api', () => ({
  ErrorApi: class extends Error {},
  api: vi.fn(async (ruta: string) => {
    if (ruta.includes('/api/auth/yo')) return { id: 'u', nombre: 'Ana', rol: 'precios' };
    return {
      items: [],
      factor: '1.05',
      herramientaMenor: { pct: '5', version: 1 },
    };
  }),
}));

afterEach(cleanup);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1000 });
});

const montar = (config: (typeof LISTAS)[keyof typeof LISTAS]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ListaPrecios config={config} />
    </QueryClientProvider>,
  );

it('Equipos: tabla propia, herramienta menor y sin FACTOR', async () => {
  montar(LISTAS.equipos);
  expect(await screen.findByRole('grid', { name: 'Lista de equipos' })).toBeTruthy();
  expect(screen.getByLabelText(/Herramienta menor/)).toHaveProperty('value', '5');
  expect(screen.queryByText(/FACTOR/)).toBeNull();
});

it('Materiales: columna FACTOR y sin herramienta menor', async () => {
  montar(LISTAS.materiales);
  expect(await screen.findByText(/FACTOR \(1.05\)/)).toBeTruthy();
  expect(screen.queryByLabelText(/Herramienta menor/)).toBeNull();
});

it('Mano de obra y Transporte: mismo molde, sin extras', async () => {
  for (const c of [LISTAS.manoObra, LISTAS.transporte]) {
    montar(c);
    expect(await screen.findByRole('grid', { name: c.tabla })).toBeTruthy();
    expect(screen.queryByLabelText(/Herramienta menor/)).toBeNull();
    cleanup();
  }
});
