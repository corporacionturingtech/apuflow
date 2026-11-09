// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { OfertaDetalle } from 'tipos';
import { Tabs } from '../../ui/tabs';
import { Encabezado } from './Encabezado';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: unknown }) => <a href="#">{children as string}</a>,
}));

let vista = 'completa';
vi.mock('../../lib/api', () => ({
  ErrorApi: class extends Error {},
  api: vi.fn(async () => ({ nombre: 'Demo', acento: '#2563eb', vista })),
}));

afterEach(cleanup);

const oferta = {
  id: 'o1',
  nombre: 'Casa ficticia',
  cliente: 'Cliente ficticio',
  tipo: 'privado',
  estado: 'borrador',
  rubros: [],
} as unknown as OfertaDetalle;

function pintar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Tabs value="rubros">
        <Encabezado
          data={oferta}
          presentes={[
            { usuarioId: 'u2', nombre: 'Ana', disciplina: null, capitulo: null, capituloId: null },
          ]}
          ofertado={false}
          alCambiarVista={() => {}}
        />
      </Tabs>
    </QueryClientProvider>,
  );
}

it('vista completa: todas las pestañas, presencia y tipo de oferta', async () => {
  vista = 'completa';
  pintar();
  expect(await screen.findByRole('tab', { name: 'Costo objetivo' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'Versiones' })).toBeTruthy();
  expect(screen.getByRole('list', { name: 'Quién más está en la oferta' })).toBeTruthy();
  expect(screen.getByText(/Oferta privada/)).toBeTruthy();
});

it('vista sencilla: esconde objetivo, versiones, presencia y tipo; deja indirectos', async () => {
  vista = 'sencilla';
  pintar();
  await vi.waitFor(() => expect(screen.queryByRole('tab', { name: 'Versiones' })).toBeNull());
  expect(screen.queryByRole('tab', { name: 'Costo objetivo' })).toBeNull();
  expect(screen.getByRole('tab', { name: 'Indirectos y utilidad' })).toBeTruthy();
  expect(screen.queryByRole('list', { name: 'Quién más está en la oferta' })).toBeNull();
  expect(screen.queryByText(/Oferta privada/)).toBeNull();
});
