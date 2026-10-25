import { defineConfig } from '@playwright/test';

export const ADMIN = { usuario: 'admin-e2e', clave: 'clave-e2e-1234' };

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5173', viewport: { width: 1366, height: 768 } },
  webServer: [
    {
      command: 'pnpm --filter api db:migrate && pnpm --filter api db:seed && pnpm --filter api dev',
      url: 'http://localhost:3000/api/salud',
      env: { ADMIN_USUARIO: ADMIN.usuario, ADMIN_CLAVE: ADMIN.clave },
      reuseExistingServer: true,
    },
    { command: 'pnpm --filter web dev', url: 'http://localhost:5173', reuseExistingServer: true },
  ],
});
