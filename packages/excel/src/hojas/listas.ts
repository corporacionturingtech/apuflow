import type { Workbook } from 'exceljs';
import { precioMaterial } from 'motor';
import { ST, colL, poner } from '../estilos';
import type { InsumoLibro, LibroEntrada, TipoInsumo } from '../tipos';

export interface RefsListas {
  /** Referencia absoluta (`Hoja!$C$4`) del precio de cada insumo. */
  precio: Map<string, string>;
  herramientaMenor: string;
}

const NOMBRE_HOJA: Record<TipoInsumo, string> = {
  EQ: 'Equipos',
  MO: 'Mano Obra',
  MA: 'Materiales',
  TR: 'Transporte',
};
export const nombreHoja = (t: TipoInsumo) => NOMBRE_HOJA[t];
const hojaRef = (t: TipoInsumo) => (t === 'MO' ? "'Mano Obra'" : NOMBRE_HOJA[t]);

export function datosGenerales(wb: Workbook, l: LibroEntrada) {
  const ws = wb.addWorksheet('Datos generales');
  ws.columns = [{ width: 30 }, { width: 50 }];
  poner(ws, 'A1', 'DATOS GENERALES', ST.title);
  const pares = [
    ['Proyecto', l.datos.proyecto],
    ['Cliente', l.datos.cliente],
    ['Fecha de la oferta', l.datos.fecha],
    ['Tipo de contratación', l.datos.tipo === 'publico' ? 'Público' : 'Privado'],
    ['Oferente', l.datos.empresa],
  ];
  pares.forEach(([k, v], i) => {
    poner(ws, 'A' + (i + 3), k!, ST.bold);
    poner(ws, 'B' + (i + 3), v!, ST.txt);
  });
}

function tarifas(
  wb: Workbook,
  tipo: 'EQ' | 'MO' | 'TR',
  titulo: string,
  encabezados: string[],
  insumos: InsumoLibro[],
  precio: Map<string, string>,
) {
  const ws = wb.addWorksheet(NOMBRE_HOJA[tipo]);
  const conUnidad = tipo === 'TR';
  ws.columns = [{ width: 8 }, { width: 40 }, { width: conUnidad ? 10 : 14 }, { width: 14 }];
  poner(ws, 'A1', titulo, ST.title);
  encabezados.forEach((h, i) => poner(ws, colL(i) + '3', h, ST.head));
  const col = conUnidad ? 'D' : 'C';
  insumos.forEach((x, i) => {
    const r = i + 4;
    poner(ws, 'A' + r, i + 1, ST.num);
    poner(ws, 'B' + r, x.descripcion);
    if (conUnidad) poner(ws, 'C' + r, x.unidad);
    poner(ws, col + r, Number(x.pu), ST.inMoney);
    precio.set(x.id, `${hojaRef(tipo)}!$${col}$${r}`);
  });
  return { ws, siguiente: insumos.length + 5 };
}

export function hojasDeListas(wb: Workbook, l: LibroEntrada): RefsListas {
  const precio = new Map<string, string>();
  const de = (t: TipoInsumo) => l.insumos.filter((x) => x.tipo === t);

  const eq = tarifas(wb, 'EQ', 'EQUIPOS', ['ITEM', 'DESCRIPCIÓN', 'TARIFA/HORA'], de('EQ'), precio);
  poner(eq.ws, 'B' + eq.siguiente, 'Herramienta menor (% de la mano de obra)', ST.bold);
  poner(eq.ws, 'C' + eq.siguiente, Number(l.herramientaMenor) / 100, ST.inPct);

  tarifas(wb, 'MO', 'MANO DE OBRA', ['ITEM', 'DESCRIPCIÓN', 'JORNAL/HR'], de('MO'), precio);

  // Materiales: celda FACTOR arriba y secciones por disciplina, como su hoja.
  const ma = wb.addWorksheet('Materiales');
  ma.columns = [7, 46, 9, 14, 14, 14].map((width) => ({ width }));
  ma.views = [{ state: 'frozen', ySplit: 3 }];
  poner(ma, 'E1', 'FACTOR', ST.bold);
  poner(ma, 'F1', Number(l.factor), ST.inNum);
  ['ITEM', 'DESCRIPCIÓN', 'UNIDAD', 'PRECIO REFERENCIAL', 'PRECIO UNITARIO', 'PRECIO'].forEach(
    (h, i) => poner(ma, colL(i) + '3', h, ST.head),
  );
  const materiales = de('MA');
  const secciones = [...new Set(materiales.map((m) => m.seccion ?? 'Sin sección'))];
  let r = 4;
  for (const sec of secciones) {
    for (let i = 0; i < 6; i++) poner(ma, colL(i) + r, i ? '' : sec, ST.sec);
    r++;
    let n = 1;
    for (const m of materiales.filter((x) => (x.seccion ?? 'Sin sección') === sec)) {
      poner(ma, 'A' + r, n++, ST.num);
      poner(ma, 'B' + r, m.descripcion);
      poner(ma, 'C' + r, m.unidad);
      poner(ma, 'E' + r, Number(m.pu), ST.inMoney);
      poner(
        ma,
        'F' + r,
        precioMaterial(m.pu, l.factor).toNumber(),
        ST.money,
        `ROUND(E${r}*$F$1,2)`,
      );
      precio.set(m.id, `Materiales!$F$${r}`);
      r++;
    }
  }

  tarifas(wb, 'TR', 'TRANSPORTE', ['ITEM', 'DESCRIPCIÓN', 'UNIDAD', 'TARIFA'], de('TR'), precio);
  return { precio, herramientaMenor: `Equipos!$C$${eq.siguiente}` };
}
