import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test('sin sesión redirige al login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Ingresar a Turing APU' })).toBeVisible();
});

test('clave incorrecta muestra mensaje en español', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill('incorrecta');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Usuario o clave incorrectos');
});

test('entra y ve el layout; la barra de totales solo con una oferta abierta', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toContainText(
    'Listas de precios',
  );
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
