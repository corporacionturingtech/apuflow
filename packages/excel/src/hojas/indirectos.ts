import type { Workbook } from 'exceljs';
import { pctIndirectos } from 'motor';
import { ST, poner } from '../estilos';
import type { LibroEntrada } from '../tipos';

export function hojaIndirectos(wb: Workbook, l: LibroEntrada) {
  const ws = wb.addWorksheet('Indirectos');
  ws.columns = [{ width: 44 }, { width: 14 }];
  poner(ws, 'A1', 'INDIRECTOS Y UTILIDAD', ST.title);
  poner(ws, 'A3', 'CONCEPTO', ST.head);
  poner(ws, 'B3', 'PORCENTAJE', ST.head);
  l.indirectos.forEach((i, k) => {
    poner(ws, 'A' + (4 + k), i.nombre);
    poner(ws, 'B' + (4 + k), Number(i.porcentaje) / 100, ST.inPct);
  });
  const fila = 4 + l.indirectos.length;
  const total = pctIndirectos({ indirectos: l.indirectos.map((i) => ({ p: i.porcentaje })) });
  poner(ws, 'A' + fila, 'TOTAL INDIRECTOS Y UTILIDAD', ST.bold);
  poner(
    ws,
    'B' + fila,
    total.div(100).toNumber(),
    ST.pct,
    l.indirectos.length ? `SUM(B4:B${fila - 1})` : '0',
  );
  poner(ws, 'A' + (fila + 2), 'IVA', ST.bold);
  poner(ws, 'B' + (fila + 2), Number(l.iva) / 100, ST.inPct);
  return { indirectos: `Indirectos!$B$${fila}`, iva: `Indirectos!$B$${fila + 2}` };
}
