import { and, desc, eq, gte, lt, type SQL } from 'drizzle-orm';
import type { Bd } from '../../db/conexion';
import { bitacora, usuario } from '../../db/esquema';

export type Filtros = {
  entidad?: string;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
  saltar: number;
  limite: number;
};

export const listar = (db: Bd, f: Filtros) => {
  const donde: SQL[] = [];
  if (f.entidad) donde.push(eq(bitacora.entidad, f.entidad));
  if (f.usuarioId) donde.push(eq(bitacora.usuarioId, f.usuarioId));
  if (f.desde) donde.push(gte(bitacora.fecha, new Date(`${f.desde}T00:00:00`)));
  if (f.hasta) {
    const fin = new Date(`${f.hasta}T00:00:00`);
    fin.setDate(fin.getDate() + 1);
    donde.push(lt(bitacora.fecha, fin));
  }
  return db
    .select({
      id: bitacora.id,
      fecha: bitacora.fecha,
      usuario: usuario.nombre,
      entidad: bitacora.entidad,
      entidadId: bitacora.entidadId,
      campo: bitacora.campo,
      antes: bitacora.antes,
      despues: bitacora.despues,
    })
    .from(bitacora)
    .leftJoin(usuario, eq(usuario.id, bitacora.usuarioId))
    .where(and(...donde))
    .orderBy(desc(bitacora.fecha), desc(bitacora.id))
    .limit(f.limite + 1)
    .offset(f.saltar);
};
