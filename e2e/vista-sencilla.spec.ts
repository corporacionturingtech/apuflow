import { execSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-empresa', { stdio: 'inherit' });
});

const OPCION = {
  Completa: 'Completa (equipo con varias personas)',
  Sencilla: 'Sencilla (para quien presupuesta solo)',
};

async function ponerVista(page: Page, vista: keyof typeof OPCION) {
  await page.getByRole('navigation').getByRole('link', { name: 'Empresa', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configuración › Empresa' })).toBeVisible();
  await page.getByLabel('Vista del sistema').selectOption({ label: OPCION[vista] });
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('status')).toHaveText('Cambios guardados');
}

test('la vista sencilla esconde historial, costo objetivo y versiones, y deja exportar', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const nav = page.getByRole('navigation');
  await expect(nav.getByRole('link', { name: 'Historial' })).toBeVisible();

  try {
    await ponerVista(page, 'Sencilla');
    await expect(nav.getByRole('link', { name: 'Historial' })).toHaveCount(0);
    await nav.getByRole('link', { name: 'Ofertas' }).click();
    await page.getByRole('link', { name: /EMP-E2E Oferta de IVA/ }).click();
    await expect(page.getByRole('tab', { name: 'Indirectos y utilidad' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Costo objetivo' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Versiones' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Exportar a Excel' })).toBeVisible();
  } finally {
    await ponerVista(page, 'Completa');
    await expect(nav.getByRole('link', { name: 'Historial' })).toBeVisible();
  }
});
