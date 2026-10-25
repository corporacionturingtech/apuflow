import { leerPrecios } from 'excel';
import type { CambioPrecioImportado, RevisionPrecios } from 'tipos';
import type { Bd } from '../../db/conexion';
import { impactoDeCambios } from '../insumos/impacto';
import { editarTx } from '../insumos/servicio';
import * as repo from './repo';

export class SinCambios extends Error {}

const clave = (tipo: string, descripcion: string) =>
  tipo +
  ':' +
  descripcion
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Compara los precios del libro con los de APUflow, por tipo y descripción (sin escribir nada). */
async function comparar(db: Bd, buffer: Uint8Array) {
  const leido = await leerPrecios(buffer);
  const porClave = new Map(
    (await repo.insumosActivos(db)).map((i) => [clave(i.tipo, i.descripcion), i]),
  );
  const cambios: CambioPrecioImportado[] = [];
  const noEncontrados: string[] = [];
  let sinCambio = 0;
  for (const i of leido.insumos) {
    const e = porClave.get(clave(i.tipo, i.descripcion));
    if (!e) noEncontrados.push(i.descripcion);
    else if (Number(e.pu) === Number(i.pu)) sinCambio++;
    else
      cambios.push({
        insumoId: e.id,
        tipo: e.tipo,
        codigo: e.codigo,
        descripcion: e.descripcion,
        puActual: e.pu,
        puNuevo: i.pu,
      });
  }
  return { leido, cambios, noEncontrados, sinCambio };
}

export async function revisarPrecios(
  db: Bd,
  buffer: Uint8Array,
  archivo: string,
): Promise<RevisionPrecios> {
  const { leido, cambios, noEncontrados, sinCambio } = await comparar(db, buffer);
  const impacto = await impactoDeCambios(
    db,
    cambios.map((c) => ({ insumoId: c.insumoId, puAnterior: c.puActual, puNuevo: c.puNuevo })),
  );
  return {
    archivo,
    hojas: leido.hojas,
    cambios,
    sinCambio,
    noEncontrados,
    problemas: leido.problemas,
    impacto,
    puedeConfirmar: !leido.problemas.some((p) => p.bloqueante) && cambios.length > 0,
  };
}

export async function confirmarPrecios(db: Bd, usuarioId: string, buffer: Uint8Array) {
  const { leido, cambios } = await comparar(db, buffer);
  if (leido.problemas.some((p) => p.bloqueante) || !cambios.length) throw new SinCambios();
  // La version se lee dentro de la transacción: si alguien cambió el insumo entre la vista previa
  // y el clic, se aplica el precio del libro sobre lo vigente y el historial lo registra.
  await db.transaction(async (tx) => {
    const vigentes = new Map((await repo.insumosActivos(tx)).map((i) => [i.id, i]));
    for (const c of cambios) {
      const actual = vigentes.get(c.insumoId);
      if (actual)
        await editarTx(tx, usuarioId, c.insumoId, { pu: c.puNuevo, version: actual.version });
    }
  });
  return { actualizados: cambios.length };
}
