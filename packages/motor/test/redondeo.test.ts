import { describe, expect, it } from 'vitest';
import { r2 } from '../src/redondeo';

describe('r2 (ROUND de Excel, mitad hacia arriba)', () => {
  it.each([
    [1.005, '1.01'],
    [2.675, '2.68'],
    [0.125, '0.13'],
    [1.115, '1.12'],
    [10.004, '10'],
    [-1.005, '-1.01'],
    ['0.285', '0.29'],
  ])('r2(%s) = %s', (v, esperado) => {
    expect(r2(v).toFixed(2)).toBe(Number(esperado).toFixed(2));
  });
});
