import { describe, expect, it } from 'vitest';
import { calcularDetalle, type DetalleCalculable } from '../src/detalle';

const detalle = (cantidad: string, pu = '10'): DetalleCalculable => ({
  iva: '15',
  factor: '1',
  indirectos: [{ porcentaje: '10' }],
  capitulos: [{ id: 'c1' }],
  rubros: [{ apuId: 'a1', cantidad, capituloId: 'c1' }],
  apus: [
    {
      id: 'a1',
      rendimiento: '1',
      herramientaMenor: '0',
      lineas: [{ insumoId: 'm1', tipo: 'MA', pu, cantidad: '2' }],
    },
  ],
});

describe('calcularDetalle', () => {
  it('costo 20, indirectos 10 %, IVA 15 % sobre el subtotal', () => {
    const t = calcularDetalle(detalle('1')).totales;
    expect(t.cuTotalOferta.toString()).toBe('20');
    expect(t.subtotal.toString()).toBe('22');
    expect(t.total.toString()).toBe('25.3');
  });
  it('escala con la cantidad', () => {
    expect(calcularDetalle(detalle('3')).totales.subtotal.toString()).toBe('66');
  });
});
