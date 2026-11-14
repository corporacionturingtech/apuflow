/** Sin tildes ni mayúsculas: «excavacion» encuentra «Excavación». */
export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const COLOR: Record<string, string> = {
  civil: 'var(--color-civil)',
  electrico: 'var(--color-electrico)',
  mecanico: 'var(--color-mecanico)',
};

/** Color fijo de la disciplina (ux.md); gris si no es una de las tres. */
export const colorDe = (d: string) => COLOR[normalizar(d)] ?? '#94a3b8';

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
