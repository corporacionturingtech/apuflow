import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-objetivo', { stdio: 'inherit' });
});

// Oferta sembrada: rubros de $ 10, 20 y 70 sin indirectos → subtotal $ 100,00.
test('misión 5: costo objetivo, brecha y rubros que más pesan', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  await page.getByRole('link', { name: /OBJ-E2E Oferta de objetivo/ }).click();

  const barra = page.getByRole('contentinfo');
  await expect(barra).not.toContainText('Brecha');
  await page.getByRole('tab', { name: 'Costo objetivo' }).click();
  const panel = page.getByRole('region', { name: 'Costo objetivo' });
  const campo = page.getByLabel('Costo referencial del cliente (sin IVA)');
  await campo.fill('90,00');
  await campo.press('Enter');
  await expect(barra).toContainText('Faltan $ 10,00');
  await expect(panel.getByRole('status')).toContainText('Faltan $ 10,00 (11,11 %)');

  const filas = page.getByRole('table', { name: 'Rubros que más pesan' }).getByRole('row');
  await expect(filas.nth(1)).toContainText('Rubro ficticio 3');
  await expect(filas.nth(1)).toContainText('70,0 %');

  await campo.fill('150,00');
  await campo.press('Enter');
  await expect(barra).toContainText('Dentro por $ 50,00');
  await expect(panel.getByRole('status')).toContainText('Dentro del objetivo por $ 50,00');

  await page.reload();
  await expect(page.getByRole('contentinfo')).toContainText('Dentro por $ 50,00');

  await page.getByRole('tab', { name: 'Costo objetivo' }).click();
  await page.getByRole('link', { name: 'Abrir APU' }).first().click();
  await expect(page).toHaveURL(/\/apus\//);
});
