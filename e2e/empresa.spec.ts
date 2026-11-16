import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-empresa', { stdio: 'inherit' });
});

// Oferta sembrada: un rubro de $ 10,00 sin IVA propio. Con 15 % el total es $ 11,50; con 18 %, $ 11,80.
test('cambiar el IVA de la empresa a 18 % recalcula el total', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();

  const poner = async (iva: string) => {
    await page.getByRole('navigation').getByRole('link', { name: 'Empresa', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Configuración › Empresa' })).toBeVisible();
    await page.getByLabel('IVA (%)').fill(iva);
    const guardar = page.getByRole('button', { name: 'Guardar cambios' });
    // si una corrida anterior dejó ese IVA, no hay nada que guardar
    if (await guardar.isEnabled()) {
      await guardar.click();
      await expect(page.getByRole('status')).toHaveText('Cambios guardados');
    }
    await page.getByRole('link', { name: 'Ofertas' }).click();
    await page.getByRole('link', { name: /EMP-E2E Oferta de IVA/ }).click();
  };

  try {
    await poner('18');
    await expect(page.getByRole('contentinfo')).toContainText('$ 11,80');
    await page.reload();
    await expect(page.getByRole('contentinfo')).toContainText('$ 11,80');
  } finally {
    await poner('15');
    await expect(page.getByRole('contentinfo')).toContainText('$ 11,50');
  }
});

test('guardar solo con cambios, error junto al campo y color con su código', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Empresa', exact: true }).click();

  const guardar = page.getByRole('button', { name: 'Guardar cambios' });
  await expect(guardar).toBeDisabled();

  const moneda = page.getByLabel('Moneda (código)');
  const original = await moneda.inputValue();
  await moneda.fill('US');
  await expect(page.getByText('Hay cambios sin guardar')).toBeVisible();
  await guardar.click();
  await expect(moneda).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Use el código de 3 letras (USD, PEN…)')).toBeVisible();
  await expect(moneda).toBeFocused();

  await page.getByRole('button', { name: 'Descartar' }).click();
  await expect(moneda).toHaveValue(original);
  await expect(guardar).toBeDisabled();

  // elegir un color sugerido escribe su código; descartar lo devuelve
  const codigo = page.getByLabel('Código del color');
  const color = await codigo.inputValue();
  const otro = color === '#dc2626' ? 'Naranja' : 'Rojo';
  await page.getByRole('button', { name: otro, exact: true }).click();
  await expect(codigo).toHaveValue(otro === 'Rojo' ? '#dc2626' : '#ea580c');
  await expect(guardar).toBeEnabled();
  await page.getByRole('button', { name: 'Descartar' }).click();
  await expect(codigo).toHaveValue(color);
});
