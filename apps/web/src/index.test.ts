import { expect, test } from 'vitest';
import { nombre } from './index';

test('paquete web carga', () => {
  expect(nombre).toBe('web');
});
