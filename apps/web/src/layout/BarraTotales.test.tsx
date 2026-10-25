// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BarraTotales } from './BarraTotales';

afterEach(cleanup);

it('vacía muestra totales en cero', () => {
  render(<BarraTotales />);
  expect(screen.getByText('Subtotal')).toBeTruthy();
  expect(screen.getByText('IVA')).toBeTruthy();
  expect(screen.getByText('Total')).toBeTruthy();
  expect(screen.getAllByText('$ 0,00')).toHaveLength(3);
});

it('muestra los totales de la oferta abierta', async () => {
  const { act } = await import('react');
  const { fijarTotales } = await import('./totales');
  render(<BarraTotales />);
  act(() => fijarTotales({ subtotal: 1000, iva: 150, total: 1150 }));
  expect(screen.getByText('$ 1.150,00')).toBeTruthy();
  act(() => fijarTotales(null));
});

it('muestra la brecha en rojo o verde solo si hay objetivo', async () => {
  const { act } = await import('react');
  const { fijarTotales } = await import('./totales');
  render(<BarraTotales />);
  expect(screen.queryByText('Brecha')).toBeNull();
  act(() =>
    fijarTotales({ subtotal: 1000, iva: 150, total: 1150, brecha: { valor: 30, llego: false } }),
  );
  expect(screen.getByText('Faltan $ 30,00')).toBeTruthy();
  act(() =>
    fijarTotales({ subtotal: 1000, iva: 150, total: 1150, brecha: { valor: -20, llego: true } }),
  );
  expect(screen.getByText('Dentro por $ 20,00')).toBeTruthy();
  act(() => fijarTotales(null));
});
