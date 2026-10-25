import ExcelJS from 'exceljs';
import { calcularOferta, type Apu, type Listas, type Oferta } from 'motor';
import { hojaApu, nombreHojaApu, type RefsApu } from './hojas/apu';
import { hojaIndirectos } from './hojas/indirectos';
import { datosGenerales, hojasDeListas } from './hojas/listas';
import { hojaPresupuesto } from './hojas/presupuesto';
import type { LibroEntrada } from './tipos';

const NOTA = 'Generado por APUflow.';

/** Entrada del motor desde el libro: el cálculo es el mismo que ve la pantalla. */
export function aEntradaMotor(l: LibroEntrada): Oferta {
  const lista = (tipo: string) => l.insumos.filter((x) => x.tipo === tipo);
  const listas: Listas = {
    materiales: lista('MA').map((x) => ({ id: x.id, pu: x.pu })),
    equipos: lista('EQ').map((x) => ({ id: x.id, p: x.pu })),
    manoObra: lista('MO').map((x) => ({ id: x.id, p: x.pu })),
    transporte: lista('TR').map((x) => ({ id: x.id, p: x.pu })),
  };
  const tipoDe = new Map(l.insumos.map((x) => [x.id, x.tipo]));
  const apus: Apu[] = l.apus.map((a) => {
    const por = (t: string) =>
      a.lineas
        .filter((x) => tipoDe.get(x.insumoId) === t)
        .map((x) => [x.insumoId, x.cantidad] as const);
    return {
      id: a.id,
      rendimiento: a.rendimiento,
      herramientaMenor: a.herramientaMenor || undefined,
      equipos: por('EQ'),
      manoObra: por('MO'),
      materiales: por('MA'),
      transporte: por('TR'),
    };
  });
  return {
    factor: l.factor,
    herramientaMenor: l.herramientaMenor,
    iva: l.iva,
    indirectos: l.indirectos.map((i) => ({ p: i.porcentaje })),
    listas,
    apus,
    capitulos: l.capitulos.map((c) => ({ id: c.id })),
    rubros: l.rubros.map((r) => ({ apu: r.apuId, cantidad: r.cantidad, capitulo: r.capituloId })),
  };
}

export async function exportarLibro(l: LibroEntrada): Promise<Uint8Array> {
  const calc = calcularOferta(aEntradaMotor(l));
  const wb = new ExcelJS.Workbook();
  wb.creator = 'APUflow';
  // Si el cliente edita un precio, Excel recalcula todo al abrir.
  wb.calcProperties.fullCalcOnLoad = true;

  datosGenerales(wb, l);
  const listas = hojasDeListas(wb, l);
  const ind = hojaIndirectos(wb, l);

  // Presupuesto va antes que los APU, como en su libro; se llena al final, cuando ya se conocen sus referencias.
  const pres = wb.addWorksheet('Presupuesto');
  const refs = new Map<string, RefsApu>();
  const pendientes = wb.worksheets.length - 1;
  const insumos = new Map(l.insumos.map((x) => [x.id, x]));
  const usados = new Set(wb.worksheets.map((w) => w.name.toLowerCase()));
  const apusUsados = [...new Set(l.rubros.map((r) => r.apuId))];
  const porId = new Map(l.apus.map((a) => [a.id, a]));
  for (const id of apusUsados) {
    const a = porId.get(id)!;
    refs.set(
      id,
      hojaApu(wb, a, calc.apus[id]!, nombreHojaApu(a.codigo, usados), {
        precio: listas.precio,
        insumos,
        hmGlobal: listas.herramientaMenor,
        hmPctGlobal: l.herramientaMenor,
        indirectos: ind.indirectos,
        nota: NOTA,
      }),
    );
  }
  hojaPresupuesto(pres, l, calc, refs, ind.iva, NOTA);

  // Presupuesto queda como hoja activa.
  wb.views = [
    {
      x: 0,
      y: 0,
      width: 10000,
      height: 20000,
      firstSheet: 0,
      activeTab: pendientes,
      visibility: 'visible',
    },
  ];

  return new Uint8Array(await wb.xlsx.writeBuffer());
}
