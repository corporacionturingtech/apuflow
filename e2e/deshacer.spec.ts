import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-deshacer', { stdio: 'inherit' });
});

// Material DES-E2E-MA ($ 10) en 2 rubros de la oferta OFE-DES (seed-impacto con prefijo DES).
test('deshacer devuelve el precio exacto (botón y Ctrl+Z) y el historial lista los cambios', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Materiales' }).click();
  await page.getByLabel('Buscar material').fill('DES-E2E-MA');
  const grid = page.getByRole('grid', { name: 'Lista de materiales' });
  const fila = grid.getByRole('row').filter({ hasText: 'DES-E2E-MA' });
  await expect(fila).toHaveCount(1);
  await grid.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');

  const cambiar = async (valor: string) => {
    await page.keyboard.press('F2');
    await page.keyboard.press('Control+A');
    await page.keyboard.type(valor);
    await page.keyboard.press('Enter');
  };
  const panel = page.getByRole('status').filter({ hasText: 'Cobre ficticio de impacto' });

  await cambiar('20,00');
  await expect(panel).toContainText('pasó de $ 10,00 a $ 20,00');
  await panel.getByRole('button', { name: 'Deshacer' }).click();
  await expect(panel).toContainText('pasó de $ 20,00 a $ 10,00');
  await expect(fila).toContainText('$ 10,00');

  await grid.focus();
  await cambiar('30,00');
  await expect(panel).toContainText('pasó de $ 10,00 a $ 30,00');
  await grid.focus();
  await page.keyboard.press('Control+z');
  await expect(panel).toContainText('pasó de $ 30,00 a $ 10,00');
  await expect(fila).toContainText('$ 10,00');

  await grid.focus();
  await page.keyboard.press('Alt+h');
  const historial = page.getByRole('region', { name: 'Historial de precios' });
  await expect(historial).toContainText('Cobre ficticio de impacto');
  await expect(historial.getByRole('listitem')).toHaveCount(4);
});
