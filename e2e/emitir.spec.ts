import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-version EMI', { stdio: 'inherit' });
});

test('emitir congela la versión y la oferta sigue editable', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  await page.getByRole('link', { name: /EMI-E2E Oferta de versiones/ }).click();

  await page.getByRole('tab', { name: 'Versiones' }).click();
  const panel = page.getByRole('region', { name: 'Versiones' });
  await panel.getByLabel('Nombre de la versión').fill('Entrega al cliente');
  await panel.getByRole('button', { name: 'Emitir oferta' }).click();
  await expect(panel.getByRole('status')).toContainText('Oferta emitida como V1');

  await page.getByRole('tab', { name: 'Rubros' }).click();
  await page.getByRole('grid', { name: 'Presupuesto' }).focus();
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  const guardado = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok());
  await page.getByRole('grid', { name: 'Presupuesto' }).press('Enter');
  await page.getByLabel('Editar celda').fill('3');
  await page.getByLabel('Editar celda').press('Enter');
  await guardado;
  await page.getByRole('tab', { name: 'Versiones' }).click();

  const emitida = panel.getByRole('button', { name: /V1 · Entrega al cliente.*Emitida/ });
  await emitida.click();
  const tabla = panel.getByRole('table', { name: /Comparación V1/ });
  await expect(tabla.getByRole('row', { name: /^Subtotal/ })).toContainText('$ 120,00');
});
