import type { Worksheet } from 'exceljs';
import type { LibroEntrada } from '../tipos';
import { encabezados, formula, norm, numero, texto, type Problema } from './celdas';

export interface CacheLibro {
  total: number | null;
  rubros: { fila: number; descripcion: string; totalOfertado: number | null }[];
}

/** Nombre de hoja citado en una fórmula como `'APU C01'!$F$9`. */
const hojaDeFormula = (f: string | null) => {
  const m = f && /^'((?:[^']|'')+)'!/.exec(f);
  return m ? m[1]!.replace(/''/g, "'") : null;
};

export function leerPresupuesto(
  ws: Worksheet,
  codigoPorHoja: Map<string, string>,
  codigoPorDescripcion: Map<string, string[]>,
  problemas: Problema[],
): { capitulos: LibroEntrada['capitulos']; rubros: LibroEntrada['rubros']; cache: CacheLibro } {
  const enc = encabezados(
    ws,
    (c) => c.includes('numero') && c.some((x) => x.startsWith('cantidad')),
  );
  const cache: CacheLibro = { total: null, rubros: [] };
  const capitulos: LibroEntrada['capitulos'] = [];
  const rubros: LibroEntrada['rubros'] = [];
  if (!enc) {
    problemas.push({
      hoja: ws.name,
      fila: 0,
      mensaje: 'No encontramos los encabezados. Necesita las columnas «NUMERO» y «CANTIDAD».',
      bloqueante: true,
    });
    return { capitulos, rubros, cache };
  }
  const col = (ok: (x: string) => boolean) => enc.cols.findIndex(ok) + 1;
  const cDesc = col((x) => x.startsWith('descripcion del rubro') || x === 'descripcion');
  const cCpc = col((x) => x.includes('cpc'));
  const cUni = col((x) => x === 'unidad');
  const cCant = col((x) => x.startsWith('cantidad'));
  const cTotal = col((x) => x === 'total ofertado');
  const cPu = col((x) => x === 'p u ofertado');
  const cOrigen = col((x) => x.startsWith('p nd i'));
  const cVae = col((x) => x === 'vae');

  for (let r = 1; r < enc.fila; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= cTotal; c++) {
      if (norm(texto(row, c)).includes('monto total') && cTotal) cache.total = numero(row, cTotal);
    }
  }
  const cacheTotal = cache.total;

  for (let r = enc.fila + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const num = texto(row, 1);
    const desc = texto(row, cDesc);
    if (/^\d+$/.test(num) && desc && !texto(row, cUni)) {
      capitulos.push({ id: `cap${num}`, nombre: desc });
      continue;
    }
    if (!/^\d+\.\d+$/.test(num)) continue;
    const cap = capitulos.at(-1);
    if (!cap) {
      problemas.push({
        hoja: ws.name,
        fila: r,
        mensaje: 'Este rubro está antes de cualquier capítulo.',
        bloqueante: true,
      });
      continue;
    }
    const hoja = hojaDeFormula(formula(row, cPu));
    const porDesc = codigoPorDescripcion.get(norm(desc)) ?? [];
    const codigo =
      (hoja && codigoPorHoja.get(norm(hoja))) || (porDesc.length === 1 ? porDesc[0] : undefined);
    const cantidad = numero(row, cCant);
    if (!codigo) {
      problemas.push({
        hoja: ws.name,
        fila: r,
        mensaje: `No encontramos el APU del rubro «${desc}».`,
        bloqueante: true,
      });
      continue;
    }
    if (cantidad == null) {
      problemas.push({
        hoja: ws.name,
        fila: r,
        mensaje: `El rubro «${desc}» no tiene cantidad válida.`,
        bloqueante: true,
      });
      continue;
    }
    const origen = cOrigen ? texto(row, cOrigen) : '';
    const vae = cVae ? numero(row, cVae) : null;
    rubros.push({
      capituloId: cap.id,
      apuId: codigo,
      codigo,
      cantidad: String(cantidad),
      cpc: (cCpc && texto(row, cCpc)) || null,
      origen: ['P', 'ND', 'I'].includes(origen) ? origen : null,
      vae: vae != null ? String(+(vae * 100).toFixed(6)) : null,
    });
    cache.rubros.push({
      fila: r,
      descripcion: desc,
      totalOfertado: cTotal ? numero(row, cTotal) : null,
    });
  }
  cache.total = cacheTotal ?? cache.total;
  return { capitulos, rubros, cache };
}
