import type { PaginaBitacora } from 'tipos';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';

export async function pagina(db: Bd, f: repo.Filtros): Promise<PaginaBitacora> {
  const filas = await repo.listar(db, f);
  return {
    items: filas.slice(0, f.limite).map((x) => ({ ...x, fecha: x.fecha.toISOString() })),
    hayMas: filas.length > f.limite,
  };
}
