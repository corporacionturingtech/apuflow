import { expect, test } from 'vitest';
import { nombre } from './index';

test('paquete tipos carga', () => {
  expect(nombre).toBe('tipos');
});
