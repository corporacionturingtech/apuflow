import type { Empresa, EmpresaCambio } from 'tipos';
import type { Bd } from '../../db/conexion';
import { ConflictoVersion } from '../insumos/servicio';
import { actualizarConfiguracion, configuracion, registrarBitacora } from '../insumos/repo';

type Fila = Awaited<ReturnType<typeof configuracion>>;
type AjustesEmpresa = Partial<
  Pick<Empresa, 'formatoNumero' | 'acento' | 'logo' | 'tipoOfertaDefecto'>
>;

export function empresaDe(c: Fila): Empresa & { version: number } {
  const a = ((c.ajustes as { empresa?: AjustesEmpresa }).empresa ?? {}) as AjustesEmpresa;
  return {
    version: c.version,
    nombre: c.nombre,
    iva: c.iva,
    moneda: c.moneda,
    formatoNumero: a.formatoNumero ?? 'es',
    acento: a.acento ?? '#2563eb',
    logo: a.logo ?? null,
    tipoOfertaDefecto: a.tipoOfertaDefecto ?? 'privado',
  };
}

export const obtenerEmpresa = async (db: Bd) => empresaDe(await configuracion(db));

export async function cambiarEmpresa(db: Bd, adminId: string, c: EmpresaCambio) {
  await db.transaction(async (tx) => {
    const actual = await configuracion(tx);
    const { version, nombre, iva, moneda, ...resto } = c;
    const fila = await actualizarConfiguracion(tx, actual.id, version, {
      nombre,
      iva,
      moneda,
      ajustes: { ...(actual.ajustes as object), empresa: resto },
      actualizadoPor: adminId,
    });
    if (!fila) throw new ConflictoVersion();
    const antes = empresaDe(actual) as Record<string, unknown>;
    const despues = empresaDe(fila) as Record<string, unknown>;
    const cambios = Object.keys(despues)
      .filter((k) => k !== 'version' && JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
      .map((k) => ({
        usuarioId: adminId,
        entidad: 'config_empresa',
        entidadId: actual.id,
        campo: k,
        // el logo es un data URL enorme: la bitácora solo guarda que cambió
        antes: k === 'logo' ? { logo: antes[k] ? 'definido' : null } : { [k]: antes[k] },
        despues: k === 'logo' ? { logo: despues[k] ? 'definido' : null } : { [k]: despues[k] },
      }));
    if (cambios.length) await registrarBitacora(tx, cambios);
  });
}
