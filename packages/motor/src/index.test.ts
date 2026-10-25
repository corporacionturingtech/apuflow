import { expect, test } from 'vitest';
import { nombre } from './index';

test('paquete motor carga', () => {
  expect(nombre).toBe('motor');
});
