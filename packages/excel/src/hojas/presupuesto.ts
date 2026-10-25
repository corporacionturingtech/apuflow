import type { Worksheet } from 'exceljs';
import type { OfertaCalculada } from 'motor';
import { ST, colL, poner } from '../estilos';
import type { LibroEntrada } from '../tipos';
import type { RefsApu } from './apu';

const ENCABEZADOS = [
  'NUMERO',
  'DESCRIPCION DEL RUBRO',
  'DESCRIPCION CPC',
  'UNIDAD',
  'CANTIDAD',
  'EQ',
  'CT EQ',
  'MO',
  'CT MO',
  'MA',
  'CT MA',
  'TRA',
  'CT TRA',
  'CU',
  'CU TOTAL',
  'PESO',
  'RENDIMIENTO',
  'P.U. OFERTADO',
  'TOTAL OFERTADO',
];
const ANCHOS = [9, 46, 12, 8, 11, 11, 14, 11, 14, 11, 14, 11, 14, 12, 15, 9, 12, 14, 15];

/** Hoja Presupuesto: total arriba (fila 4), capítulos como títulos, fórmulas hacia cada hoja APU. */
export function hojaPresupuesto(
  ws: Worksheet,
  l: LibroEntrada,
  calc: OfertaCalculada,
  apuRef: Map<string, RefsApu>,
  iva: string,
  nota: string,
) {
  const publico = l.datos.tipo === 'publico';
  const encabezados = publico ? [...ENCABEZADOS, 'P / ND / I', 'VAE'] : ENCABEZADOS;
  ws.columns = [...ANCHOS, ...(publico ? [10, 9] : [])].map((width) => ({ width }));
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  poner(ws, 'A1', 'PRESUPUESTO · ' + l.datos.proyecto, ST.title);
  poner(ws, 'A2', `Cliente: ${l.datos.cliente} · ${l.datos.fecha}`);
  encabezados.forEach((h, i) => poner(ws, colL(i) + '5', h, ST.head));
  poner(ws, 'D4', 'MONTO TOTAL DEL PROYECTO', ST.bold);

  const apuDe = new Map(l.apus.map((a) => [a.id, a]));
  let r = 7;
  l.capitulos.forEach((cap, ci) => {
    const indices = l.rubros.flatMap((x, i) => (x.capituloId === cap.id ? [i] : []));
    if (!indices.length) return;
    encabezados.forEach((_, i) =>
      poner(ws, colL(i) + r, i === 0 ? String(ci + 1) : i === 1 ? cap.nombre : '', ST.cap),
    );
    r++;
    indices.forEach((idx, ri) => {
      const x = l.rubros[idx]!;
      const f = calc.rubros[idx]!;
      const a = apuDe.get(x.apuId)!;
      const ar = apuRef.get(x.apuId)!;
      const num = (d: { toNumber(): number }) => d.toNumber();
      poner(ws, 'A' + r, `${ci + 1}.${ri + 1}`);
      poner(ws, 'B' + r, a.descripcion);
      poner(ws, 'C' + r, x.cpc ?? '');
      poner(ws, 'D' + r, a.unidad);
      poner(ws, 'E' + r, num(f.cantidad), ST.inNum);
      const par: [string, string, number, number, string][] = [
        ['F', 'G', num(f.eq), num(f.ctEq), ar.M],
        ['H', 'I', num(f.mo), num(f.ctMo), ar.N],
        ['J', 'K', num(f.ma), num(f.ctMa), ar.O],
        ['L', 'M', num(f.tra), num(f.ctTra), ar.P],
      ];
      for (const [cu, ct, vu, vt, ref] of par) {
        poner(ws, cu + r, vu, ST.num, ref);
        poner(ws, ct + r, vt, ST.money, `ROUND(${cu}${r}*E${r},2)`);
      }
      poner(ws, 'N' + r, num(f.cu), ST.money, `ROUND(F${r}+H${r}+J${r}+L${r},2)`);
      poner(ws, 'O' + r, num(f.cuTotal), ST.money, `ROUND(N${r}*E${r},2)`);
      poner(ws, 'P' + r, num(f.peso), ST.pct, `IF($O$4=0,0,O${r}/$O$4)`);
      poner(ws, 'Q' + r, Number(a.rendimiento), ST.num, ar.R);
      poner(ws, 'R' + r, num(f.puOfertado), ST.money, ar.PU);
      poner(ws, 'S' + r, num(f.totalOfertado), ST.money, `ROUND(R${r}*E${r},2)`);
      if (publico) {
        poner(ws, 'T' + r, x.origen ?? '');
        poner(ws, 'U' + r, x.vae != null ? Number(x.vae) / 100 : '', ST.pct);
      }
      r++;
    });
  });

  const ultima = r - 1;
  const t = calc.totales;
  const sumas: [string, number][] = [
    ['G', num(t.ctEq)],
    ['I', num(t.ctMo)],
    ['K', num(t.ctMa)],
    ['M', num(t.ctTra)],
    ['O', num(t.cuTotalOferta)],
    ['S', num(t.subtotal)],
  ];
  for (const [col, v] of sumas)
    poner(ws, col + '4', v, ST.tot, `SUM(${col}7:${col}${Math.max(ultima, 7)})`);

  const s = r + 1;
  const resumen: [string, number, string, boolean][] = [
    ['Costo directo', num(t.cuTotalOferta), 'O4', false],
    ['Indirectos y utilidad', num(t.indirectos), 'S4-O4', false],
    ['Subtotal sin IVA', num(t.subtotal), 'S4', false],
    ['IVA', num(t.iva), `ROUND(S4*${iva},2)`, false],
    ['TOTAL DE LA OFERTA', num(t.total), `S${s + 2}+S${s + 3}`, true],
  ];
  resumen.forEach(([rotulo, v, formula, total], i) => {
    poner(ws, 'N' + (s + i), rotulo, ST.bold);
    poner(ws, 'S' + (s + i), v, total ? ST.tot : ST.boldMoney, formula);
  });
  poner(ws, 'A' + (s + 6), nota, ST.label);
}

function num(d: { toNumber(): number }) {
  return d.toNumber();
}
