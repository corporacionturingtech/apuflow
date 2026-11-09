import { defineConfig } from '@playwright/test';

export const ADMIN = { usuario: 'admin-e2e', clave: 'clave-e2e-1234' };

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5173', viewport: { width: 1366, height: 768 } },
  // La vista sencilla es configuración global de la empresa: se prueba sola, al final.
  projects: [
    { name: 'principal', testIgnore: /vista-sencilla\.spec\.ts/ },
    { name: 'al-final', testMatch: /vista-sencilla\.spec\.ts/, dependencies: ['principal'] },
  ],
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
