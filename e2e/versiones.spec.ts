import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-version', { stdio: 'inherit' });
});

// Oferta sembrada: rubros de $ 10, 20 y 70 sin indirectos → subtotal $ 100,00.
test('versiones: guardar, ajustar una cantidad y comparar por rubro y total', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  await page.getByRole('link', { name: /VER-E2E Oferta de versiones/ }).click();

  await page.getByRole('button', { name: 'Versiones' }).click();
  const panel = page.getByRole('region', { name: 'Versiones' });
  await panel.getByLabel('Nombre de la versión').fill('Antes de negociar');
  await panel.getByRole('button', { name: 'Guardar versión' }).click();
  await expect(panel.getByRole('status')).toContainText('Versión V1 «Antes de negociar» guardada');

  // Cantidad del primer rubro: 1 → 3 (el rubro de $ 10 pasa a $ 30).
  await page.getByRole('grid', { name: 'Presupuesto' }).focus();
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  const guardado = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok());
  await page.getByRole('grid', { name: 'Presupuesto' }).press('Enter');
  await page.getByLabel('Editar celda').fill('3');
  await page.getByLabel('Editar celda').press('Enter');
  await guardado;

  await panel.getByRole('button', { name: /V1 · Antes de negociar/ }).click();
  const tabla = panel.getByRole('table', { name: /Comparación V1/ });
  const cambiado = tabla.locator('tr[data-estado="cambio"]');
  await expect(cambiado).toHaveCount(1);
  await expect(cambiado).toContainText('Rubro ficticio 1');
  await expect(cambiado).toContainText('$ 10,00');
  await expect(cambiado).toContainText('$ 30,00');
  await expect(cambiado).toContainText('+$ 20,00');
  await expect(tabla.locator('tr[data-estado="igual"]')).toHaveCount(2);
  await expect(tabla.getByRole('row', { name: /^Subtotal/ })).toContainText('$ 100,00');
  await expect(tabla.getByRole('row', { name: /^Subtotal/ })).toContainText('$ 120,00');
});
