import type { HerramientaMenorCambio, InsumoCambio, InsumoCrear } from 'tipos';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';

export class ConflictoVersion extends Error {}
export class NoExiste extends Error {}
export class CodigoRepetido extends Error {}

const CAMPOS = ['codigo', 'descripcion', 'unidad', 'pu', 'seccion'] as const;

export async function crear(db: Bd, usuarioId: string, d: InsumoCrear) {
  return db.transaction(async (tx) => {
    if (await repo.codigoEnUso(tx, d.tipo, d.codigo)) throw new CodigoRepetido();
    const fila = await repo.insertar(tx, {
      ...d,
      orden: (await repo.ultimoOrden(tx, d.tipo)) + 1,
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
    if (cambio.codigo && cambio.codigo !== actual.codigo) {
      if (await repo.codigoEnUso(tx, actual.tipo, cambio.codigo, id)) throw new CodigoRepetido();
    }
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

export async function cambiarHerramientaMenor(
  db: Bd,
  usuarioId: string,
  { version, pct }: HerramientaMenorCambio,
) {
  return db.transaction(async (tx) => {
    const actual = await repo.configuracion(tx);
    const fila = await repo.actualizarConfiguracion(tx, actual.id, version, {
      pctHerramientaMenor: pct,
      actualizadoPor: usuarioId,
    });
    if (!fila) throw new ConflictoVersion();
    if (Number(actual.pctHerramientaMenor) !== Number(pct)) {
      await repo.registrarBitacora(tx, [
        {
          usuarioId,
          entidad: 'config_empresa',
          entidadId: actual.id,
          campo: 'pctHerramientaMenor',
          antes: { valor: actual.pctHerramientaMenor },
          despues: { valor: fila.pctHerramientaMenor },
        },
      ]);
    }
    return fila;
  });
}

// Papelera: borrado lógico con bloqueo optimista y bitácora; restaurar vuelve a comprobar el código.
async function marcarEliminado(
  db: Bd,
  usuarioId: string,
  id: string,
  version: number,
  eliminar: boolean,
) {
  return db.transaction(async (tx) => {
    const actual = await repo.buscar(tx, id);
    if (!actual) throw new NoExiste();
    if (!eliminar && (await repo.codigoEnUso(tx, actual.tipo, actual.codigo, id)))
      throw new CodigoRepetido();
    const eliminadoEn = eliminar ? new Date() : null;
    const fila = await repo.actualizar(tx, id, version, { eliminadoEn, actualizadoPor: usuarioId });
    if (!fila) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, [
      {
        usuarioId,
        entidad: 'insumo',
        entidadId: id,
        campo: 'eliminadoEn',
        antes: { valor: actual.eliminadoEn?.toISOString() ?? null },
        despues: { valor: eliminadoEn?.toISOString() ?? null },
      },
    ]);
    return fila;
  });
}

export const eliminar = (db: Bd, usuarioId: string, id: string, version: number) =>
  marcarEliminado(db, usuarioId, id, version, true);
export const restaurar = (db: Bd, usuarioId: string, id: string, version: number) =>
  marcarEliminado(db, usuarioId, id, version, false);
