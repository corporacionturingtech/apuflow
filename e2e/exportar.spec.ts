import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

// No necesita semilla: una oferta vacía también se exporta (libro válido con totales en cero).
test('exporta la oferta a Excel y descarga un .xlsx', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  const nombre = `OFE-EXP${Date.now()}`;
  await page.getByLabel('Nombre de la oferta').fill(nombre);
  await page.getByRole('button', { name: 'Crear oferta' }).click();

  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar a Excel' }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toBe(`${nombre}.xlsx`);
  const ruta = await archivo.path();
  const bytes = readFileSync(ruta);
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 2).toString()).toBe('PK');
});
