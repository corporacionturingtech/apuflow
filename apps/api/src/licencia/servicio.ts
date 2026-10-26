import { randomBytes } from 'node:crypto';
import { count, desc, eq } from 'drizzle-orm';
import type { LicenciaContenido, LicenciaEstado } from 'tipos';
import type { Bd } from '../db/conexion';
import { licencia, usuario } from '../db/esquema';
import {
  actualizarConfiguracion,
  configuracion,
  registrarBitacora,
  type Tx,
} from '../modulos/insumos/repo';
import { calcularEstado } from './estado';
import { clavePublica, verificarLicencia } from './verificar';

export class FirmaInvalida extends Error {}
export class OtraInstalacion extends Error {}
export class LimiteUsuarios extends Error {}

// El ID se genera la primera vez que alguien lo pide y queda en los ajustes de la empresa.
export async function idInstalacion(db: Bd | Tx): Promise<string> {
  const c = await configuracion(db);
  const actual = (c.ajustes as { instalacion?: string }).instalacion;
  if (actual) return actual;
  const nuevo = `apf-${randomBytes(8).toString('hex')}`;
  await actualizarConfiguracion(db as Tx, c.id, c.version, {
    ajustes: { ...(c.ajustes as object), instalacion: nuevo },
  });
  // Si otra petición ganó la carrera (0 filas), se relee su valor.
  return ((await configuracion(db)).ajustes as { instalacion?: string }).instalacion ?? nuevo;
}

const activos = async (db: Bd | Tx) =>
  Number((await db.select({ n: count() }).from(usuario).where(eq(usuario.activo, true)))[0]!.n);

const ultima = async (db: Bd | Tx) =>
  (await db.select().from(licencia).orderBy(desc(licencia.cargadaEn)).limit(1))[0];

/** Sin licencia = modo desarrollo (todo permitido), salvo LICENCIA_OBLIGATORIA=1 (instalaciones reales). */
export async function estadoLicencia(db: Bd | Tx, ahora = new Date()): Promise<LicenciaEstado> {
  const [fila, usuariosActivos, instalacion] = await Promise.all([
    ultima(db),
    activos(db),
    idInstalacion(db),
  ]);
  if (!fila) {
    const obligatoria = process.env.LICENCIA_OBLIGATORIA === '1';
    return {
      estado: obligatoria ? 'solo_lectura' : 'sin_licencia',
      diasParaVencer: null,
      diasDeGracia: null,
      cliente: null,
      plan: null,
      vence: null,
      maxUsuarios: null,
      usuariosActivos,
      instalacion,
    };
  }
  const c = fila.contenido as LicenciaContenido;
  return {
    ...calcularEstado(c, ahora),
    cliente: c.cliente,
    plan: c.plan,
    vence: c.vence,
    maxUsuarios: c.maxUsuarios,
    usuariosActivos,
    instalacion,
  };
}

/** Lanza LimiteUsuarios si activar un usuario más superaría el máximo de la licencia. */
export async function exigirCupo(tx: Tx) {
  const fila = await ultima(tx);
  if (!fila) return;
  const max = (fila.contenido as LicenciaContenido).maxUsuarios;
  if ((await activos(tx)) >= max) throw new LimiteUsuarios();
}

export async function cargarLicencia(
  db: Bd,
  adminId: string,
  crudo: unknown,
  pem = clavePublica(),
) {
  const archivo = verificarLicencia(crudo, pem);
  if (!archivo) throw new FirmaInvalida();
  await db.transaction(async (tx) => {
    if (archivo.contenido.instalacion !== (await idInstalacion(tx))) throw new OtraInstalacion();
    const antes = await ultima(tx);
    const [nueva] = await tx
      .insert(licencia)
      .values({
        contenido: archivo.contenido,
        firma: archivo.firma,
        instalacion: archivo.contenido.instalacion,
        cargadaEn: new Date(),
      })
      .returning();
    await registrarBitacora(tx, [
      {
        usuarioId: adminId,
        entidad: 'licencia',
        entidadId: nueva!.id,
        campo: null,
        antes: antes ? { vence: (antes.contenido as LicenciaContenido).vence } : null,
        despues: { cliente: archivo.contenido.cliente, vence: archivo.contenido.vence },
      },
    ]);
  });
  return estadoLicencia(db);
}
