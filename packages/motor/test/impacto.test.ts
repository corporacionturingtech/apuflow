import { describe, expect, it } from 'vitest';
import { aplicarCambio, impacto } from '../src/impacto';
import { calcularOferta } from '../src/oferta';
import { ofertaDemo } from './ofertaDemo';

const oferta = ofertaDemo();
const usado = oferta.apus.find((a) => a.materiales.length > 0)!.materiales[0]![0];
const apusQueLoUsan = oferta.apus.filter((a) => a.materiales.some(([id]) => id === usado)).map((a) => a.id);
const precioActual = Number(oferta.listas.materiales.find((m) => m.id === usado)!.pu);

describe('impacto', () => {
  const nuevo = precioActual * 1.2 + 0.37;
  const r = impacto(oferta, { lista: 'materiales', id: usado, precio: nuevo });

  it('solo cuenta los APUs y rubros que usan el insumo', () => {
    expect(r.apus.sort()).toEqual(apusQueLoUsan.sort());
    expect(r.rubros).toEqual(oferta.rubros.flatMap((x, i) => (apusQueLoUsan.includes(x.apu) ? [i] : [])));
    expect(r.rubros.length).toBeGreaterThan(0);
  });

  it('después coincide con recalcular la oferta con el precio nuevo', () => {
    const esperado = calcularOferta(aplicarCambio(oferta, { lista: 'materiales', id: usado, precio: nuevo }));
    expect(r.despues.totales.subtotal.toString()).toBe(esperado.totales.subtotal.toString());
    expect(r.antes.totales.subtotal.toString()).toBe(calcularOferta(oferta).totales.subtotal.toString());
    expect(r.diferencia.toString()).toBe(r.despues.totales.subtotal.minus(r.antes.totales.subtotal).toString());
    expect(r.diferencia.gt(0)).toBe(true);
  });

  it('no muta la oferta', () => {
    expect(oferta.listas.materiales.find((m) => m.id === usado)!.pu).toBe(precioActual);
  });

  it('mismo precio: diferencia 0', () => {
    const igual = impacto(oferta, { lista: 'materiales', id: usado, precio: precioActual });
    expect(igual.diferencia.isZero()).toBe(true);
  });

  it('funciona con mano de obra', () => {
    const o = oferta.listas.manoObra[0]!;
    const m = impacto(oferta, { lista: 'manoObra', id: o.id, precio: Number(o.p) + 1 });
    expect(m.apus.length).toBe(oferta.apus.filter((a) => a.manoObra.some(([id]) => id === o.id)).length);
  });

  it('insumo inexistente lanza', () => {
    expect(() => impacto(oferta, { lista: 'equipos', id: 'no-existe', precio: 1 })).toThrow(/no existe/);
  });

  it('recálculo de 5.000 rubros en menos de 150 ms', () => {
    const grande = ofertaDemo(Math.ceil(5000 / oferta.rubros.length));
    expect(grande.rubros.length).toBeGreaterThanOrEqual(5000);
    const antes = calcularOferta(grande);
    const t0 = performance.now();
    impacto(grande, { lista: 'materiales', id: usado, precio: nuevo }, antes);
    const ms = performance.now() - t0;
    console.info(`impacto con ${grande.rubros.length} rubros: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(150);
  });
});
