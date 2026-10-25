import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-indirectos', { stdio: 'inherit' });
});

// Oferta sembrada: 2 rubros de CU 10,00 con 10 % de utilidad → subtotal $ 22,00. Con 20 %: $ 24,00.
test('cambiar la utilidad cambia el subtotal y persiste', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  await page.getByRole('link', { name: /IND-E2E Oferta de indirectos/ }).click();

  const barra = page.getByRole('contentinfo');
  await expect(barra).toContainText('$ 22,00');
  await page.getByRole('button', { name: 'Indirectos y utilidad' }).click();
  const guardado = page.waitForResponse(
    (r) => r.request().method() === 'PATCH' && r.url().includes('/indirectos/') && r.ok(),
  );
  await page.getByLabel('Porcentaje Utilidad').fill('20,00');
  await page.getByLabel('Porcentaje Utilidad').press('Enter');
  await expect(barra).toContainText('$ 24,00');
  await expect(page.getByText('Total indirectos y utilidad').locator('..')).toContainText(
    '20,00 %',
  );
  await guardado;

  await page.reload();
  await expect(page.getByRole('contentinfo')).toContainText('$ 24,00');
});
