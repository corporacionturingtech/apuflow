import type { CapituloCrear, OfertaCambio, OfertaCrear, RubroCambio } from 'tipos';
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
    for (const campo of ['nombre', 'cliente', 'tipo'] as const) {
      const valor = campos[campo];
      if (valor === undefined || valor === actual[campo]) continue;
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

export async function cambiarRubro(db: Bd, usuarioId: string, id: string, d: RubroCambio) {
  return db.transaction(async (tx) => {
    const actual = await repo.buscarRubro(tx, id);
    if (!actual) throw new NoExiste();
    const fila = await repo.actualizarRubro(tx, id, d.version, d.cantidad, usuarioId);
    if (!fila) throw new ConflictoVersion();
    if (Number(actual.cantidad) !== Number(d.cantidad)) {
      await repo.registrarBitacora(tx, [
        {
          usuarioId,
          entidad: 'rubro',
          entidadId: id,
          campo: 'cantidad',
          antes: { valor: actual.cantidad },
          despues: { valor: d.cantidad },
        },
      ]);
    }
    return fila;
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
