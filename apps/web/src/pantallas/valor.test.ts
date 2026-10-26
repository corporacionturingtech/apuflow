import { expect, test } from 'vitest';
import { dinero, fraseFormula, horas, minutos, nombreMes } from './valor';

test('formatos del panel de valor', () => {
  expect(nombreMes('2026-10')).toBe('octubre de 2026');
  expect(dinero('1313.64')).toBe('$ 1.313,64');
  expect(horas(2.5)).toContain('2,5');
  expect(minutos('2,5')).toBe(2.5);
  expect(minutos('2.5')).toBe(2.5);
  expect(minutos('abc')).toBeNull();
  expect(minutos('500')).toBeNull();
  expect(fraseFormula({ minutosPorRubro: 3, minutosPorRecalculo: 2 })).toContain('× 3 min');
});
