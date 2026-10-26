import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-empresa', { stdio: 'inherit' });
});

// Oferta sembrada: un rubro de $ 10,00 sin IVA propio. Con 15 % el total es $ 11,50; con 18 %, $ 11,80.
test('cambiar el IVA de la empresa a 18 % recalcula el total', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();

  const poner = async (iva: string) => {
    await page.getByRole('navigation').getByRole('link', { name: 'Empresa', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Configuración › Empresa' })).toBeVisible();
    await page.getByLabel('IVA (%)').fill(iva);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('status')).toHaveText('Cambios guardados');
    await page.getByRole('link', { name: 'Ofertas' }).click();
    await page.getByRole('link', { name: /EMP-E2E Oferta de IVA/ }).click();
  };

  try {
    await poner('18');
    await expect(page.getByRole('contentinfo')).toContainText('$ 11,80');
    await page.reload();
    await expect(page.getByRole('contentinfo')).toContainText('$ 11,80');
  } finally {
    await poner('15');
    await expect(page.getByRole('contentinfo')).toContainText('$ 11,50');
  }
});
