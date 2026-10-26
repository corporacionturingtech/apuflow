import type { EstadoLicencia, LicenciaContenido } from 'tipos';

export const DIAS_AVISO = 10;
export const DIAS_GRACIA = 15;
const DIA_MS = 86_400_000;

const dia = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const hoyUtc = (ahora: Date) =>
  Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());

/** El día de `vence` todavía es válido; la gracia cuenta desde el día siguiente. */
export function calcularEstado(
  c: LicenciaContenido,
  ahora: Date,
): { estado: EstadoLicencia; diasParaVencer: number; diasDeGracia: number | null } {
  const diasParaVencer = Math.round((dia(c.vence) - hoyUtc(ahora)) / DIA_MS);
  if (diasParaVencer > DIAS_AVISO) return { estado: 'vigente', diasParaVencer, diasDeGracia: null };
  if (diasParaVencer >= 0) return { estado: 'por_vencer', diasParaVencer, diasDeGracia: null };
  const diasDeGracia = DIAS_GRACIA + diasParaVencer;
  if (diasDeGracia >= 0) return { estado: 'gracia', diasParaVencer, diasDeGracia };
  return { estado: 'solo_lectura', diasParaVencer, diasDeGracia: null };
}
