import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-oferta', { stdio: 'inherit' });
});

// Oferta sembrada: 1.500 rubros de CU 10,00 × cantidad 1 → subtotal $ 15.000,00.
// Subir el primero de 1 a 3 suma $ 20,00.
test('oferta de 1.500 rubros: editar una cantidad actualiza la barra al instante y persiste', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  await page.getByRole('link', { name: /OFE-E2E Subestación de volumen/ }).click();

  const barra = page.getByRole('contentinfo');
  await expect(page.getByText('1500 rubros')).toBeVisible();
  await expect(barra).toContainText('$ 15.000,00');

  // Foco inicial: primera fila de datos, columna Número; la cantidad es la columna 6 (público, índice 7).
  await page.getByRole('grid', { name: 'Presupuesto' }).focus();
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  const t0 = Date.now();
  const guardado = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok());
  await page.getByRole('grid', { name: 'Presupuesto' }).press('Enter');
  await page.getByLabel('Editar celda').fill('3');
  await page.getByLabel('Editar celda').press('Enter');
  await expect(barra).toContainText('$ 15.020,00');
  expect(Date.now() - t0).toBeLessThan(1500);
  await guardado;

  await page.reload();
  await expect(page.getByRole('contentinfo')).toContainText('$ 15.020,00');
});
