import type { Workbook, Worksheet } from 'exceljs';
import type { ApuCalculado, LineaCalculada } from 'motor';
import { ST, colL, comillas, poner } from '../estilos';
import type { ApuLibro, InsumoLibro } from '../tipos';

export interface RefsApu {
  M: string;
  N: string;
  O: string;
  P: string;
  PU: string;
  R: string;
}

interface Contexto {
  precio: Map<string, string>;
  insumos: Map<string, InsumoLibro>;
  hmGlobal: string;
  hmPctGlobal: string;
  indirectos: string;
  nota: string;
}

const n = (x: { toNumber(): number }) => x.toNumber();

/** Nombre de hoja válido en Excel (≤ 31, sin caracteres prohibidos) y sin repetir. */
export function nombreHojaApu(codigo: string, usados: Set<string>): string {
  const base = ('APU ' + codigo).replace(/[\\/?*[\]:]/g, '-').slice(0, 31);
  let nombre = base;
  for (let i = 2; usados.has(nombre.toLowerCase()); i++)
    nombre = base.slice(0, 31 - String(i).length - 1) + '~' + i;
  usados.add(nombre.toLowerCase());
  return nombre;
}

export function hojaApu(
  wb: Workbook,
  a: ApuLibro,
  c: ApuCalculado,
  nombre: string,
  ctx: Contexto,
): RefsApu {
  const ws: Worksheet = wb.addWorksheet(nombre);
  ws.columns = [44, 12, 13, 15, 13, 15].map((width) => ({ width }));
  const hoja = comillas(nombre);
  poner(ws, 'A1', 'ANÁLISIS DE PRECIOS UNITARIOS', ST.title);
  poner(ws, 'A2', `Rubro: ${a.codigo} · ${a.descripcion}`, ST.bold);
  poner(ws, 'A3', `Unidad: ${a.unidad} · Disciplina: ${a.disciplina ?? ''}`);
  poner(ws, 'A4', `Rendimiento R (h/${a.unidad})`, ST.bold);
  poner(ws, 'C4', Number(a.rendimiento), ST.inNum);

  let r = 6;
  const bloque = (titulo: string, enc: string[]) => {
    for (let i = 0; i < 6; i++) poner(ws, colL(i) + r, i ? '' : titulo, ST.cap);
    r++;
    enc.forEach((h, i) => poner(ws, colL(i) + r, h, ST.head));
    r++;
  };
  const nombreDe = (l: LineaCalculada) => ctx.insumos.get(l.id)?.descripcion ?? l.id;
  const unidadDe = (l: LineaCalculada) => ctx.insumos.get(l.id)?.unidad ?? '';

  // Equipos y mano de obra: costo = A × B × R.
  const porHora = (lineas: LineaCalculada[]) =>
    lineas.map((l) => {
      poner(ws, 'A' + r, nombreDe(l));
      poner(ws, 'B' + r, n(l.cantidad), ST.inNum);
      poner(ws, 'C' + r, n(l.precio), ST.money, ctx.precio.get(l.id)!);
      poner(ws, 'D' + r, n(l.cantidad.times(l.precio)), ST.money, `B${r}*C${r}`);
      poner(ws, 'E' + r, Number(a.rendimiento), ST.num, '$C$4');
      poner(ws, 'F' + r, n(l.importe), ST.money, `ROUND(D${r}*E${r},2)`);
      r++;
    });
  // Materiales y transporte: costo = A × B.
  const porCantidad = (lineas: LineaCalculada[]) =>
    lineas.map((l) => {
      poner(ws, 'A' + r, nombreDe(l));
      poner(ws, 'B' + r, unidadDe(l));
      poner(ws, 'C' + r, n(l.cantidad), ST.inNum);
      poner(ws, 'D' + r, n(l.precio), ST.money, ctx.precio.get(l.id)!);
      poner(ws, 'F' + r, n(l.importe), ST.money, `ROUND(C${r}*D${r},2)`);
      r++;
    });
  const subtotal = (
    fila: number,
    rotulo: string,
    valor: number,
    desde: number,
    cuantas: number,
  ) => {
    poner(ws, 'E' + fila, rotulo, ST.bold);
    poner(
      ws,
      'F' + fila,
      valor,
      ST.boldMoney,
      cuantas ? `ROUND(SUM(F${desde}:F${fila - 1}),2)` : '0',
    );
  };

  bloque('EQUIPOS', [
    'DESCRIPCIÓN',
    'CANTIDAD A',
    'TARIFA B',
    'COSTO HORA C=A×B',
    'RENDIMIENTO R',
    'COSTO D=C×R',
  ]);
  const e0 = r;
  porHora(c.equipos);
  const filaHm = r++;
  const filaM = r;
  r += 2;

  bloque('MANO DE OBRA', [
    'DESCRIPCIÓN',
    'CANTIDAD A',
    'JORNAL/HR B',
    'COSTO HORA C=A×B',
    'RENDIMIENTO R',
    'COSTO D=C×R',
  ]);
  const m0 = r;
  porHora(c.manoObra);
  const filaN = r;
  subtotal(filaN, 'SUBTOTAL N', n(c.mo), m0, c.manoObra.length);
  r += 2;

  // La herramienta menor depende de la mano de obra, por eso se escribe después de N.
  const pctPropio =
    a.herramientaMenor !== '' && Number(a.herramientaMenor) !== Number(ctx.hmPctGlobal);
  poner(ws, 'A' + filaHm, `Herramienta menor (${Number(a.herramientaMenor)} % de la mano de obra)`);
  poner(
    ws,
    'F' + filaHm,
    n(c.hm),
    ST.money,
    `ROUND(${pctPropio ? Number(a.herramientaMenor) / 100 : ctx.hmGlobal}*F${filaN},2)`,
  );
  subtotal(filaM, 'SUBTOTAL M', n(c.eq), e0, c.equipos.length + 1);

  bloque('MATERIALES', [
    'DESCRIPCIÓN',
    'UNIDAD',
    'CANTIDAD A',
    'PRECIO UNIT. B',
    '',
    'COSTO C=A×B',
  ]);
  const a0 = r;
  porCantidad(c.materiales);
  const filaO = r;
  subtotal(filaO, 'SUBTOTAL O', n(c.ma), a0, c.materiales.length);
  r += 2;

  bloque('TRANSPORTE', ['DESCRIPCIÓN', 'UNIDAD', 'CANTIDAD A', 'TARIFA B', '', 'COSTO C=A×B']);
  const t0 = r;
  porCantidad(c.transporte);
  const filaP = r;
  subtotal(filaP, 'SUBTOTAL P', n(c.tra), t0, c.transporte.length);
  r += 2;

  poner(ws, 'A' + r, 'COSTO DIRECTO (M + N + O + P)', ST.bold);
  poner(ws, 'F' + r, n(c.cu), ST.boldMoney, `ROUND(F${filaM}+F${filaN}+F${filaO}+F${filaP},2)`);
  poner(ws, 'A' + (r + 1), 'INDIRECTOS Y UTILIDAD', ST.bold);
  poner(ws, 'F' + (r + 1), n(c.pctIndirectos) / 100, ST.pct, ctx.indirectos);
  poner(ws, 'A' + (r + 2), 'COSTO TOTAL DEL RUBRO (P.U. OFERTADO)', ST.bold);
  poner(ws, 'F' + (r + 2), n(c.puOfertado), ST.tot, `ROUND(F${r}*(1+F${r + 1}),2)`);
  poner(ws, 'A' + (r + 4), ctx.nota, ST.label);

  return {
    M: `${hoja}!$F$${filaM}`,
    N: `${hoja}!$F$${filaN}`,
    O: `${hoja}!$F$${filaO}`,
    P: `${hoja}!$F$${filaP}`,
    PU: `${hoja}!$F$${r + 2}`,
    R: `${hoja}!$C$4`,
  };
}
