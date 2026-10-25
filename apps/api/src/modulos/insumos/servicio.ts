import type { InsumoCambio, InsumoCrear } from 'tipos';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';

export class ConflictoVersion extends Error {}
export class NoExiste extends Error {}

const CAMPOS = ['codigo', 'descripcion', 'unidad', 'pu', 'seccion'] as const;

export async function crear(db: Bd, usuarioId: string, d: InsumoCrear) {
  return db.transaction(async (tx) => {
    const fila = await repo.insertar(tx, {
      ...d,
      seccion: d.seccion ?? null,
      actualizadoPor: usuarioId,
    });
    await repo.registrarBitacora(tx, [
      { usuarioId, entidad: 'insumo', entidadId: fila.id, campo: null, antes: null, despues: fila },
    ]);
    return fila;
  });
}

export async function editar(db: Bd, usuarioId: string, id: string, cambio: InsumoCambio) {
  return db.transaction(async (tx) => {
    const actual = await repo.buscar(tx, id);
    if (!actual) throw new NoExiste();
    const { version, ...campos } = cambio;
    const nuevos: Record<string, unknown> = {};
    const bitacora = [];
    for (const campo of CAMPOS) {
      const valor = campos[campo];
      if (valor === undefined) continue;
      const antes = actual[campo];
      // Compara numéricamente el PU: "10.4" y "10.400000" son el mismo precio.
      const igual = campo === 'pu' ? Number(antes) === Number(valor) : antes === valor;
      if (igual) continue;
      nuevos[campo] = valor;
      bitacora.push({
        usuarioId,
        entidad: 'insumo',
        entidadId: id,
        campo,
        // Objeto, no escalar: el driver manda los textos crudos y Postgres los leería como JSON.
        antes: { valor: antes },
        despues: { valor },
      });
    }
    if ('pu' in nuevos) nuevos.precioAnterior = actual.pu;
    const fila = await repo.actualizar(tx, id, version, { ...nuevos, actualizadoPor: usuarioId });
    if (!fila) throw new ConflictoVersion();
    if ('pu' in nuevos) {
      await repo.registrarPrecio(tx, {
        insumoId: id,
        puAnterior: actual.pu,
        puNuevo: fila.pu,
        usuarioId,
      });
    }
    await repo.registrarBitacora(tx, bitacora);
    return fila;
  });
}
