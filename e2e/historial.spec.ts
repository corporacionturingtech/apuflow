import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test('el historial muestra quién creó qué y se acota por tipo de cambio', async ({ page }) => {
  const nombre = `OFE-HIS-${Date.now()}`;
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();

  const res = await page.request.post('/api/ofertas', { data: { nombre } });
  expect(res.status()).toBe(201);

  await page.getByRole('link', { name: 'Historial' }).click();
  const historial = page.getByRole('region', { name: 'Historial' });
  await expect(historial).toContainText(`creó la oferta «${nombre}»`);

  await historial.getByLabel('Qué cambió').selectOption('usuario');
  await expect(historial).not.toContainText(`creó la oferta «${nombre}»`);
  await historial.getByLabel('Qué cambió').selectOption('oferta');
  await expect(historial).toContainText(`creó la oferta «${nombre}»`);
});
