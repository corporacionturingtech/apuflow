import { diasEntre, diaEc, fechaEc, horaEc } from './fechas';

export type UsoDelDia = {
  nombre: string;
  /** Ingresos de hoy, en orden. */
  ingresos: Date[];
  /** Último ingreso antes de hoy (null si nunca había entrado). */
  ultimoIngreso: Date | null;
  exportaciones: number;
  precios: number;
  ofertasNuevas: string[];
  bloques: number;
  /** Otros cambios en ofertas, APUs y listas que no entran en las cifras de arriba. */
  otrosCambios: number;
};

/** Días sin entrar desde los que el resumen sugiere escribirle al cliente. */
export const DIAS_ALERTA = 3;

const de = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function lineasActividad(u: UsoDelDia): string[] {
  const l: string[] = [];
  if (u.precios) l.push(`Cambió ${de(u.precios, 'precio', 'precios')}`);
  if (u.ofertasNuevas.length) {
    const nombres = u.ofertasNuevas
      .slice(0, 3)
      .map((n) => `«${n}»`)
      .join(', ');
    const mas = u.ofertasNuevas.length > 3 ? ` y ${u.ofertasNuevas.length - 3} más` : '';
    l.push(`Creó ${de(u.ofertasNuevas.length, 'oferta', 'ofertas')}: ${nombres}${mas}`);
  }
  if (u.bloques) l.push(`Añadió ${de(u.bloques, 'bloque', 'bloques')}`);
  if (u.exportaciones) l.push(`Exportó ${de(u.exportaciones, 'Excel', 'Excel')}`);
  if (u.otrosCambios)
    l.push(`${de(u.otrosCambios, 'cambio más', 'cambios más')} en ofertas, APUs o listas`);
  return l.map((x) => `• ${x}`);
}

function bloqueUsuario(u: UsoDelDia, hoy: Date): string {
  if (u.ingresos.length) {
    const veces = u.ingresos.length > 1 ? `, ${u.ingresos.length} veces` : '';
    const act = lineasActividad(u);
    return [
      `✅ ${u.nombre}: entró (${horaEc(u.ingresos[0]!)}${veces})`,
      ...(act.length ? act : ['• Solo revisó: no hizo cambios']),
    ].join('\n');
  }
  if (!u.ultimoIngreso) {
    return `⚪ ${u.nombre}: todavía no ha entrado nunca.\n⚠️ Conviene escribirle.`;
  }
  const dias = diasEntre(diaEc(u.ultimoIngreso), diaEc(hoy));
  const lineas = [
    `⚪ ${u.nombre}: no entró hoy. Último ingreso: ${fechaEc(u.ultimoIngreso)} (hace ${de(dias, 'día', 'días')}).`,
  ];
  if (dias >= DIAS_ALERTA) lineas.push(`⚠️ Lleva ${dias} días sin entrar: conviene escribirle.`);
  return lineas.join('\n');
}

/** Texto del resumen diario. Función pura para revisarlo en pruebas sin enviar nada. */
export function textoResumen(empresa: string, hoy: Date, usuarios: UsoDelDia[]): string {
  const cabecera = `📊 ${empresa} · ${fechaEc(hoy)} · uso de Turing APU`;
  if (!usuarios.length) return `${cabecera}\n\nNo hay usuarios activos para reportar.`;
  return [cabecera, ...usuarios.map((u) => bloqueUsuario(u, hoy))].join('\n\n');
}
