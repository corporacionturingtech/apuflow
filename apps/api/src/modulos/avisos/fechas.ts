// Fechas en hora de Ecuador, sin depender de la zona horaria del proceso (el contenedor va en UTC).
// Ecuador continental no tiene horario de verano: siempre UTC-5.
const ZONA = 'America/Guayaquil';

const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA });
const fmtHora = new Intl.DateTimeFormat('es-EC', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const fmtFecha = new Intl.DateTimeFormat('es-EC', {
  timeZone: ZONA,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** «2026-11-09» */
export const diaEc = (f: Date) => fmtDia.format(f);
/** «09:14» */
export const horaEc = (f: Date) => fmtHora.format(f);
/** «lun, 9 nov» */
export const fechaEc = (f: Date) => fmtFecha.format(f).replace(/\./g, '');
/** Hora del día (0-23) en Ecuador. */
export const horaDelDiaEc = (f: Date) => Number(horaEc(f).slice(0, 2));
/** Inicio del día de Ecuador como instante. */
export const inicioDiaEc = (dia: string) => new Date(`${dia}T00:00:00-05:00`);
/** Días de calendario entre dos días «AAAA-MM-DD». */
export const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
