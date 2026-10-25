import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-apu', { stdio: 'inherit' });
});

// APU-E2E (semilla de seed-apu): R=2, grúa 45, electricista 4,20, ayudantes 3,10 ×3, flete 120.
// Ayudantes ×3: MO 27,00 + HM 1,35 + EQ 90 + TR 120 → CU 238,35. Con ×4: MO 33,20, HM 1,66 → 244,86.
test('abre un APU, sube ayudantes de 3 a 4 y el CU cambia; persiste', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'APUs' }).click();
  await page.getByLabel('Buscar APU').fill('APU-E2E');
  await page.getByRole('link', { name: /Montaje ficticio de prueba/ }).click();

  const calculo = page.getByLabel('Cálculo del APU');
  const ayudantes = page.getByLabel('Cantidad Ayudante ficticio');
  await expect(calculo).toContainText('$ 238,35');
  await ayudantes.fill('4');
  const guardado = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok());
  await ayudantes.press('Enter');
  await expect(calculo).toContainText('$ 244,86');
  await guardado;

  await page.reload();
  await expect(page.getByLabel('Cálculo del APU')).toContainText('$ 244,86');
  await expect(page.getByLabel('Cantidad Ayudante ficticio')).toHaveValue('4');

  // Dejar la semilla como estaba para repetir la prueba
  await page.getByLabel('Cantidad Ayudante ficticio').fill('3');
  const vuelta = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok());
  await page.getByLabel('Cantidad Ayudante ficticio').press('Enter');
  await vuelta;
  await expect(page.getByLabel('Cálculo del APU')).toContainText('$ 238,35');
});
