import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-bloques', { stdio: 'inherit' });
});

// Bloque «Bahía de 230 kV» (seed-bloques): 5 × APU de $ 10 → costo directo y subtotal $ 50,00.
test('añade un bloque a la oferta, ve el aviso con su subtotal y lo guarda de vuelta como bloque', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  const nombre = `OFE-BLQ ${Date.now()}`;
  await page.getByLabel('Nombre de la oferta').fill(nombre);
  await page.getByRole('button', { name: 'Crear oferta' }).click();
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible();

  await page.getByRole('link', { name: 'Bloques' }).click();
  const tarjeta = page.getByRole('article', { name: 'Bahía de 230 kV' });
  await expect(tarjeta).toContainText('$ 50,00');
  await page.getByLabel('Añadir a la oferta').selectOption({ label: nombre });
  await tarjeta.getByRole('button', { name: 'Añadir a la oferta' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Se añadió «Bahía de 230 kV» a ' + nombre + ': 1 rubros, subtotal $ 50,00',
  );

  await page.getByRole('link', { name: 'Ver en el presupuesto' }).click();
  await expect(page.getByRole('contentinfo')).toContainText('Subtotal$ 50,00');
  await page.reload();
  await expect(page.getByRole('contentinfo')).toContainText('Subtotal$ 50,00');

  await page.getByRole('button', { name: 'Guardar como bloque' }).click();
  await page.getByLabel('Nombre del bloque').fill('BLQ-E2E copia');
  await page.getByRole('button', { name: 'Guardar bloque' }).click();
  await expect(page.getByText('guardado con 1 rubros')).toBeVisible();
});
