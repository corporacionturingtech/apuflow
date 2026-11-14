import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-rubros', { stdio: 'inherit' });
});

// APU RUB-E2E (seed-rubros): CU 10,00; oferta nueva sin indirectos → subtotal $ 10,00 por unidad.
test('añade un capítulo y un rubro desde la biblioteca, la barra sube; al quitarlo vuelve a cero', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  const nombre = `OFE-RUB ${Date.now()}`;
  await page.getByLabel('Nombre de la oferta').fill(nombre);
  await page.getByRole('button', { name: 'Crear oferta' }).click();

  // Oferta vacía: guía con acciones; «Añadir rubro» espera a que haya un capítulo.
  await expect(page.getByText('La oferta está vacía')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir rubro' })).toBeDisabled();
  await page.getByRole('button', { name: 'Crear un capítulo' }).click();
  await expect(page.getByLabel('Nombre del capítulo nuevo')).toBeFocused();

  // Sin nombre no es un clic mudo.
  await page.getByRole('button', { name: 'Añadir capítulo' }).click();
  await expect(page.getByText('Escriba el nombre del capítulo.')).toBeVisible();
  await page.getByLabel('Nombre del capítulo nuevo').fill('Bahía de prueba');
  await expect(page.getByText('Escriba el nombre del capítulo.')).toBeHidden();
  await page.getByRole('button', { name: 'Añadir capítulo' }).click();
  await expect(page.getByText('Sus capítulos aún no tienen rubros')).toBeVisible();
  await page.getByRole('button', { name: 'Añadir rubro' }).click();
  await page.getByLabel('Buscar APU para añadir').fill('RUB-E2E');
  await page.getByRole('button', { name: /Rubro ficticio para añadir/ }).click();

  const barra = page.getByRole('contentinfo');
  await expect(barra).toContainText('Subtotal$ 10,00');
  await expect(page.getByText('· 1 rubro', { exact: false })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('contentinfo')).toContainText('Subtotal$ 10,00');

  // Plegar oculta el rubro; la barra no cambia.
  await page.getByRole('button', { name: 'Ocultar rubros' }).click();
  await expect(page.getByText('Rubro ficticio para añadir').first()).toBeHidden();
  await expect(page.getByRole('contentinfo')).toContainText('Subtotal$ 10,00');
  await page.getByRole('button', { name: 'Mostrar rubros' }).click();

  // Supr sobre la fila quita el rubro.
  const borrado = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.ok());
  await page.getByRole('grid', { name: 'Presupuesto' }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Delete');
  await borrado;
  await expect(page.getByRole('contentinfo')).toContainText('Subtotal$ 0,00');
});
