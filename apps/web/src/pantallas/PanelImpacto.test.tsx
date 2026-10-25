// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PanelImpacto } from './PanelImpacto';

const respuesta = {
  insumoId: 'i',
  puAnterior: '9.6',
  puNuevo: '10.4',
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
};
vi.mock('../lib/api', () => ({ api: vi.fn(async () => respuesta) }));

afterEach(cleanup);
const cambio = { insumoId: 'i', descripcion: 'Cable 2/0 AWG', puAnterior: '9.6', puNuevo: '10.4' };
const montar = (alDeshacer?: () => void) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PanelImpacto cambio={cambio} alCerrar={() => {}} alDeshacer={alDeshacer} />
    </QueryClientProvider>,
  );

it('resume el efecto y despliega el desglose por oferta', async () => {
  montar();
  const panel = await screen.findByText(/Afectó 4 APUs, 12 rubros, \+\$ 1\.240,00/);
  expect(panel.textContent).toContain('pasó de $ 9,60 a $ 10,40');
  expect(panel.textContent).toMatch(/Recalculado en \d+ ms/);
  fireEvent.click(screen.getByRole('button', { name: 'Ver qué cambió' }));
  expect(screen.getByText('Subestación Norte').parentElement?.textContent).toContain('$ 2.240,00');
});

it('ofrece Deshacer solo si la lista puede escribir y lo llama al pulsarlo', async () => {
  const alDeshacer = vi.fn();
  const { unmount } = montar(alDeshacer);
  await screen.findByText(/Afectó 4 APUs/);
  fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
  expect(alDeshacer).toHaveBeenCalledOnce();
  unmount();
  montar();
  await screen.findByText(/Afectó 4 APUs/);
  expect(screen.queryByRole('button', { name: 'Deshacer' })).toBeNull();
});
