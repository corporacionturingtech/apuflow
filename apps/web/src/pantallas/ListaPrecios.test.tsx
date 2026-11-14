// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { LISTAS, ListaPrecios } from './ListaPrecios';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const ITEM = {
  id: 'a',
  tipo: 'MA',
  codigo: 'TUB-1',
  descripcion: 'Tubería PVC 1/2"',
  unidad: 'm',
  pu: '10.40',
  precioAnterior: '9.60',
  seccion: null,
  version: 1,
};

vi.mock('../lib/api', () => ({
  ErrorApi: class extends Error {},
  api: vi.fn(async (ruta: string) => {
    if (ruta.includes('/api/auth/yo')) return { id: 'u', nombre: 'Ana', rol: 'precios' };
    const papelera = ruta.includes('papelera=true');
    return {
      items: [papelera ? { ...ITEM, id: 'b', codigo: 'BOR-1' } : ITEM],
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
  expect(screen.queryByText(/factor/)).toBeNull();
});

it('Materiales: columna FACTOR y sin herramienta menor', async () => {
  montar(LISTAS.materiales);
  expect(await screen.findByText('P.U. × factor (1,05)')).toBeTruthy();
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

it('Agregar abre el formulario de alta y Papelera cambia de vista', async () => {
  montar(LISTAS.transporte);
  fireEvent.click(await screen.findByRole('button', { name: 'Agregar tarifa' }));
  expect(screen.getByRole('form', { name: 'Agregar' })).toBeTruthy();
  fireEvent.click(await screen.findByRole('button', { name: 'Papelera (1)' }));
  expect(await screen.findByText('BOR-1')).toBeTruthy();
  expect(screen.queryByRole('grid')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Papelera de transporte' })).toBeTruthy();
});

it('Busca sin tildes, cuenta «x de y» y sin coincidencias ofrece ver todos', async () => {
  montar(LISTAS.materiales);
  await screen.findByRole('grid', { name: 'Lista de materiales' });
  const buscar = screen.getByLabelText('Buscar material');
  fireEvent.change(buscar, { target: { value: 'tuberia' } });
  expect(screen.getByText('1 de 1 materiales')).toBeTruthy();
  expect(screen.getByRole('grid')).toBeTruthy();
  fireEvent.change(buscar, { target: { value: 'cable' } });
  expect(screen.getByText('Sin resultados para «cable»')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Ver todos los materiales' }));
  expect(screen.getByRole('grid')).toBeTruthy();
});

it('Precio referencial con la variación en %', async () => {
  montar(LISTAS.materiales);
  expect(await screen.findByText(/\+8,3 %/)).toBeTruthy();
});
