import type { ApuCambio, LineaCambio, LineaCrear } from 'tipos';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';

export class ConflictoVersion extends Error {}
export class NoExiste extends Error {}
export class InsumoRepetido extends Error {}

// Cada cambio de línea sube la versión del APU: así dos personas no pisan la misma receta.
async function subirVersion(tx: repo.Tx, id: string, version: number, usuarioId: string) {
  const fila = await repo.actualizar(tx, id, version, { actualizadoPor: usuarioId });
  if (!fila) throw new ConflictoVersion();
  return fila;
}

export async function editar(db: Bd, usuarioId: string, id: string, cambio: ApuCambio) {
  return db.transaction(async (tx) => {
    const actual = await repo.buscar(tx, id);
    if (!actual) throw new NoExiste();
    const { version, ...campos } = cambio;
    const nuevos: Record<string, string> = {};
    const bitacora = [];
    for (const campo of ['rendimiento', 'descripcion', 'unidad'] as const) {
      const valor = campos[campo];
      if (valor === undefined) continue;
      const antes = actual[campo];
      const igual = campo === 'rendimiento' ? Number(antes) === Number(valor) : antes === valor;
      if (igual) continue;
      nuevos[campo] = valor;
      bitacora.push({
        usuarioId,
        entidad: 'apu',
        entidadId: id,
        campo,
        antes: { valor: antes },
        despues: { valor },
      });
    }
    const fila = await repo.actualizar(tx, id, version, { ...nuevos, actualizadoPor: usuarioId });
    if (!fila) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, bitacora);
    return fila;
  });
}

export async function agregarLinea(db: Bd, usuarioId: string, id: string, d: LineaCrear) {
  return db.transaction(async (tx) => {
    if (!(await repo.buscar(tx, id))) throw new NoExiste();
    if (!(await repo.buscarInsumo(tx, d.insumoId))) throw new NoExiste();
    if (await repo.insumoDeLinea(tx, id, d.insumoId)) throw new InsumoRepetido();
    await subirVersion(tx, id, d.version, usuarioId);
    const linea = await repo.insertarLinea(tx, {
      apuId: id,
      insumoId: d.insumoId,
      cantidad: d.cantidad,
      orden: (await repo.ultimoOrden(tx, id)) + 1,
    });
    await repo.registrarBitacora(tx, [
      {
        usuarioId,
        entidad: 'linea_apu',
        entidadId: linea.id,
        campo: null,
        antes: null,
        despues: linea,
      },
    ]);
  });
}

export async function cambiarLinea(
  db: Bd,
  usuarioId: string,
  id: string,
  lineaId: string,
  d: LineaCambio,
) {
  return db.transaction(async (tx) => {
    const linea = await repo.buscarLinea(tx, id, lineaId);
    if (!linea) throw new NoExiste();
    await subirVersion(tx, id, d.version, usuarioId);
    if (Number(linea.cantidad) === Number(d.cantidad)) return;
    await repo.cambiarCantidad(tx, lineaId, d.cantidad);
    await repo.registrarBitacora(tx, [
      {
        usuarioId,
        entidad: 'linea_apu',
        entidadId: lineaId,
        campo: 'cantidad',
        antes: { valor: linea.cantidad },
        despues: { valor: d.cantidad },
      },
    ]);
  });
}

export async function quitarLinea(
  db: Bd,
  usuarioId: string,
  id: string,
  lineaId: string,
  version: number,
) {
  return db.transaction(async (tx) => {
    const linea = await repo.buscarLinea(tx, id, lineaId);
    if (!linea) throw new NoExiste();
    await subirVersion(tx, id, version, usuarioId);
    await repo.borrarLinea(tx, lineaId);
    await repo.registrarBitacora(tx, [
      {
        usuarioId,
        entidad: 'linea_apu',
        entidadId: lineaId,
        campo: null,
        antes: linea,
        despues: null,
      },
    ]);
  });
}
