import { describe, expect, it } from 'vitest';
import { fmt, money, parseNum, pct, qty, sgn } from './formato';

describe('formato', () => {
  it('moneda como en su Excel', () => {
    expect(money(1313.64)).toBe('$ 1.313,64');
    expect(money(-5)).toBe('-$ 5,00');
    expect(money(0)).toBe('$ 0,00');
  });
  it('cantidades y porcentajes', () => {
    expect(qty(2.5)).toBe('2,5');
    expect(qty(1000)).toBe('1.000');
    expect(pct(12)).toBe('12,00 %');
    expect(fmt(1234567.891, 2, 2)).toBe('1.234.567,89');
  });
  it('variación con signo', () => {
    expect(sgn(1240)).toBe('+$ 1.240,00');
    expect(sgn(-10.4)).toBe('−$ 10,40');
    expect(sgn(0)).toBe('$ 0,00');
  });
  it('parseNum acepta coma o punto', () => {
    expect(parseNum('10,40')).toBe(10.4);
    expect(parseNum('10.40')).toBe(10.4);
    expect(parseNum('1.234,56')).toBe(1234.56);
    expect(parseNum('1,234.56')).toBe(1234.56);
    expect(parseNum('$ 3,92')).toBe(3.92);
    expect(parseNum('1.234.567')).toBe(1234567);
    expect(parseNum('')).toBeNaN();
    expect(parseNum('-')).toBeNaN();
  });
});
