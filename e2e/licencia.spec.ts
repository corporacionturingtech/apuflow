import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

// Sin licencia cargada la instalación está en modo desarrollo; la pantalla muestra el ID para pedirla.
test('el administrador ve el estado de la licencia y su ID de instalación', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Licencia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configuración › Licencia' })).toBeVisible();
  await expect(page.getByText('Sin licencia (modo desarrollo)')).toBeVisible();
  await expect(page.getByText(/^apf-[0-9a-f]{16}$/)).toBeVisible();
  await expect(
    page.getByText('Todas las funciones están habilitadas', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar' })).toBeVisible();
  const id = (await page.locator('code').first().textContent()) ?? '';
  await expect(page.getByRole('link', { name: 'Enviar por correo' })).toHaveAttribute(
    'href',
    new RegExp(id),
  );
  await expect(page.getByRole('button', { name: 'Seleccionar archivo' })).toBeVisible();

  await page.getByLabel('Cargar archivo de licencia').setInputFiles({
    name: 'licencia.json',
    mimeType: 'application/json',
    buffer: Buffer.from('esto no es json'),
  });
  await expect(page.getByRole('alert')).toContainText('no es una licencia válida');
});
