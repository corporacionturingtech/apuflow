import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { calcularOferta } from 'motor';
import { describe, expect, it } from 'vitest';
import { aEntradaMotor, exportarLibro } from '../src/exportar';
import { comprobarCuadra } from '../src/importar/cuadra';
import { leerLibro } from '../src/importar/leer';
import { leerPrecios } from '../src/importar/precios';
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
const por = <T extends { descripcion: string }>(xs: T[]) =>
  Object.fromEntries(xs.map((x) => [x.descripcion, x]));

describe('leerLibro', () => {
  it.each(['privado', 'publico'] as const)(
    'ida y vuelta (%s): reproduce la oferta',
    async (tipo) => {
      const l = libro(tipo);
      const { libro: r, cache, problemas, resumen } = await leerLibro(await exportarLibro(l));
      expect(problemas.filter((p) => p.bloqueante)).toEqual([]);
      expect(r.datos).toMatchObject({ proyecto: l.datos.proyecto, cliente: l.datos.cliente, tipo });
      expect(Number(r.factor)).toBe(Number(l.factor));
      expect(Number(r.iva)).toBe(Number(l.iva));
      expect(Number(r.herramientaMenor)).toBe(Number(l.herramientaMenor));
      expect(r.indirectos.map((i) => [i.nombre, Number(i.porcentaje)])).toEqual(
        l.indirectos.map((i) => [i.nombre, Number(i.porcentaje)]),
      );
      const usados = new Set(l.rubros.map((x) => x.apuId));
      expect(resumen.apus).toBe(usados.size);

      // Los insumos llegan con ids nuevos: se comparan por descripción.
      const antes = por(l.insumos);
      expect(r.insumos.length).toBe(l.insumos.length);
      for (const i of r.insumos) {
        expect(antes[i.descripcion]!.tipo).toBe(i.tipo);
        expect(Number(i.pu)).toBe(Number(antes[i.descripcion]!.pu));
      }
      const desc = (x: LibroEntrada, id: string) => x.insumos.find((i) => i.id === id)!.descripcion;
      for (const a of r.apus) {
        const o = l.apus.find((x) => x.codigo === a.codigo)!;
        expect(a).toMatchObject({
          descripcion: o.descripcion,
          unidad: o.unidad,
          disciplina: o.disciplina,
        });
        expect(Number(a.rendimiento)).toBe(Number(o.rendimiento));
        expect(a.lineas.map((x) => [desc(r, x.insumoId), Number(x.cantidad)]).sort()).toEqual(
          o.lineas.map((x) => [desc(l, x.insumoId), Number(x.cantidad)]).sort(),
        );
      }
      expect(r.capitulos.map((c) => c.nombre)).toEqual(
        l.capitulos.filter((c) => l.rubros.some((x) => x.capituloId === c.id)).map((c) => c.nombre),
      );
      expect(
        r.rubros.map((x) => [x.apuId, Number(x.cantidad), x.cpc, x.origen, x.vae && Number(x.vae)]),
      ).toEqual(
        l.rubros.map((x) => [
          x.apuId,
          Number(x.cantidad),
          tipo === 'publico' ? x.cpc : x.cpc,
          tipo === 'publico' ? x.origen : null,
          tipo === 'publico' ? Number(x.vae) : null,
        ]),
      );

      // Mismo total al centavo que el motor, y el caché del libro coincide.
      expect(total(r).total.toNumber()).toBe(total(l).total.toNumber());
      expect(cache.total).toBe(total(l).subtotal.toNumber());
      expect(cache.rubros.length).toBe(l.rubros.length);
    },
  );

  it('avisa si falta una hoja o un encabezado', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Materiales').addRow(['x', 'y']);
    const { problemas } = await leerLibro(new Uint8Array(await wb.xlsx.writeBuffer()));
    const msgs = problemas.filter((p) => p.bloqueante).map((p) => p.hoja + ': ' + p.mensaje);
    expect(msgs.some((m) => m.startsWith('Materiales: No encontramos los encabezados'))).toBe(true);
    expect(msgs.some((m) => m.includes('hoja «Presupuesto»'))).toBe(true);
  });

  it('reporta un insumo repetido con distinto precio', async () => {
    const buf = await exportarLibro(libro());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ma = wb.getWorksheet('Materiales')!;
    const fila = ma.getRow(5);
    const copia = ma.getRow(ma.rowCount + 1);
    copia.getCell(2).value = fila.getCell(2).value;
    copia.getCell(5).value = Number(fila.getCell(5).value) + 1;
    const { problemas } = await leerLibro(new Uint8Array(await wb.xlsx.writeBuffer()));
    expect(
      problemas.some((p) => p.bloqueante && p.mensaje.includes('repetido con otro precio')),
    ).toBe(true);
  });
  it('comprueba que el total del libro cuadra con el motor y señala el rubro que no', async () => {
    const buf = await exportarLibro(libro());
    const ok = comprobarCuadra(await leerLibro(buf));
    expect(ok).toMatchObject({ hayCache: true, cuadra: true, rubrosDistintos: [] });

    const leido = await leerLibro(buf);
    leido.cache.rubros[0]!.totalOfertado! += 10;
    leido.cache.total! += 10;
    const mal = comprobarCuadra(leido);
    expect(mal.cuadra).toBe(false);
    expect(mal.rubrosDistintos).toHaveLength(1);
    expect(mal.rubrosDistintos[0]!.excel - mal.rubrosDistintos[0]!.apuflow).toBeCloseTo(10, 2);
  });
});

describe('leerPrecios', () => {
  const bytes = async (wb: ExcelJS.Workbook) => new Uint8Array(await wb.xlsx.writeBuffer());
  const hojaMateriales = (filas: (string | number)[][]) => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Materiales');
    ws.addRow(['ITEM', 'DESCRIPCIÓN', 'UNIDAD', 'PRECIO UNITARIO']);
    filas.forEach((f) => ws.addRow(f));
    return wb;
  };

  it('lee un libro con solo la hoja Materiales', async () => {
    const r = await leerPrecios(await bytes(hojaMateriales([[1, 'Cable', 'm', 2.5]])));
    expect(r.hojas).toBe(1);
    expect(r.insumos).toMatchObject([{ tipo: 'MA', descripcion: 'Cable', pu: '2.5' }]);
    expect(r.problemas).toEqual([]);
  });

  it('es bloqueante si no hay ninguna lista', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Otra').addRow(['x']);
    const r = await leerPrecios(await bytes(wb));
    expect(r.problemas.some((p) => p.bloqueante && p.mensaje.includes('ninguna lista'))).toBe(true);
  });

  it('es bloqueante si un insumo repetido trae otro precio', async () => {
    const r = await leerPrecios(
      await bytes(
        hojaMateriales([
          [1, 'Cable', 'm', 2.5],
          [2, 'Cable', 'm', 3],
        ]),
      ),
    );
    expect(r.problemas.some((p) => p.bloqueante && p.mensaje.includes('repetido'))).toBe(true);
  });
});
