import { calcularApu, pctIndirectos } from './apu';
import { D, r2, suma } from './redondeo';
import type { ApuCalculado, CapituloCalculado, Oferta, OfertaCalculada, RubroCalculado } from './tipos';

export function calcularOferta(oferta: Oferta): OfertaCalculada {
  const apus: Record<string, ApuCalculado> = {};
  for (const a of oferta.apus) apus[a.id] = calcularApu(a, oferta.listas, oferta);

  const capitulos: Record<string, CapituloCalculado> = {};
  for (const c of oferta.capitulos) capitulos[c.id] = { cuTotal: new D(0), totalOfertado: new D(0), rubros: 0 };

  const rubros: Omit<RubroCalculado, 'peso'>[] = oferta.rubros.map((rubro) => {
    const u = apus[rubro.apu];
    if (!u) throw new Error(`APU no existe: ${rubro.apu}`);
    const q = new D(rubro.cantidad);
    const fila = {
      rubro,
      cantidad: q,
      eq: u.eq,
      ctEq: r2(u.eq.times(q)),
      mo: u.mo,
      ctMo: r2(u.mo.times(q)),
      ma: u.ma,
      ctMa: r2(u.ma.times(q)),
      tra: u.tra,
      ctTra: r2(u.tra.times(q)),
      cu: u.cu,
      cuTotal: r2(u.cu.times(q)),
      puOfertado: u.puOfertado,
      totalOfertado: r2(u.puOfertado.times(q)),
    };
    const c = capitulos[rubro.capitulo];
    if (c) {
      c.cuTotal = c.cuTotal.plus(fila.cuTotal);
      c.totalOfertado = c.totalOfertado.plus(fila.totalOfertado);
      c.rubros++;
    }
    return fila;
  });

  const cuTotalOferta = r2(suma(rubros, (x) => x.cuTotal));
  const subtotal = r2(suma(rubros, (x) => x.totalOfertado));
  const iva = r2(subtotal.times(oferta.iva).div(100));

  for (const c of Object.values(capitulos)) {
    c.cuTotal = r2(c.cuTotal);
    c.totalOfertado = r2(c.totalOfertado);
  }

  return {
    apus,
    rubros: rubros.map((x) => ({ ...x, peso: cuTotalOferta.isZero() ? new D(0) : x.cuTotal.div(cuTotalOferta) })),
    capitulos,
    totales: {
      ctEq: r2(suma(rubros, (x) => x.ctEq)),
      ctMo: r2(suma(rubros, (x) => x.ctMo)),
      ctMa: r2(suma(rubros, (x) => x.ctMa)),
      ctTra: r2(suma(rubros, (x) => x.ctTra)),
      cuTotalOferta,
      subtotal,
      indirectos: r2(subtotal.minus(cuTotalOferta)),
      pctIndirectos: pctIndirectos(oferta),
      iva,
      total: r2(subtotal.plus(iva)),
    },
  };
}
