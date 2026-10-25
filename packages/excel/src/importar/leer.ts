import ExcelJS from 'exceljs';
import type { LibroEntrada } from '../tipos';
import { aPorcentaje, hojaPor, norm, numero, texto, type Problema } from './celdas';
import { esHojaApu, leerApu } from './apus';
import { leerListas } from './listas';
import { leerPresupuesto, type CacheLibro } from './presupuesto';

export type { Problema } from './celdas';
export type { CacheLibro } from './presupuesto';

export interface LibroLeido {
  libro: LibroEntrada;
  /** Valores en caché del libro: sirven para comprobar «cuadra», nunca para calcular. */
  cache: CacheLibro;
  resumen: { listas: number; insumos: number; apus: number; rubros: number; capitulos: number };
  problemas: Problema[];
}

/** Lee un .xlsx por encabezados (no por posiciones fijas) y lo lleva a la forma `LibroEntrada`. */
export async function leerLibro(buffer: ArrayBuffer | Uint8Array): Promise<LibroLeido> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);
  const problemas: Problema[] = [];

  const listas = leerListas(wb, problemas);
  const insumos = new Map(listas.insumos.map((i) => [i.id, i]));

  const datos = new Map<string, string>();
  const gen = hojaPor(wb, 'Datos generales');
  gen?.eachRow((row) => datos.set(norm(texto(row, 1)), texto(row, 2)));

  const indirectos: LibroEntrada['indirectos'] = [];
  let iva = '15';
  const ind = hojaPor(wb, 'Indirectos');
  if (!ind) {
    problemas.push({
      hoja: 'Indirectos',
      fila: 0,
      mensaje: 'No encontramos la hoja «Indirectos».',
      bloqueante: false,
    });
  } else {
    ind.eachRow((row) => {
      const concepto = texto(row, 1);
      const p = numero(row, 2);
      const n = norm(concepto);
      if (!concepto || p == null || n === 'concepto') return;
      if (n === 'iva') iva = aPorcentaje(p);
      else if (!n.startsWith('total'))
        indirectos.push({ nombre: concepto, porcentaje: aPorcentaje(p) });
    });
  }

  const apus = wb.worksheets
    .filter((w) => esHojaApu(w.name))
    .map((w) => ({ hoja: w.name, apu: leerApu(w, insumos, listas.herramientaMenor, problemas) }));
  const codigos = new Set<string>();
  for (const { hoja, apu } of apus) {
    if (codigos.has(apu.codigo))
      problemas.push({
        hoja,
        fila: 2,
        mensaje: `El código ${apu.codigo} está en más de una hoja APU.`,
        bloqueante: true,
      });
    codigos.add(apu.codigo);
  }
  const porHoja = new Map(apus.map(({ hoja, apu }) => [norm(hoja), apu.codigo]));
  const porDescripcion = new Map<string, string[]>();
  for (const { apu } of apus)
    porDescripcion.set(norm(apu.descripcion), [
      ...(porDescripcion.get(norm(apu.descripcion)) ?? []),
      apu.codigo,
    ]);

  const pres = hojaPor(wb, 'Presupuesto');
  const vacio = { capitulos: [], rubros: [], cache: { total: null, rubros: [] } as CacheLibro };
  if (!pres)
    problemas.push({
      hoja: 'Presupuesto',
      fila: 0,
      mensaje: 'No encontramos la hoja «Presupuesto».',
      bloqueante: true,
    });
  const p = pres ? leerPresupuesto(pres, porHoja, porDescripcion, problemas) : vacio;

  const publico = norm(datos.get('tipo de contratacion') ?? '').startsWith('public');
  const libro: LibroEntrada = {
    datos: {
      proyecto: datos.get('proyecto') ?? '',
      cliente: datos.get('cliente') ?? '',
      tipo: publico ? 'publico' : 'privado',
      fecha: datos.get('fecha de la oferta') ?? '',
      empresa: datos.get('oferente') ?? '',
    },
    factor: listas.factor,
    iva,
    herramientaMenor: listas.herramientaMenor,
    indirectos,
    insumos: listas.insumos,
    apus: apus.map((a) => a.apu),
    capitulos: p.capitulos,
    rubros: p.rubros,
  };
  if (!libro.datos.proyecto)
    problemas.push({
      hoja: 'Datos generales',
      fila: 0,
      mensaje: 'Falta el nombre del proyecto; se usará el nombre del archivo.',
      bloqueante: false,
    });

  return {
    libro,
    cache: p.cache,
    resumen: {
      listas: listas.hojas,
      insumos: libro.insumos.length,
      apus: libro.apus.length,
      rubros: libro.rubros.length,
      capitulos: libro.capitulos.length,
    },
    problemas,
  };
}
