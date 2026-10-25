import ExcelJS from 'exceljs';
import type { InsumoLibro } from '../tipos';
import type { Problema } from './celdas';
import { leerListas } from './listas';

export interface PreciosLeidos {
  insumos: InsumoLibro[];
  hojas: number;
  problemas: Problema[];
}

/** Lee solo los precios de las listas que traiga el libro (puede ser una sola hoja). */
export async function leerPrecios(buffer: ArrayBuffer | Uint8Array): Promise<PreciosLeidos> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);
  const problemas: Problema[] = [];
  const { insumos, hojas } = leerListas(wb, problemas, { exigirTodas: false });
  if (!hojas)
    problemas.push({
      hoja: 'Libro',
      fila: 0,
      mensaje:
        'No encontramos ninguna lista de precios. Necesita una hoja llamada Materiales, Equipos, Mano Obra o Transporte.',
      bloqueante: true,
    });
  return { insumos, hojas, problemas };
}
