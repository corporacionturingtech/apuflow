import type { BloqueCrear } from 'tipos';
import type { Bd } from '../../db/conexion';
import * as repo from './repo';

export class ConflictoVersion extends Error {}
export class NoExiste extends Error {}

export async function crearDesdeCapitulo(db: Bd, usuarioId: string, d: BloqueCrear) {
  return db.transaction(async (tx) => {
    const cap = await repo.buscarCapitulo(tx, d.capituloId);
    if (!cap) throw new NoExiste();
    const rubros = (await repo.rubrosDeCapitulo(tx, cap.id)).sort((a, b) => a.orden - b.orden);
    const b = await repo.crear(tx, {
      nombre: d.nombre,
      disciplina: cap.disciplina,
      actualizadoPor: usuarioId,
    });
    const lineas = rubros.length
      ? await repo.insertarLineas(
          tx,
          rubros.map((r, i) => ({
            bloqueId: b.id,
            apuId: r.apuId,
            cantidad: r.cantidad,
            orden: i + 1,
          })),
        )
      : [];
    await repo.registrarBitacora(tx, [
      {
        usuarioId,
        entidad: 'bloque',
        entidadId: b.id,
        campo: null,
        antes: null,
        despues: { ...b, lineas: lineas.length },
      },
    ]);
    return { bloque: b, lineas };
  });
}

// Como en el prototipo: el segundo capítulo del mismo bloque se llama «Nombre (2)».
export async function insertarEnOferta(
  db: Bd,
  usuarioId: string,
  ofertaId: string,
  bloqueId: string,
) {
  return db.transaction(async (tx) => {
    if (!(await repo.buscarOferta(tx, ofertaId))) throw new NoExiste();
    const b = await repo.buscar(tx, bloqueId);
    if (!b) throw new NoExiste();
    const lineas = await repo.lineasDe(tx, bloqueId);
    const caps = await repo.capitulos(tx, ofertaId);
    const iguales = caps.filter(
      (c) => c.nombre === b.nombre || c.nombre.startsWith(`${b.nombre} (`),
    );
    const cap = await repo.insertarCapitulo(tx, {
      ofertaId,
      nombre: iguales.length ? `${b.nombre} (${iguales.length + 1})` : b.nombre,
      disciplina: b.disciplina,
      orden: await repo.siguienteOrdenCapitulo(tx, ofertaId),
      actualizadoPor: usuarioId,
    });
    const apus = await repo.apusConLineas(tx, [...new Set(lineas.map((l) => l.apuId))]);
    const codigo = new Map(apus.map((a) => [a.apu.id, a.apu.codigo]));
    const rubros = [];
    for (const l of lineas) {
      rubros.push(
        await repo.insertarRubro(tx, {
          ofertaId,
          capituloId: cap.id,
          apuId: l.apuId,
          codigo: codigo.get(l.apuId)!,
          cantidad: l.cantidad,
          orden: l.orden,
          actualizadoPor: usuarioId,
        }),
      );
    }
    await repo.registrarBitacora(tx, [
      {
        usuarioId,
        entidad: 'capitulo',
        entidadId: cap.id,
        campo: null,
        antes: null,
        despues: { ...cap, bloqueId, rubros: rubros.length },
      },
    ]);
    return cap;
  });
}

export async function borrar(db: Bd, usuarioId: string, id: string, version: number) {
  return db.transaction(async (tx) => {
    const lineas = await repo.lineasDe(tx, id);
    if (!(await repo.buscar(tx, id))) throw new NoExiste();
    const b = await repo.eliminar(tx, id, version);
    if (!b) throw new ConflictoVersion();
    await repo.registrarBitacora(tx, [
      {
        usuarioId,
        entidad: 'bloque',
        entidadId: id,
        campo: null,
        antes: { ...b, lineas },
        despues: null,
      },
    ]);
  });
}
