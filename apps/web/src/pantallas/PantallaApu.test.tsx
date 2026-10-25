// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ApuDetalle } from 'tipos';
import { PantallaApu } from './PantallaApu';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: unknown }) => <a href="#">{children as string}</a>,
  useParams: () => ({ id: 'a1' }),
}));

const linea = (
  id: string,
  tipo: 'EQ' | 'MO',
  descripcion: string,
  pu: string,
  cantidad: string,
) => ({
  id,
  insumoId: `i-${id}`,
  tipo,
  codigo: id,
  descripcion,
  unidad: 'hora',
  pu,
  cantidad,
  orden: 1,
});

let detalle: ApuDetalle = {
  id: 'a1',
  codigo: 'APU-T',
  descripcion: 'Montaje ficticio',
  unidad: 'u',
  disciplina: 'Eléctrico',
  rendimiento: '2',
  version: 1,
  factor: '1',
  herramientaMenor: '5',
  lineasApu: [
    linea('g', 'EQ', 'Grúa ficticia', '45', '1'),
    linea('a', 'MO', 'Ayudante ficticio', '3.1', '3'),
  ],
};

vi.mock('../lib/api', () => ({
  ErrorApi: class extends Error {},
  api: vi.fn(async (ruta: string, o?: { cuerpo?: { cantidad?: string } }) => {
    if (ruta.includes('/api/auth/yo')) return { id: 'u', nombre: 'Ana', rol: 'precios' };
    if (o?.cuerpo?.cantidad)
      detalle = {
        ...detalle,
        version: 2,
        lineasApu: detalle.lineasApu.map((l) =>
          l.id === 'a' ? { ...l, cantidad: o.cuerpo!.cantidad! } : l,
        ),
      };
    return detalle;
  }),
}));

afterEach(cleanup);

it('subir ayudantes de 3 a 4 recalcula el CU con el motor', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PantallaApu />
    </QueryClientProvider>,
  );
  // R=2: EQ 90 + mo 18,60 → hm 0,93; CU = 90 + 0,93 + 18,60 = 109,53
  expect((await screen.findAllByText('$ 109,53')).length).toBeGreaterThan(0);

  const campo = screen.getByLabelText('Cantidad Ayudante ficticio');
  fireEvent.change(campo, { target: { value: '4' } });
  fireEvent.blur(campo);
  // mo 24,80 → hm 1,24 ; CU = 90 + 1,24 + 24,8 = 116,04
  expect((await screen.findAllByText('$ 116,04')).length).toBeGreaterThan(0);
});
