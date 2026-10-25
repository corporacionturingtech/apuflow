import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { globalSetup: ['./test/migrar-bd-pruebas.ts'] },
});
