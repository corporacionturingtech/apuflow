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

test('ninguna fila del historial muestra [object Object]', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();

  // Los minutos de ahorro se guardan como objeto: reescribirlos (mismos valores) deja una fila.
  // `empresa` y `valor` escriben la misma fila de configuración: reintentar si choca (409).
  await expect(async () => {
    const v = await (await page.request.get('/api/valor')).json();
    const res = await page.request.put('/api/valor/parametros', {
      data: { version: v.version, ...v.parametros },
    });
    expect(res.status()).toBeLessThan(300);
  }).toPass({ timeout: 10_000 });

  await page.getByRole('link', { name: 'Historial' }).click();
  const historial = page.getByRole('region', { name: 'Historial' });
  await historial.getByLabel('Qué cambió').selectOption('config_empresa');
  await expect(historial).toContainText('cambió los minutos de ahorro de la configuración');
  await expect(historial).toContainText(/por rubro .+ min, por recálculo .+ min →/);
  await historial.getByLabel('Qué cambió').selectOption('');
  await expect(historial.getByRole('listitem').first()).toBeVisible();
  await expect(historial).not.toContainText('[object Object]');
});
