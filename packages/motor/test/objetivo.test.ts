import { describe, expect, it } from 'vitest';
import { brecha, rubrosQueMasPesan } from '../src/objetivo';
import { calcularOferta } from '../src/oferta';
import { ofertaDemo } from './ofertaDemo';

const calc = calcularOferta(ofertaDemo());
const sub = calc.totales.subtotal;

describe('brecha', () => {
  it('sobre el objetivo: positiva, no llegó', () => {
    const b = brecha(calc, sub.minus(100));
    expect(b.brecha.toString()).toBe('100');
    expect(b.llego).toBe(false);
    expect(b.pct.toNumber()).toBeCloseTo((100 / (sub.toNumber() - 100)) * 100, 9);
  });
  it('bajo el objetivo: negativa, llegó', () => {
    const b = brecha(calc, sub.plus(50));
    expect(b.brecha.toString()).toBe('-50');
    expect(b.llego).toBe(true);
  });
  it('igual al objetivo: llegó', () => {
    const b = brecha(calc, sub);
    expect(b.brecha.isZero()).toBe(true);
    expect(b.llego).toBe(true);
  });
  it('redondea a centavos', () => {
    expect(brecha(calc, sub.minus('0.004')).brecha.isZero()).toBe(true);
    expect(brecha(calc, sub.minus('0.005')).brecha.toString()).toBe('0.01');
  });
  it('objetivo 0 no divide', () => {
    expect(brecha(calc, 0).pct.isZero()).toBe(true);
  });
});

describe('rubrosQueMasPesan', () => {
  const top = rubrosQueMasPesan(calc);
  it('devuelve 8 por defecto, de mayor a menor', () => {
    expect(top).toHaveLength(8);
    for (let i = 1; i < top.length; i++) expect(top[i - 1]!.cuTotal.gte(top[i]!.cuTotal)).toBe(true);
  });
  it('el primero es el máximo de toda la oferta', () => {
    const max = calc.rubros.reduce((m, r) => (r.cuTotal.gt(m) ? r.cuTotal : m), calc.rubros[0]!.cuTotal);
    expect(top[0]!.cuTotal.toString()).toBe(max.toString());
  });
  it('respeta n y los pesos suman ≈ 1', () => {
    expect(rubrosQueMasPesan(calc, 3)).toHaveLength(3);
    const suma = calc.rubros.reduce((s, r) => s + r.peso.toNumber(), 0);
    expect(suma).toBeCloseTo(1, 9);
  });
});
