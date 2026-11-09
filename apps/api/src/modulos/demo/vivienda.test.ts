import { readFileSync } from 'node:fs';
import { calcularOferta } from 'motor';
import { describe, expect, test } from 'vitest';

interface Fixture {
  factor: number;
  herramientaMenor: number;
  iva: number;
  indirectos: { p: number }[];
  materiales: { id: string; pu: number }[];
  manoObra: { id: string; p: number }[];
  equipos: { id: string; p: number }[];
  transporte: { id: string; p: number }[];
  apus: {
    id: string;
    r: number;
    eq: [string, number][];
    mo: [string, number][];
    ma: [string, number][];
    tr: [string, number][];
  }[];
  bloques: { id: string; n: string; r: [string, number][] }[];
}
const d = JSON.parse(
  readFileSync(new URL('./vivienda-demo.json', import.meta.url), 'utf8'),
) as Fixture;

// Precio ofertado de referencia por unidad (públicos, de una web de constructora) y tamaño del bloque.
const REFERENCIA: Record<string, { unidades: number; precio: number }> = {
  'og-ha': { unidades: 100, precio: 230 },
  'og-em': { unidades: 100, precio: 260 },
  'ac-std': { unidades: 100, precio: 390 - 230 },
  'ac-com': { unidades: 100, precio: 460 - 230 },
  'ac-pre': { unidades: 100, precio: 590 - 230 },
  cerr: { unidades: 10, precio: 90 },
  perg: { unidades: 12, precio: 80 },
  cub: { unidades: 50, precio: 70 },
};

describe('biblioteca de vivienda', () => {
  const calc = calcularOferta({
    factor: d.factor,
    herramientaMenor: d.herramientaMenor,
    iva: d.iva,
    indirectos: d.indirectos,
    listas: {
      materiales: d.materiales,
      manoObra: d.manoObra,
      equipos: d.equipos,
      transporte: d.transporte,
    },
    apus: d.apus.map((a) => ({
      id: a.id,
      rendimiento: a.r,
      equipos: a.eq,
      manoObra: a.mo,
      materiales: a.ma,
      transporte: a.tr,
    })),
    capitulos: d.bloques.map((b) => ({ id: b.id })),
    rubros: d.bloques.flatMap((b) =>
      b.r.map(([apu, cantidad]) => ({ apu, cantidad, capitulo: b.id })),
    ),
  });

  test('cada bloque queda a ±10 % de su precio de referencia por unidad', () => {
    expect(Object.keys(REFERENCIA).sort()).toEqual(d.bloques.map((b) => b.id).sort());
    for (const [id, ref] of Object.entries(REFERENCIA)) {
      const porUnidad = calc.capitulos[id]!.totalOfertado.div(ref.unidades).toNumber();
      expect(Math.abs(porUnidad / ref.precio - 1), id).toBeLessThan(0.1);
    }
  });

  test('todas las líneas apuntan a insumos y APUs que existen', () => {
    const ids = new Set(
      [d.materiales, d.manoObra, d.equipos, d.transporte].flat().map((i) => i.id),
    );
    for (const a of d.apus)
      for (const [i] of [...a.eq, ...a.mo, ...a.ma, ...a.tr])
        expect(ids.has(i), `${a.id} → ${i}`).toBe(true);
    const apus = new Set(d.apus.map((a) => a.id));
    for (const b of d.bloques)
      for (const [a] of b.r) expect(apus.has(a), `${b.id} → ${a}`).toBe(true);
  });
});
