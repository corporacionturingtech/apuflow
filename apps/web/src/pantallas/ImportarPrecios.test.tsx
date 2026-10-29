// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ImportarPrecios } from './ImportarPrecios';

const revision = {
  archivo: 'precios.xlsx',
  hojas: 1,
  cambios: [
    {
      insumoId: 'i',
      tipo: 'MA',
      codigo: 'MAT-0001',
      descripcion: 'Cable 2/0 AWG',
      puActual: '9.6',
      puNuevo: '10.4',
    },
  ],
  sinCambio: 3,
  noEncontrados: ['Cosa rara'],
  problemas: [],
  impacto: {
    apus: 4,
    rubros: 12,
    diferencia: '1240.00',
    ofertas: [
      {
        id: 'o',
        nombre: 'Subestación Norte',
        apus: 4,
        rubros: 12,
        antes: '1000.00',
        despues: '2240.00',
      },
    ],
  },
  puedeConfirmar: true,
};
vi.mock('../lib/api', () => ({
  ErrorApi: class extends Error {},
  subirArchivo: vi.fn(async (ruta: string) =>
    ruta.endsWith('/revisar') ? revision : { actualizados: 1 },
  ),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: unknown }) => <a>{children as string}</a>,
}));

afterEach(cleanup);
const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ImportarPrecios />
    </QueryClientProvider>,
  );
const subir = () =>
  fireEvent.change(screen.getByLabelText('Archivo de Excel'), {
    target: { files: [new File(['x'], 'precios.xlsx')] },
  });

it('muestra qué cambia, el impacto y el desglose antes de confirmar', async () => {
  montar();
  subir();
  expect((await screen.findByTestId('resumen-precios')).textContent).toContain(
    'Cambian 1 precios. 3 ya están al día; 1 no existen en Turing APU y se omiten.',
  );
  expect(screen.getByText('Cable 2/0 AWG').parentElement?.textContent).toContain('$ 10,40');
  expect(screen.getByText(/Afectará 4 APUs, 12 rubros, \+\$ 1\.240,00/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Ver qué cambiaría' }));
  expect(screen.getByText('Subestación Norte').parentElement?.textContent).toContain('$ 2.240,00');
});

it('al confirmar avisa cuántos precios se actualizaron', async () => {
  montar();
  subir();
  fireEvent.click(await screen.findByRole('button', { name: 'Actualizar 1 precios' }));
  expect((await screen.findByRole('status')).textContent).toContain('Se actualizaron 1 precios');
});
