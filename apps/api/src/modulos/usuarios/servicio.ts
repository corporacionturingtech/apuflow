import argon2 from 'argon2';
import type {
  Disciplina,
  DisciplinasCambio,
  DisciplinasEmpresa,
  UsuarioCambio,
  UsuarioCrear,
} from 'tipos';
import type { Bd } from '../../db/conexion';
import type { usuario } from '../../db/esquema';
import { LimiteUsuarios, exigirCupo } from '../../licencia/servicio';
import * as repo from './repo';

export { LimiteUsuarios };

export class ConflictoVersion extends Error {}
export class NoExiste extends Error {}
export class NombreEnUso extends Error {}
export class SinPermiso extends Error {}

export const aFila = (u: typeof usuario.$inferSelect) => ({
  id: u.id,
  nombreUsuario: u.nombreUsuario,
  nombre: u.nombre,
  rol: u.rol,
  disciplinas: u.disciplinas,
  activo: u.activo,
  version: u.version,
});

export const listar = async (db: Bd) => (await repo.listar(db)).map(aFila);

export async function crear(db: Bd, adminId: string, d: UsuarioCrear) {
  const { clave, ...resto } = d;
  const claveHash = await argon2.hash(clave);
  return db.transaction(async (tx) => {
    if (await repo.buscarPorNombre(tx, resto.nombreUsuario)) throw new NombreEnUso();
    await exigirCupo(tx);
    const u = await repo.insertar(tx, { ...resto, claveHash, actualizadoPor: adminId });
    await repo.registrarBitacora(tx, [
      {
        usuarioId: adminId,
        entidad: 'usuario',
        entidadId: u.id,
        campo: null,
        antes: null,
        despues: aFila(u),
      },
    ]);
    return aFila(u);
  });
}

export async function cambiar(db: Bd, adminId: string, id: string, d: UsuarioCambio) {
  const { version, clave, ...campos } = d;
  const claveHash = clave ? await argon2.hash(clave) : undefined;
  return db.transaction(async (tx) => {
    const actual = await repo.buscar(tx, id);
    if (!actual) throw new NoExiste();
    if (campos.activo && !actual.activo) await exigirCupo(tx);
    // Un admin no puede quitarse a sí mismo el acceso: la instalación quedaría sin administrador.
    if (id === adminId && (campos.activo === false || (campos.rol && campos.rol !== 'admin'))) {
      throw new SinPermiso();
    }
    const bitacora = [];
    for (const campo of ['nombre', 'rol', 'disciplinas', 'activo'] as const) {
      const valor = campos[campo];
      if (valor === undefined || JSON.stringify(valor) === JSON.stringify(actual[campo])) continue;
      bitacora.push({
        usuarioId: adminId,
        entidad: 'usuario',
        entidadId: id,
        campo,
        antes: { valor: actual[campo] },
        despues: { valor },
      });
    }
    // La clave nunca se guarda en bitácora, ni siquiera su hash.
    if (claveHash) {
      bitacora.push({
        usuarioId: adminId,
        entidad: 'usuario',
        entidadId: id,
        campo: 'clave',
        antes: null,
        despues: null,
      });
    }
    const fila = await repo.actualizar(tx, id, version, {
      ...campos,
      ...(claveHash ? { claveHash } : {}),
      actualizadoPor: adminId,
    });
    if (!fila) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, bitacora);
    return aFila(fila);
  });
}

export const disciplinasDeEmpresa = async (db: Bd): Promise<DisciplinasEmpresa> => {
  const c = await repo.configuracion(db);
  return {
    disciplinas: c.disciplinas as Disciplina[],
    restringir:
      (c.ajustes as { restringirPorDisciplina?: boolean }).restringirPorDisciplina === true,
    version: c.version,
  };
};

export async function cambiarDisciplinas(db: Bd, adminId: string, d: DisciplinasCambio) {
  await db.transaction(async (tx) => {
    const actual = await repo.configuracion(tx);
    const ajustes = {
      ...(actual.ajustes as Record<string, unknown>),
      restringirPorDisciplina: d.restringir,
    };
    const fila = await repo.actualizarConfiguracion(tx, actual.id, d.version, {
      disciplinas: d.disciplinas,
      ajustes,
      actualizadoPor: adminId,
    });
    if (!fila) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, [
      {
        usuarioId: adminId,
        entidad: 'config_empresa',
        entidadId: actual.id,
        campo: 'disciplinas',
        antes: {
          valor: actual.disciplinas,
          restringir: ajustes.restringirPorDisciplina !== d.restringir,
        },
        despues: { valor: d.disciplinas, restringir: d.restringir },
      },
    ]);
  });
  return disciplinasDeEmpresa(db);
}
