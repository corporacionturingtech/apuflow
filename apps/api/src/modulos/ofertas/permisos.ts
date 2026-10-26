import type { UsuarioSesion } from 'tipos';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';
import { disciplinasDeEmpresa } from '../usuarios/servicio';

export class SinPermisoDisciplina extends Error {
  constructor(readonly disciplina: string) {
    super(disciplina);
  }
}

// Solo restringe al cotizador y solo si la empresa lo activó; capítulos sin disciplina quedan libres.
async function exigir(db: Bd, u: UsuarioSesion, disciplina: string | null | undefined) {
  if (u.rol !== 'cotizador' || !disciplina || u.disciplinas.includes(disciplina)) return;
  if ((await disciplinasDeEmpresa(db)).restringir) throw new SinPermisoDisciplina(disciplina);
}

export async function exigirDisciplinaRubro(db: Bd, u: UsuarioSesion, rubroId: string) {
  if (u.rol !== 'cotizador') return;
  const disciplina = await db.transaction(async (tx) => {
    const r = await repo.buscarRubro(tx, rubroId);
    return r && (await repo.buscarCapitulo(tx, r.capituloId))?.disciplina;
  });
  await exigir(db, u, disciplina);
}

export async function exigirDisciplinaCapitulo(db: Bd, u: UsuarioSesion, capituloId: string) {
  if (u.rol !== 'cotizador') return;
  const disciplina = await db.transaction(
    async (tx) => (await repo.buscarCapitulo(tx, capituloId))?.disciplina,
  );
  await exigir(db, u, disciplina);
}

export const exigirDisciplinaNueva = exigir;
