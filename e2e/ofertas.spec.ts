import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test('ofertas en tabla: buscador, total y estado', async ({ page }) => {
  const nombre = `OFE-LIS-${Date.now()}`;
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();

  const res = await page.request.post('/api/ofertas', { data: { nombre } });
  expect(res.status()).toBe(201);

  await page.getByRole('link', { name: 'Ofertas', exact: true }).click();
  await page.getByLabel('Buscar ofertas').fill(nombre.toLowerCase());
  const tabla = page.getByRole('table', { name: 'Ofertas' });
  const fila = tabla.getByRole('row').filter({ hasText: nombre });
  await expect(fila).toHaveCount(1);
  await expect(fila).toContainText('Borrador');
  await expect(fila).toContainText('$ 0,00');
  await expect(page.getByText(/^1 de \d+ ofertas$/)).toBeVisible();

  await page.getByLabel('Buscar ofertas').fill(`${nombre}-no-existe`);
  await expect(page.getByText(`Ninguna oferta coincide con «${nombre}-no-existe»`)).toBeVisible();

  await page.getByLabel('Buscar ofertas').fill(nombre);
  await tabla.getByRole('link', { name: nombre }).click();
  await expect(page).toHaveURL(/\/ofertas\/[0-9a-f-]+$/);
});
