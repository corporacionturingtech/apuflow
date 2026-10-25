import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { calcularOferta } from '../src/oferta';
import { r2 } from '../src/redondeo';
import type { Oferta } from '../src/tipos';

// Se ejecuta el JS original del prototipo (sum, r2, maps, precioMat, pctInd, apuCalc, calc).
const html = readFileSync(new URL('../../../referencia/prototipo_v2.html', import.meta.url), 'utf8');
const trozo = (desde: string, hasta: string): string => {
  const i = html.indexOf(desde);
  const f = html.indexOf(hasta, i);
  if (i < 0 || f < 0) throw new Error(`No se encontró «${desde}» en el prototipo`);
  return html.slice(i, f + hasta.length);
};
const codigo = [
  trozo('const sum =', ';\n'),
  trozo('const r2 =', ';\n'),
  trozo('function maps(', 'return { A, rows, caps, t, M };\n}'),
].join('\n');
interface FilaProto { cteq: number; ctmo: number; ctma: number; cttr: number; cut: number; tof: number; peso: number }
interface ApuProto { EQ: number; MO: number; MA: number; TRA: number; hm: number; cu: number; pof: number }
interface ResultadoProto {
  A: Record<string, ApuProto>;
  rows: FilaProto[];
  caps: Record<string, { cut: number; of: number; n: number }>;
  t: { cut: number; sub: number; ind: number; pind: number; iva: number; total: number };
}
const proto = vm.runInNewContext(`${codigo}\n({ calc, r2 })`, Object.create(null), { timeout: 5000 }) as {
  calc: (s: unknown) => ResultadoProto;
  r2: (v: number) => number;
};

interface Fixture {
  factor: number;
  herramientaMenor: number;
  iva: number;
  indirectos: { id: string; p: number }[];
  materiales: { id: string; pu: number }[];
  manoObra: { id: string; p: number }[];
  equipos: { id: string; p: number }[];
  transporte: { id: string; p: number }[];
  apus: { id: string; r: number; eq: [string, number][]; mo: [string, number][]; ma: [string, number][]; tr: [string, number][] }[];
  bloques: { id: string; r: [string, number][] }[];
}
const d = JSON.parse(readFileSync(new URL('./fixtures/sedemi-demo.json', import.meta.url), 'utf8')) as Fixture;

// Misma oferta para ambos motores: todos los bloques como capítulos; `escala` ensucia las cantidades.
function armar(factor: number, escala: number) {
  const caps = d.bloques.map((b, i) => ({ id: `k${i}`, bloque: b }));
  const rubros = caps.flatMap((c) => c.bloque.r.map(([a, q]) => ({ a, q: q * escala, cap: c.id })));
  const estado = {
    factor,
    hm: d.herramientaMenor,
    iva: d.iva,
    ind: d.indirectos,
    lib: { mat: d.materiales, mo: d.manoObra, eq: d.equipos, tr: d.transporte },
    apus: d.apus,
    caps: caps.map((c) => ({ id: c.id })),
    rubros,
  };
  const oferta: Oferta = {
    factor,
    herramientaMenor: d.herramientaMenor,
    iva: d.iva,
    indirectos: d.indirectos,
    listas: { materiales: d.materiales, manoObra: d.manoObra, equipos: d.equipos, transporte: d.transporte },
    apus: d.apus.map((a) => ({ id: a.id, rendimiento: a.r, equipos: a.eq, manoObra: a.mo, materiales: a.ma, transporte: a.tr })),
    capitulos: estado.caps,
    rubros: rubros.map((r) => ({ apu: r.a, cantidad: r.q, capitulo: r.cap })),
  };
  return { estado, oferta };
}

describe.each([
  ['factor 1, cantidades del bloque', 1, 1],
  ['factor 1,0734, cantidades fraccionarias', 1.0734, 3.37],
  ['factor 0,9871, cantidades fraccionarias', 0.9871, 0.137],
])('paridad con el prototipo · %s', (_n, factor, escala) => {
  const { estado, oferta } = armar(factor, escala);
  const esperado = proto.calc(estado);
  const motor = calcularOferta(oferta);
  const igual = (a: { toNumber(): number }, b: number) => expect(a.toNumber()).toBe(b);

  it('cada APU', () => {
    for (const a of d.apus) {
      const e = esperado.A[a.id];
      const m = motor.apus[a.id]!;
      expect(m.eq.toNumber(), a.id).toBe(e.EQ);
      igual(m.mo, e.MO);
      igual(m.ma, e.MA);
      igual(m.tra, e.TRA);
      igual(m.hm, e.hm);
      expect(m.cu.toNumber(), a.id).toBe(e.cu);
      expect(m.puOfertado.toNumber(), a.id).toBe(e.pof);
    }
  });

  it('cada rubro', () => {
    expect(motor.rubros).toHaveLength(esperado.rows.length);
    esperado.rows.forEach((e, i) => {
      const m = motor.rubros[i]!;
      expect(m.ctEq.toNumber()).toBe(e.cteq);
      expect(m.ctMo.toNumber()).toBe(e.ctmo);
      expect(m.ctMa.toNumber()).toBe(e.ctma);
      expect(m.ctTra.toNumber()).toBe(e.cttr);
      expect(m.cuTotal.toNumber()).toBe(e.cut);
      expect(m.totalOfertado.toNumber(), `${m.rubro.apu}`).toBe(e.tof);
      expect(m.peso.toNumber()).toBeCloseTo(e.peso, 12);
    });
  });

  it('cada capítulo', () => {
    for (const [id, e] of Object.entries(esperado.caps)) {
      expect(motor.capitulos[id]!.cuTotal.toNumber()).toBe(e.cut);
      expect(motor.capitulos[id]!.totalOfertado.toNumber()).toBe(e.of);
      expect(motor.capitulos[id]!.rubros).toBe(e.n);
    }
  });

  it('los totales', () => {
    const t = esperado.t;
    const m = motor.totales;
    expect(m.cuTotalOferta.toNumber()).toBe(t.cut);
    expect(m.subtotal.toNumber()).toBe(t.sub);
    expect(m.indirectos.toNumber()).toBe(t.ind);
    expect(m.pctIndirectos.toNumber()).toBe(t.pind);
    expect(m.iva.toNumber()).toBe(t.iva);
    expect(m.total.toNumber()).toBe(t.total);
  });
});

describe('r2 contra el r2 del prototipo', () => {
  it('coincide en casos de .005', () => {
    for (const v of [1.005, 2.675, 0.125, 1.115, 8.345, 1.0049999, 100.285, 33.335, 0.615, 5.555]) {
      expect(r2(v).toNumber(), String(v)).toBe(proto.r2(v));
    }
  });
});
