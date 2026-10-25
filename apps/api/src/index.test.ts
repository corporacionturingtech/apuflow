import { expect, test } from 'vitest';
import { nombre } from './index';

test('paquete api carga', () => {
  expect(nombre).toBe('api');
});
