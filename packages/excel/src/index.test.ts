import { expect, test } from 'vitest';
import { nombre } from './index';

test('paquete excel carga', () => {
  expect(nombre).toBe('excel');
});
