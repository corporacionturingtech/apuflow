import { expect, test } from 'vitest';
import { calcularEstado } from './estado';
import { contenido } from './contenido-prueba';

const c = { ...contenido, vence: '2026-06-30' };
const en = (iso: string) => calcularEstado(c, new Date(`${iso}T15:00:00Z`));

test('vigente a más de 10 días', () => {
  expect(en('2026-06-19').estado).toBe('vigente');
});
test('por vencer a 10 días y el mismo día del vencimiento', () => {
  expect(en('2026-06-20')).toMatchObject({ estado: 'por_vencer', diasParaVencer: 10 });
  expect(en('2026-06-30')).toMatchObject({ estado: 'por_vencer', diasParaVencer: 0 });
});
test('en gracia hasta 15 días después', () => {
  expect(en('2026-07-01')).toMatchObject({ estado: 'gracia', diasDeGracia: 14 });
  expect(en('2026-07-15')).toMatchObject({ estado: 'gracia', diasDeGracia: 0 });
});
test('vencida: solo lectura pasada la gracia', () => {
  expect(en('2026-07-16').estado).toBe('solo_lectura');
});
