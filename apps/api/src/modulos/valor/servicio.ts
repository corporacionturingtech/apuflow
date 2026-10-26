import { D, calcularDetalle } from 'motor';
import type { PanelValor, ParametrosValor, ParametrosValorCambio } from 'tipos';
import type { Bd } from '../../db/conexion';
import { ConflictoVersion } from '../insumos/servicio';
import { actualizarConfiguracion, configuracion, registrarBitacora } from '../insumos/repo';
import { detalleOferta } from '../ofertas/rutas';
import * as repo from './repo';

const PARAMETROS: ParametrosValor = { minutosPorRubro: 3, minutosPorRecalculo: 2 };

const parametrosDe = (ajustes: unknown): ParametrosValor => ({
  ...PARAMETROS,
  ...((ajustes as { valor?: Partial<ParametrosValor> }).valor ?? {}),
});

export const mesActual = () => new Date().toISOString().slice(0, 7);

const rangoDe = (mes: string) => {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  return { desde: new Date(a, m - 1, 1), hasta: new Date(a, m, 1) };
};

export async function panelDeValor(db: Bd, mes = mesActual()): Promise<PanelValor> {
  const r = rangoDe(mes);
  const cfg = await configuracion(db);
  const parametros = parametrosDe(cfg.ajustes);
  const [creadas, emitidas, recalculados, bloques, conObjetivo] = await Promise.all([
    repo.ofertasCreadas(db, r),
    repo.emitidas(db, r),
    repo.rubrosRecalculados(db, r),
    repo.aplicacionesDeBloque(db, r),
    repo.idsConObjetivo(db, r),
  ]);
  const rubrosPorBloque = bloques.reduce(
    (n, b) => n + Number((b.despues as { rubros?: number }).rubros ?? 0),
    0,
  );
  let enObjetivo = 0;
  for (const id of conObjetivo) {
    const det = await detalleOferta(db, id);
    if (!det?.costoObjetivo) continue;
    if (calcularDetalle(det).totales.subtotal.lte(det.costoObjetivo)) enObjetivo++;
  }
  const minutos =
    rubrosPorBloque * parametros.minutosPorRubro + recalculados * parametros.minutosPorRecalculo;
  return {
    mes,
    empresa: cfg.nombre,
    ofertasCreadas: creadas,
    ofertasEmitidas: emitidas.length,
    montoCotizado: emitidas.reduce((s, e) => s.plus(e.total), D(0)).toFixed(2),
    rubrosRecalculados: recalculados,
    bloquesAplicados: bloques.length,
    rubrosPorBloque,
    ofertasEnObjetivo: enObjetivo,
    ofertasConObjetivo: conObjetivo.length,
    horasAhorradas: Math.round((minutos / 60) * 10) / 10,
    parametros,
    version: cfg.version,
  };
}

export async function cambiarParametros(db: Bd, adminId: string, c: ParametrosValorCambio) {
  await db.transaction(async (tx) => {
    const actual = await configuracion(tx);
    const valor = {
      minutosPorRubro: c.minutosPorRubro,
      minutosPorRecalculo: c.minutosPorRecalculo,
    };
    const fila = await actualizarConfiguracion(tx, actual.id, c.version, {
      ajustes: { ...(actual.ajustes as object), valor },
      actualizadoPor: adminId,
    });
    if (!fila) throw new ConflictoVersion();
    await registrarBitacora(tx, [
      {
        usuarioId: adminId,
        entidad: 'config_empresa',
        entidadId: actual.id,
        campo: 'parametrosValor',
        antes: { valor: parametrosDe(actual.ajustes) },
        despues: { valor },
      },
    ]);
  });
}
