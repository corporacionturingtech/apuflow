import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-impacto', { stdio: 'inherit' });
});

// Material IMP-E2E-MA ($ 10) en 1 APU y 2 rubros de la oferta OFE-IMP (seed-impacto).
test('cambiar un precio muestra cuántos APUs y rubros afectó, y el desglose por oferta', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Materiales' }).click();
  await page.getByLabel('Buscar material').fill('IMP-E2E-MA');
  const grid = page.getByRole('grid', { name: 'Lista de materiales' });
  await expect(grid.getByRole('row').filter({ hasText: 'IMP-E2E-MA' })).toHaveCount(1);
  await grid.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('F2');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('20,00');
  await page.keyboard.press('Enter');

  const panel = page.getByRole('status').filter({ hasText: 'Cobre ficticio de impacto' });
  await expect(panel).toContainText('pasó de $ 10,00 a $ 20,00');
  await expect(panel).toContainText(/Afectó 1 APUs, 2 rubros, \+\$ [\d.,]+/);
  await expect(panel).toContainText(/Recalculado en \d+ ms/);
  await panel.getByRole('button', { name: 'Ver qué cambió' }).click();
  await expect(panel).toContainText('OFE-IMP: 1 APUs, 2 rubros');
});
