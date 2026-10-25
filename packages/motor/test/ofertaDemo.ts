import { readFileSync } from 'node:fs';
import type { Oferta } from '../src/tipos';

interface Fixture {
  factor: number;
  herramientaMenor: number;
  iva: number;
  indirectos: { id: string; p: number }[];
  materiales: { id: string; pu: number }[];
  manoObra: { id: string; p: number }[];
  equipos: { id: string; p: number }[];
  transporte: { id: string; p: number }[];
  apus: { id: string; r: number; eq: [string, number][]; mo: [string, number][]; ma: [string, number][]; tr: [string, number][] }[];
  bloques: { id: string; r: [string, number][] }[];
}
export const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/sedemi-demo.json', import.meta.url), 'utf8'),
) as Fixture;

/** Todos los bloques del fixture como capítulos; `repetir` multiplica los rubros (pruebas de volumen). */
export function ofertaDemo(repetir = 1): Oferta {
  const d = fixture;
  const caps = d.bloques.map((b, i) => ({ id: `k${i}`, bloque: b }));
  const rubros = Array.from({ length: repetir }, () =>
    caps.flatMap((c) => c.bloque.r.map(([a, q]) => ({ apu: a, cantidad: q, capitulo: c.id }))),
  ).flat();
  return {
    factor: d.factor,
    herramientaMenor: d.herramientaMenor,
    iva: d.iva,
    indirectos: d.indirectos,
    listas: { materiales: d.materiales, manoObra: d.manoObra, equipos: d.equipos, transporte: d.transporte },
    apus: d.apus.map((a) => ({ id: a.id, rendimiento: a.r, equipos: a.eq, manoObra: a.mo, materiales: a.ma, transporte: a.tr })),
    capitulos: caps.map((c) => ({ id: c.id })),
    rubros,
  };
}
