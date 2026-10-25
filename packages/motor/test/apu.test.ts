import { describe, expect, it } from 'vitest';
import { calcularApu } from '../src/apu';
import type { Apu, Listas, Parametros } from '../src/tipos';

const listas: Listas = {
  materiales: [{ id: 'm', pu: 10.005 }],
  equipos: [{ id: 'e', p: 7.333 }],
  manoObra: [{ id: 'o', p: 3.337 }],
  transporte: [{ id: 't', p: 2.5 }],
};
const p: Parametros = { factor: 1.1, herramientaMenor: 5, iva: 15, indirectos: [{ p: 12 }, { p: 8.5 }] };
const apu: Apu = {
  id: 'x',
  rendimiento: 0.35,
  equipos: [['e', 2]],
  manoObra: [['o', 3]],
  materiales: [['m', 1.5]],
  transporte: [['t', 0.333]],
};

describe('calcularApu', () => {
  const r = calcularApu(apu, listas, p);

  it('redondea cada línea y cada subtotal', () => {
    expect(r.materiales[0]!.precio.toString()).toBe('11.01'); // 10.005 × 1.1 = 11.0055
    expect(r.materiales[0]!.importe.toString()).toBe('16.52'); // 1.5 × 11.01 = 16.515
    expect(r.equipos[0]!.importe.toString()).toBe('5.13'); // 2 × 7.333 × 0.35 = 5.1331
    expect(r.manoObra[0]!.importe.toString()).toBe('3.5'); // 3 × 3.337 × 0.35 = 3.50385
    expect(r.transporte[0]!.importe.toString()).toBe('0.83'); // 0.333 × 2.5 = 0.8325
  });

  it('la herramienta menor se suma a equipos', () => {
    expect(r.mo.toString()).toBe('3.5');
    expect(r.hm.toString()).toBe('0.18'); // 3.5 × 5 % = 0.175
    expect(r.eq.toString()).toBe('5.31'); // 5.13 + 0.18
  });

  it('costo directo y P.U. ofertado', () => {
    expect(r.cu.toString()).toBe('26.16'); // 5.31 + 3.5 + 16.52 + 0.83
    expect(r.pctIndirectos.toString()).toBe('20.5');
    expect(r.puOfertado.toString()).toBe('31.52'); // 26.16 × 1.205 = 31.5228
  });

  it('falla claro si el insumo no existe', () => {
    expect(() => calcularApu({ ...apu, equipos: [['zz', 1]] }, listas, p)).toThrow(/zz/);
  });
});
