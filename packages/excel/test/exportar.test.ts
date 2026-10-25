import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { calcularOferta } from 'motor';
import { describe, expect, it } from 'vitest';
import { aEntradaMotor, exportarLibro } from '../src/exportar';
import type { LibroEntrada, TipoInsumo } from '../src/tipos';

interface Fixture {
  factor: number;
  herramientaMenor: number;
  iva: number;
  indirectos: { id: string; p: number }[];
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
  bloques: { id: string; r: [string, number][] }[];
}
const fx = JSON.parse(
  readFileSync(new URL('../../motor/test/fixtures/sedemi-demo.json', import.meta.url), 'utf8'),
) as Fixture;

function libro(tipo: 'publico' | 'privado' = 'privado'): LibroEntrada {
  const ins = (t: TipoInsumo, xs: { id: string; pu?: number; p?: number }[]) =>
    xs.map((x) => ({
      id: x.id,
      tipo: t,
      descripcion: `Insumo ${x.id}`,
      unidad: 'u',
      pu: String(x.pu ?? x.p),
      seccion: t === 'MA' ? 'Eléctrico' : null,
    }));
  const lin = (a: Fixture['apus'][number]) =>
    [...a.eq, ...a.mo, ...a.ma, ...a.tr].map(([insumoId, c]) => ({
      insumoId,
      cantidad: String(c),
    }));
  return {
    datos: {
      proyecto: 'Subestación demo',
      cliente: 'Cliente ficticio',
      tipo,
      fecha: '2026-10-25',
      empresa: 'Demo',
    },
    factor: String(fx.factor),
    iva: String(fx.iva),
    herramientaMenor: String(fx.herramientaMenor),
    indirectos: fx.indirectos.map((i) => ({ nombre: i.id, porcentaje: String(i.p) })),
    insumos: [
      ...ins('MA', fx.materiales),
      ...ins('EQ', fx.equipos),
      ...ins('MO', fx.manoObra),
      ...ins('TR', fx.transporte),
    ],
    apus: fx.apus.map((a) => ({
      id: a.id,
      codigo: a.id,
      descripcion: `Rubro ${a.id}`,
      unidad: 'u',
      disciplina: 'Eléctrica',
      rendimiento: String(a.r),
      herramientaMenor: String(fx.herramientaMenor),
      lineas: lin(a),
    })),
    capitulos: fx.bloques.map((b) => ({ id: b.id, nombre: `Capítulo ${b.id}` })),
    rubros: fx.bloques.flatMap((b) =>
      b.r.map(([apuId, q], i) => ({
        capituloId: b.id,
        apuId,
        codigo: `${b.id}-${i}`,
        cantidad: String(q),
        cpc: '1234',
        origen: 'P',
        vae: '40',
      })),
    ),
  };
}

const total = (l: LibroEntrada) => calcularOferta(aEntradaMotor(l)).totales;
const celda = (ws: ExcelJS.Worksheet, ref: string) => {
  const v = ws.getCell(ref).value;
  return typeof v === 'object' && v && 'result' in v ? v.result : v;
};
const abrir = async (b: Uint8Array) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(b as unknown as ArrayBuffer);
  return wb;
};

describe('exportarLibro', () => {
  it('arma las hojas del libro y deja el total del motor en caché', async () => {
    const l = libro();
    const wb = await abrir(await exportarLibro(l));
    const nombres = wb.worksheets.map((w) => w.name);
    expect(nombres.slice(0, 7)).toEqual([
      'Datos generales',
      'Equipos',
      'Mano Obra',
      'Materiales',
      'Transporte',
      'Indirectos',
      'Presupuesto',
    ]);
    expect(nombres.filter((n) => n.startsWith('APU ')).length).toBe(
      new Set(l.rubros.map((r) => r.apuId)).size,
    );
    const pres = wb.getWorksheet('Presupuesto')!;
    const t = total(l);
    expect(celda(pres, 'S4')).toBe(t.subtotal.toNumber());
    expect(celda(pres, 'O4')).toBe(t.cuTotalOferta.toNumber());
    const v = pres.getCell('S4').value as { formula: string };
    expect(v.formula).toMatch(/^SUM\(S7:S\d+\)$/);
    const apu = wb.getWorksheet(`APU ${l.rubros[0]!.apuId}`)!;
    expect(String((pres.getCell('R8').value as { formula: string }).formula)).toContain('APU');
    expect(apu.getCell('C4').value).toBe(
      Number(l.apus.find((a) => a.id === l.rubros[0]!.apuId)!.rendimiento),
    );
  });

  it('agrega P / ND / I y VAE solo en ofertas públicas', async () => {
    const pub = (await abrir(await exportarLibro(libro('publico')))).getWorksheet('Presupuesto')!;
    const priv = (await abrir(await exportarLibro(libro()))).getWorksheet('Presupuesto')!;
    expect(pub.getCell('T5').value).toBe('P / ND / I');
    expect(priv.getCell('T5').value).toBeNull();
  });

  // Criterio del ticket: sin valores en caché, LibreOffice recalcula y da lo mismo que el motor.
  const hayLibreOffice = spawnSync('soffice', ['--version']).status === 0;
  it.skipIf(!hayLibreOffice)(
    'LibreOffice recalcula el mismo total que el motor',
    async () => {
      const l = libro();
      const wb = await abrir(await exportarLibro(l));
      for (const ws of wb.worksheets)
        ws.eachRow((fila) =>
          fila.eachCell((c) => {
            const v = c.value;
            if (v && typeof v === 'object' && 'formula' in v)
              c.value = { formula: v.formula } as ExcelJS.CellFormulaValue;
          }),
        );
      const dir = mkdtempSync(join(tmpdir(), 'apuflow-xlsx-'));
      writeFileSync(join(dir, 'entrada.xlsx'), new Uint8Array(await wb.xlsx.writeBuffer()));
      execFileSync(
        'soffice',
        [
          '--headless',
          '--convert-to',
          'xlsx:Calc MS Excel 2007 XML',
          '--outdir',
          join(dir, 'salida'),
          join(dir, 'entrada.xlsx'),
        ],
        {
          timeout: 90_000,
          env: { ...process.env, HOME: dir },
        },
      );
      const re = await abrir(new Uint8Array(readFileSync(join(dir, 'salida', 'entrada.xlsx'))));
      const pres = re.getWorksheet('Presupuesto')!;
      const t = total(l);
      expect(celda(pres, 'S4')).toBeCloseTo(t.subtotal.toNumber(), 2);
      expect(celda(pres, 'O4')).toBeCloseTo(t.cuTotalOferta.toNumber(), 2);
      const filaTotal = pres.getColumn('N').values.findIndex((v) => v === 'TOTAL DE LA OFERTA');
      expect(celda(pres, 'S' + filaTotal)).toBeCloseTo(t.total.toNumber(), 2);
    },
    120_000,
  );
});
