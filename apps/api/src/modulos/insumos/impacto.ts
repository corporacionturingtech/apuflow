import {
  D,
  calcularOferta,
  impacto,
  type Apu,
  type Listas,
  type Oferta as OfertaMotor,
} from 'motor';
import type { ImpactoPrecio } from 'tipos';
import { eq } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import { insumo } from '../../db/esquema';
import * as ofertas from '../ofertas/repo';
import { NoExiste } from './servicio';

const LISTA = { MA: 'materiales', EQ: 'equipos', MO: 'manoObra', TR: 'transporte' } as const;

/**
 * Efecto de pasar `insumoId` de `puAnterior` a su precio vigente, en cada oferta que lo usa.
 * Los precios de la BD ya son los nuevos: el "antes" se arma poniendo el anterior en la lista.
 */
export async function impactoDePrecio(db: Bd, insumoId: string, puAnterior: string) {
  const ins = (await db.select().from(insumo).where(eq(insumo.id, insumoId)))[0];
  if (!ins) throw new NoExiste();
  const lista = LISTA[ins.tipo];
  const config = await ofertas.configuracion(db);
  const res: ImpactoPrecio = {
    insumoId,
    puAnterior,
    puNuevo: ins.pu,
    apus: 0,
    rubros: 0,
    diferencia: '0',
    ofertas: [],
  };
  const apusVistos = new Set<string>();
  let total = D(0);
  for (const { oferta: o } of await ofertas.listar(db)) {
    const [caps, rubs, indirs] = await Promise.all([
      ofertas.capitulos(db, o.id),
      ofertas.rubros(db, o.id),
      ofertas.indirectos(db, o.id),
    ]);
    const detalle = await ofertas.apusConLineas(db, [...new Set(rubs.map((r) => r.apuId))]);
    const listas: { [K in keyof Listas]: Listas[K][number][] } = {
      materiales: [],
      equipos: [],
      manoObra: [],
      transporte: [],
    };
    const vistos = new Set<string>();
    const apus: Apu[] = detalle.map(({ apu: a, lineas }) => {
      const por = (tipo: string) =>
        lineas.filter((l) => l.insumo.tipo === tipo).map((l) => [l.insumo.id, l.cantidad] as const);
      for (const { insumo: i } of lineas) {
        if (vistos.has(i.id)) continue;
        vistos.add(i.id);
        const p = i.id === insumoId ? puAnterior : i.pu;
        if (i.tipo === 'MA') listas.materiales.push({ id: i.id, pu: p });
        else listas[LISTA[i.tipo] as 'equipos'].push({ id: i.id, p });
      }
      return {
        id: a.id,
        rendimiento: a.rendimiento,
        herramientaMenor: a.pctHerramientaMenor,
        equipos: por('EQ'),
        manoObra: por('MO'),
        materiales: por('MA'),
        transporte: por('TR'),
      };
    });
    if (!vistos.has(insumoId)) continue;
    const entrada: OfertaMotor = {
      factor: config.factorMateriales,
      herramientaMenor: 0,
      iva: config.iva,
      indirectos: indirs.map((i) => ({ p: i.porcentaje })),
      listas,
      apus,
      capitulos: caps.map((c) => ({ id: c.id })),
      rubros: rubs.map((r) => ({ apu: r.apuId, cantidad: r.cantidad, capitulo: r.capituloId })),
    };
    const im = impacto(entrada, { lista, id: insumoId, precio: ins.pu });
    if (!im.rubros.length) continue;
    im.apus.forEach((a) => apusVistos.add(a));
    res.rubros += im.rubros.length;
    total = total.plus(im.diferencia);
    res.ofertas.push({
      id: o.id,
      nombre: o.nombre,
      apus: im.apus.length,
      rubros: im.rubros.length,
      antes: im.antes.totales.subtotal.toFixed(2),
      despues: im.despues.totales.subtotal.toFixed(2),
    });
  }
  res.apus = apusVistos.size;
  res.diferencia = total.toFixed(2);
  return res;
}

export interface CambioDePrecio {
  insumoId: string;
  puAnterior: string;
  puNuevo: string;
}

/**
 * Efecto conjunto de varios cambios de precio a la vez, en cada oferta que los usa.
 * No depende del precio que tenga hoy la BD: "antes" y "después" salen de los mapas recibidos.
 */
export async function impactoDeCambios(db: Bd, cambios: CambioDePrecio[]) {
  const res = { apus: 0, rubros: 0, diferencia: '0', ofertas: [] as ImpactoPrecio['ofertas'] };
  if (!cambios.length) return res;
  const antesDe = new Map(cambios.map((c) => [c.insumoId, c.puAnterior]));
  const despuesDe = new Map(cambios.map((c) => [c.insumoId, c.puNuevo]));
  const config = await ofertas.configuracion(db);
  const apusVistos = new Set<string>();
  let total = D(0);
  for (const { oferta: o } of await ofertas.listar(db)) {
    const [caps, rubs, indirs] = await Promise.all([
      ofertas.capitulos(db, o.id),
      ofertas.rubros(db, o.id),
      ofertas.indirectos(db, o.id),
    ]);
    const detalle = await ofertas.apusConLineas(db, [...new Set(rubs.map((r) => r.apuId))]);
    const armar = (precios: Map<string, string>): OfertaMotor => {
      const listas: { [K in keyof Listas]: Listas[K][number][] } = {
        materiales: [],
        equipos: [],
        manoObra: [],
        transporte: [],
      };
      const vistos = new Set<string>();
      const apus: Apu[] = detalle.map(({ apu: a, lineas }) => {
        const por = (tipo: string) =>
          lineas
            .filter((l) => l.insumo.tipo === tipo)
            .map((l) => [l.insumo.id, l.cantidad] as const);
        for (const { insumo: i } of lineas) {
          if (vistos.has(i.id)) continue;
          vistos.add(i.id);
          const p = precios.get(i.id) ?? i.pu;
          if (i.tipo === 'MA') listas.materiales.push({ id: i.id, pu: p });
          else listas[LISTA[i.tipo] as 'equipos'].push({ id: i.id, p });
        }
        return {
          id: a.id,
          rendimiento: a.rendimiento,
          herramientaMenor: a.pctHerramientaMenor,
          equipos: por('EQ'),
          manoObra: por('MO'),
          materiales: por('MA'),
          transporte: por('TR'),
        };
      });
      return {
        factor: config.factorMateriales,
        herramientaMenor: 0,
        iva: config.iva,
        indirectos: indirs.map((i) => ({ p: i.porcentaje })),
        listas,
        apus,
        capitulos: caps.map((c) => ({ id: c.id })),
        rubros: rubs.map((r) => ({ apu: r.apuId, cantidad: r.cantidad, capitulo: r.capituloId })),
      };
    };
    const afectados = new Set(
      detalle
        .filter(({ lineas }) => lineas.some((l) => antesDe.has(l.insumo.id)))
        .map(({ apu: a }) => a.id),
    );
    const nRubros = rubs.filter((r) => afectados.has(r.apuId)).length;
    if (!nRubros) continue;
    const antes = calcularOferta(armar(antesDe)).totales.subtotal;
    const despues = calcularOferta(armar(despuesDe)).totales.subtotal;
    afectados.forEach((a) => apusVistos.add(a));
    res.rubros += nRubros;
    total = total.plus(despues.minus(antes));
    res.ofertas.push({
      id: o.id,
      nombre: o.nombre,
      apus: afectados.size,
      rubros: nRubros,
      antes: antes.toFixed(2),
      despues: despues.toFixed(2),
    });
  }
  res.apus = apusVistos.size;
  res.diferencia = total.toFixed(2);
  return res;
}
