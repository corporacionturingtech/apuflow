import type { Worksheet } from 'exceljs';
import type { InsumoLibro, TipoInsumo } from '../tipos';
import { aPorcentaje, encabezados, hojaPor, norm, numero, texto, type Problema } from './celdas';

const HOJAS: Record<TipoInsumo, string[]> = {
  EQ: ['Equipos'],
  MO: ['Mano Obra', 'Mano de obra'],
  MA: ['Materiales'],
  TR: ['Transporte'],
};
const ETIQUETA: Record<TipoInsumo, string> = {
  EQ: 'Equipos',
  MO: 'Mano Obra',
  MA: 'Materiales',
  TR: 'Transporte',
};

export const claveInsumo = (tipo: TipoInsumo, descripcion: string) =>
  `${tipo}:${norm(descripcion)}`;

export interface ListasLeidas {
  insumos: InsumoLibro[];
  factor: string;
  herramientaMenor: string;
  hojas: number;
}

export function leerListas(
  wb: { worksheets: Worksheet[] },
  problemas: Problema[],
  { exigirTodas = true } = {},
): ListasLeidas {
  const insumos = new Map<string, InsumoLibro>();
  let factor = '1';
  let herramientaMenor = '5';
  let hojas = 0;

  for (const tipo of ['EQ', 'MO', 'MA', 'TR'] as TipoInsumo[]) {
    const ws = hojaPor(wb, ...HOJAS[tipo]);
    const nombre = ETIQUETA[tipo];
    if (!ws) {
      if (!exigirTodas) continue;
      problemas.push({
        hoja: nombre,
        fila: 0,
        mensaje: `No encontramos la hoja «${nombre}».`,
        bloqueante: true,
      });
      continue;
    }
    hojas++;
    const enc = encabezados(
      ws,
      (c) =>
        c.some((x) => x.startsWith('descrip')) &&
        c.some((x) => /^(precio unit|tarifa|jornal|precio)/.test(x) && !x.includes('referencial')),
    );
    if (!enc) {
      problemas.push({
        hoja: ws.name,
        fila: 0,
        mensaje:
          'No encontramos los encabezados. Necesita una columna «DESCRIPCIÓN» y otra de precio o tarifa.',
        bloqueante: true,
      });
      continue;
    }
    const col = (ok: (x: string) => boolean) => enc.cols.findIndex(ok) + 1;
    const cDesc = col((x) => x.startsWith('descrip') && !x.includes('cpc'));
    const cUni = col((x) => x === 'unidad' || x === 'und' || x === 'u');
    const cPrecio =
      col((x) => x.startsWith('precio unit')) ||
      col((x) => /^(tarifa|jornal|precio)/.test(x) && !x.includes('referencial'));

    if (tipo === 'MA') {
      for (let r = 1; r < enc.fila; r++) {
        const row = ws.getRow(r);
        for (let c = 1; c < 12; c++)
          if (norm(texto(row, c)) === 'factor' && numero(row, c + 1) != null)
            factor = String(numero(row, c + 1));
      }
    }
    let seccion: string | null = null;
    for (let r = enc.fila + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const desc = texto(row, cDesc);
      const precio = numero(row, cPrecio);
      if (tipo === 'EQ' && norm(desc).startsWith('herramienta menor')) {
        if (precio != null) herramientaMenor = aPorcentaje(precio);
        continue;
      }
      if (tipo === 'MA' && !desc && texto(row, 1) && precio == null) {
        seccion = texto(row, 1);
        continue;
      }
      if (!desc) continue;
      if (precio == null) {
        problemas.push({
          hoja: ws.name,
          fila: r,
          mensaje: `«${desc}» no tiene un precio válido; se omite.`,
          bloqueante: false,
        });
        continue;
      }
      const clave = claveInsumo(tipo, desc);
      const previo = insumos.get(clave);
      if (previo) {
        if (Number(previo.pu) !== precio)
          problemas.push({
            hoja: ws.name,
            fila: r,
            mensaje: `«${desc}» aparece repetido con otro precio (${previo.pu} y ${precio}). Deje una sola fila.`,
            bloqueante: true,
          });
        continue;
      }
      insumos.set(clave, {
        id: clave,
        tipo,
        descripcion: desc,
        unidad: (cUni && texto(row, cUni)) || (tipo === 'EQ' || tipo === 'MO' ? 'h' : 'u'),
        pu: String(precio),
        seccion: tipo === 'MA' ? seccion : null,
      });
    }
  }
  return { insumos: [...insumos.values()], factor, herramientaMenor, hojas };
}
