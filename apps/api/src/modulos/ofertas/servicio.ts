import type {
  CapituloCrear,
  IndirectoCambio,
  OfertaCambio,
  OfertaCrear,
  RubroCambio,
  RubroCrear,
} from 'tipos';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';

export class ConflictoVersion extends Error {}
export class NoExiste extends Error {}

export async function crear(db: Bd, usuarioId: string, d: OfertaCrear) {
  return db.transaction(async (tx) => {
    const o = await repo.crear(tx, {
      nombre: d.nombre,
      cliente: d.cliente ?? null,
      tipo: d.tipo,
      actualizadoPor: usuarioId,
    });
    await repo.registrarBitacora(tx, [
      { usuarioId, entidad: 'oferta', entidadId: o.id, campo: null, antes: null, despues: o },
    ]);
    return o;
  });
}

export async function editar(db: Bd, usuarioId: string, id: string, cambio: OfertaCambio) {
  return db.transaction(async (tx) => {
    const actual = await repo.buscar(tx, id);
    if (!actual) throw new NoExiste();
    const { version, ...campos } = cambio;
    const nuevos: Record<string, string | null> = {};
    const bitacora = [];
    for (const campo of ['nombre', 'cliente', 'tipo', 'iva', 'costoObjetivo'] as const) {
      const valor = campos[campo];
      if (valor === undefined || valor === actual[campo]) continue;
      if (campo === 'iva' && Number(valor) === Number(actual.iva)) continue;
      if (campo === 'costoObjetivo' && valor !== null && Number(valor) === Number(actual[campo]))
        continue;
      nuevos[campo] = valor;
      bitacora.push({
        usuarioId,
        entidad: 'oferta',
        entidadId: id,
        campo,
        antes: { valor: actual[campo] },
        despues: { valor },
      });
    }
    const fila = await repo.actualizar(tx, id, version, { ...nuevos, actualizadoPor: usuarioId });
    if (!fila) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, bitacora);
  });
}

export async function cambiarIndirecto(
  db: Bd,
  usuarioId: string,
  ofertaId: string,
  id: string,
  d: IndirectoCambio,
) {
  return db.transaction(async (tx) => {
    const actual = await repo.buscarIndirecto(tx, ofertaId, id);
    if (!actual) throw new NoExiste();
    const fila = await repo.actualizarIndirecto(tx, id, d.version, d.porcentaje, usuarioId);
    if (!fila) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, [
      {
        usuarioId,
        entidad: 'indirecto',
        entidadId: id,
        campo: 'porcentaje',
        antes: { valor: actual.porcentaje, nombre: actual.nombre },
        despues: { valor: fila.porcentaje, nombre: actual.nombre },
      },
    ]);
    return fila;
  });
}

export async function cambiarRubro(db: Bd, usuarioId: string, id: string, d: RubroCambio) {
  return db.transaction(async (tx) => {
    const actual = await repo.buscarRubro(tx, id);
    if (!actual) throw new NoExiste();
    const { version, ...campos } = d;
    const nuevos: Record<string, string | null> = {};
    const bitacora = [];
    for (const campo of ['cantidad', 'codigo', 'cpc', 'origen', 'vae'] as const) {
      const valor = campos[campo];
      if (valor === undefined) continue;
      const antes = actual[campo];
      const igual =
        campo === 'cantidad' || campo === 'vae' ? Number(antes) === Number(valor) : antes === valor;
      if (igual && (antes !== null) === (valor !== null)) continue;
      nuevos[campo] = valor;
      bitacora.push({
        usuarioId,
        entidad: 'rubro',
        entidadId: id,
        campo,
        antes: { valor: antes },
        despues: { valor },
      });
    }
    const fila = await repo.actualizarRubro(tx, id, version, nuevos, usuarioId);
    if (!fila) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, bitacora);
    return fila;
  });
}

export async function agregarRubro(db: Bd, usuarioId: string, ofertaId: string, d: RubroCrear) {
  return db.transaction(async (tx) => {
    const cap = await repo.buscarCapitulo(tx, d.capituloId);
    if (!cap || cap.ofertaId !== ofertaId) throw new NoExiste();
    const a = (await repo.apusConLineas(tx, [d.apuId]))[0];
    if (!a) throw new NoExiste();
    const r = await repo.insertarRubro(tx, {
      ofertaId,
      capituloId: d.capituloId,
      apuId: d.apuId,
      codigo: a.apu.codigo,
      cantidad: d.cantidad ?? '1',
      orden: await repo.siguienteOrdenRubro(tx, d.capituloId),
      actualizadoPor: usuarioId,
    });
    await repo.registrarBitacora(tx, [
      { usuarioId, entidad: 'rubro', entidadId: r.id, campo: null, antes: null, despues: r },
    ]);
    return { rubro: r, apu: a };
  });
}

export async function quitarRubro(db: Bd, usuarioId: string, id: string, version: number) {
  return db.transaction(async (tx) => {
    if (!(await repo.buscarRubro(tx, id))) throw new NoExiste();
    const r = await repo.eliminarRubro(tx, id, version);
    if (!r) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, [
      { usuarioId, entidad: 'rubro', entidadId: id, campo: null, antes: r, despues: null },
    ]);
  });
}

export async function quitarCapitulo(db: Bd, usuarioId: string, id: string, version: number) {
  return db.transaction(async (tx) => {
    if (!(await repo.buscarCapitulo(tx, id))) throw new NoExiste();
    const rubros = await repo.rubrosDeCapitulo(tx, id);
    const c = await repo.eliminarCapitulo(tx, id, version);
    if (!c) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, [
      {
        usuarioId,
        entidad: 'capitulo',
        entidadId: id,
        campo: null,
        antes: { ...c, rubros },
        despues: null,
      },
    ]);
    return c.ofertaId;
  });
}

export async function agregarCapitulo(
  db: Bd,
  usuarioId: string,
  ofertaId: string,
  d: CapituloCrear,
) {
  return db.transaction(async (tx) => {
    if (!(await repo.buscar(tx, ofertaId))) throw new NoExiste();
    const c = await repo.insertarCapitulo(tx, {
      ofertaId,
      nombre: d.nombre,
      disciplina: d.disciplina ?? null,
      orden: await repo.siguienteOrdenCapitulo(tx, ofertaId),
      actualizadoPor: usuarioId,
    });
    await repo.registrarBitacora(tx, [
      { usuarioId, entidad: 'capitulo', entidadId: c.id, campo: null, antes: null, despues: c },
    ]);
    return c;
  });
}

// «Solo en esta oferta»: el rubro pasa a una copia del APU y las demás ofertas siguen con el original.
export async function copiarApuDeRubro(db: Bd, usuarioId: string, id: string, version: number) {
  return db.transaction(async (tx) => {
    const actual = await repo.buscarRubro(tx, id);
    if (!actual) throw new NoExiste();
    const original = (await repo.apusConLineas(tx, [actual.apuId]))[0]?.apu;
    if (!original) throw new NoExiste();
    const copia = await repo.duplicarApu(tx, original, usuarioId);
    const fila = await repo.actualizarRubro(tx, id, version, { apuId: copia.id }, usuarioId);
    if (!fila) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, [
      { usuarioId, entidad: 'apu', entidadId: copia.id, campo: null, antes: null, despues: copia },
      {
        usuarioId,
        entidad: 'rubro',
        entidadId: id,
        campo: 'apuId',
        antes: { valor: original.id },
        despues: { valor: copia.id },
      },
    ]);
    return { rubro: fila, apu: (await repo.apusConLineas(tx, [copia.id]))[0]! };
  });
}
