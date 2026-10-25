import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/sedemi-demo.json', import.meta.url), 'utf8'),
) as Record<string, unknown[]>;

// Conteos del prototipo v2 (DATA, líneas 477–631).
describe('fixture sedemi-demo', () => {
  it.each([
    ['materiales', 27],
    ['manoObra', 14],
    ['equipos', 10],
    ['transporte', 3],
    ['indirectos', 5],
    ['apus', 23],
    ['bloques', 4],
  ])('%s tiene %i elementos', (clave, n) => {
    expect(fixture[clave]).toHaveLength(n);
  });
});
