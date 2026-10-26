import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-volumen', { stdio: 'inherit' });
});

async function entrar(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Materiales' }).click();
}

test('edita un precio con el teclado y persiste', async ({ page }) => {
  await entrar(page);
  const grid = page.getByRole('grid', { name: 'Lista de materiales' });
  await expect(grid).toBeVisible();
  await page.getByLabel('Buscar material').fill('VOL-0005');
  const fila = grid.getByRole('row').filter({ hasText: 'VOL-0005' });
  await expect(fila).toHaveCount(1);
  await grid.focus();
  await page.keyboard.press('ArrowRight'); // Descripción
  await page.keyboard.press('ArrowRight'); // Unidad
  await page.keyboard.press('ArrowRight'); // P.U.
  await page.keyboard.press('F2');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('10,40');
  await page.keyboard.press('Enter');
  await expect(fila).toContainText('$ 10,40');
  await expect(fila.getByRole('gridcell').first()).toHaveClass(/bg-yellow-100/);

  await page.reload();
  await page.getByLabel('Buscar material').fill('VOL-0005');
  const recargada = page.getByRole('grid').getByRole('row').filter({ hasText: 'VOL-0005' });
  await expect(recargada).toContainText('$ 10,40');
  await expect(recargada).toContainText('↑'); // precio referencial: el anterior era menor
});

test('2.000 filas: solo se pinta una ventana y el final es alcanzable', async ({ page }) => {
  await entrar(page);
  const grid = page.getByRole('grid', { name: 'Lista de materiales' });
  // Otros e2e dejan materiales que se ordenan después de VOL-2000: se acota a la semilla.
  await page.getByLabel('Buscar material').fill('VOL-');
  await expect(grid.getByRole('row').filter({ hasText: 'MAT-' })).toHaveCount(0);
  await expect(grid.getByRole('row').nth(5)).toBeVisible();
  const pintadas = await grid.getByRole('row').count();
  expect(pintadas).toBeLessThan(80);
  await grid.focus();
  const t0 = Date.now();
  await page.keyboard.press('Control+End').catch(() => {});
  await grid.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(grid.getByRole('row').filter({ hasText: 'VOL-2000' })).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(2000);
});
