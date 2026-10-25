import type { Worksheet } from 'exceljs';
import type { ApuLibro, InsumoLibro, TipoInsumo } from '../tipos';
import { aPorcentaje, norm, numero, texto, type Problema } from './celdas';
import { claveInsumo } from './listas';

const BLOQUES: Record<string, { tipo: TipoInsumo; colCantidad: number }> = {
  equipos: { tipo: 'EQ', colCantidad: 2 },
  'mano de obra': { tipo: 'MO', colCantidad: 2 },
  materiales: { tipo: 'MA', colCantidad: 3 },
  transporte: { tipo: 'TR', colCantidad: 3 },
};

export const esHojaApu = (nombre: string) => norm(nombre).startsWith('apu ');

/** Una hoja `APU xx`: cabecera con código, unidad y R; luego los cuatro bloques de líneas. */
export function leerApu(
  ws: Worksheet,
  insumos: Map<string, InsumoLibro>,
  hmGlobal: string,
  problemas: Problema[],
): ApuLibro {
  const rubro = /^rubro:\s*(.+?)\s*·\s*(.*)$/i.exec(texto(ws.getRow(2), 1));
  const codigo = rubro?.[1] ?? ws.name.replace(/^apu\s+/i, '');
  const uni = /^unidad:\s*(.*?)\s*·\s*disciplina:\s*(.*)$/i.exec(texto(ws.getRow(3), 1));
  const rendimiento = numero(ws.getRow(4), 3);
  if (rendimiento == null || rendimiento < 0)
    problemas.push({
      hoja: ws.name,
      fila: 4,
      mensaje: 'El rendimiento R (celda C4) no es un número válido.',
      bloqueante: true,
    });

  const apu: ApuLibro = {
    id: codigo,
    codigo,
    descripcion: rubro?.[2] ?? codigo,
    unidad: uni?.[1] ?? 'u',
    disciplina: uni?.[2] || null,
    rendimiento: String(rendimiento ?? 1),
    herramientaMenor: hmGlobal,
    lineas: [],
  };

  const vistos = new Set<string>();
  let bloque: { tipo: TipoInsumo; colCantidad: number } | null = null;
  for (let r = 6; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const a = texto(row, 1);
    const titulo = BLOQUES[norm(a)];
    if (titulo && norm(texto(ws.getRow(r + 1), 1)).startsWith('descrip')) {
      bloque = titulo;
      r++;
      continue;
    }
    if (/^costo directo/.test(norm(a))) bloque = null;
    if (!bloque || !a) continue;
    const hm = /^herramienta menor\s*\(([\d.,]+)\s*%/i.exec(a);
    if (hm) {
      apu.herramientaMenor = aPorcentaje(Number(hm[1]!.replace(',', '.')) / 100);
      continue;
    }
    const insumo = insumos.get(claveInsumo(bloque.tipo, a));
    const cantidad = numero(row, bloque.colCantidad);
    if (!insumo) {
      problemas.push({
        hoja: ws.name,
        fila: r,
        mensaje: `«${a}» no está en la lista de ${bloque.tipo === 'MA' ? 'Materiales' : bloque.tipo === 'MO' ? 'Mano Obra' : bloque.tipo === 'EQ' ? 'Equipos' : 'Transporte'}.`,
        bloqueante: true,
      });
      continue;
    }
    if (cantidad == null) {
      problemas.push({
        hoja: ws.name,
        fila: r,
        mensaje: `«${a}» no tiene cantidad válida.`,
        bloqueante: true,
      });
      continue;
    }
    if (vistos.has(insumo.id)) {
      problemas.push({
        hoja: ws.name,
        fila: r,
        mensaje: `«${a}» está repetido en este APU.`,
        bloqueante: true,
      });
      continue;
    }
    vistos.add(insumo.id);
    apu.lineas.push({ insumoId: insumo.id, cantidad: String(cantidad) });
  }
  return apu;
}
