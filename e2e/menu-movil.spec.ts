import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.use({ viewport: { width: 375, height: 812 } });

test('en móvil la navegación es un cajón: se abre, navega y se cierra', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeInViewport();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  await expect(page).toHaveURL(/\/ofertas$/);
  await expect(page.getByRole('link', { name: 'Ofertas' })).not.toBeInViewport();
});
