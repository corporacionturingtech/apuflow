// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { BarraTotales } from './BarraTotales';

it('vacía muestra totales en cero', () => {
  render(<BarraTotales />);
  expect(screen.getByText('Subtotal')).toBeTruthy();
  expect(screen.getByText('IVA')).toBeTruthy();
  expect(screen.getByText('Total')).toBeTruthy();
  expect(screen.getAllByText('$ 0,00')).toHaveLength(3);
});
