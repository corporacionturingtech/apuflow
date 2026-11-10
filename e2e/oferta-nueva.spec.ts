import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-bloques', { stdio: 'inherit' });
});

// El primer día de quien cotiza: oferta nueva, su cliente, un bloque desde la oferta e indirectos listos.
test('oferta nueva: cliente, bloque desde la oferta e indirectos copiados', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  const nombre = `OFE-NUEVA ${Date.now()}`;
  await page.getByLabel('Nombre de la oferta').fill(nombre);
  await page.getByRole('button', { name: 'Crear oferta' }).click();
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
  await expect(page.getByText(/Lo más rápido es «Añadir bloque»/)).toBeVisible();

  await page.getByRole('button', { name: 'Poner cliente' }).click();
  await page.getByLabel('Cliente').fill('Familia Torres');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText(/Familia Torres ·/)).toBeVisible();

  await page.getByRole('button', { name: 'Añadir bloque' }).click();
  const panel = page.getByRole('region', { name: 'Añadir bloque' });
  const fila = panel.getByRole('listitem').filter({ hasText: 'Bahía de 230 kV' });
  await fila.getByLabel('Tamaño de «Bahía de 230 kV» en esta oferta').fill('2');
  await fila.getByRole('button', { name: 'Añadir' }).click();
  await expect(panel.getByRole('status')).toHaveText(
    'Se añadió «Bahía de 230 kV × 2». Puede añadir otro o cerrar.',
  );
  await expect(page.getByLabel('Presupuesto', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Indirectos y utilidad' }).click();
  await expect(page.getByLabel('Porcentaje Utilidad')).toBeVisible();
});
