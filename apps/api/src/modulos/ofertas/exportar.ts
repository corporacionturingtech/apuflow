import type { LibroEntrada } from 'excel';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';

/** Reúne lo que el libro necesita. Los insumos de la papelera entran si algún APU aún los usa. */
export async function armarLibro(db: Bd, id: string): Promise<LibroEntrada | null> {
  const o = await repo.buscar(db, id);
  if (!o) return null;
  const [caps, rubs, indirs, config, activos] = await Promise.all([
    repo.capitulos(db, id),
    repo.rubros(db, id),
    repo.indirectos(db, id),
    repo.configuracion(db),
    repo.insumosActivos(db),
  ]);
  const apus = await repo.apusConLineas(db, [...new Set(rubs.map((r) => r.apuId))]);

  const insumos = new Map(activos.map((i) => [i.id, i]));
  for (const { lineas } of apus) for (const l of lineas) insumos.set(l.insumo.id, l.insumo);

  return {
    datos: {
      proyecto: o.nombre,
      cliente: o.cliente ?? '',
      tipo: o.tipo,
      fecha: new Date().toISOString().slice(0, 10),
      empresa: config.nombre,
    },
    factor: config.factorMateriales,
    iva: config.iva,
    herramientaMenor: config.pctHerramientaMenor,
    indirectos: indirs.map((i) => ({ nombre: i.nombre, porcentaje: i.porcentaje })),
    insumos: [...insumos.values()].map((i) => ({
      id: i.id,
      tipo: i.tipo,
      descripcion: i.descripcion,
      unidad: i.unidad,
      pu: i.pu,
      seccion: i.seccion,
    })),
    apus: apus.map(({ apu: a, lineas }) => ({
      id: a.id,
      codigo: a.codigo,
      descripcion: a.descripcion,
      unidad: a.unidad,
      disciplina: a.disciplina,
      rendimiento: a.rendimiento,
      herramientaMenor: a.pctHerramientaMenor,
      lineas: lineas.map((l) => ({ insumoId: l.insumo.id, cantidad: l.cantidad })),
    })),
    capitulos: caps.map((c) => ({ id: c.id, nombre: c.nombre })),
    rubros: rubs.map((r) => ({
      capituloId: r.capituloId,
      apuId: r.apuId,
      codigo: r.codigo,
      cantidad: r.cantidad,
      cpc: r.cpc,
      origen: r.origen,
      vae: r.vae,
    })),
  };
}
