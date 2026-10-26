import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-rubros', { stdio: 'inherit' });
});

const OTRO = { usuario: 'tiempo-real-e2e', clave: 'clave-e2e-5678' };

async function entrar(
  page: import('@playwright/test').Page,
  u: { usuario: string; clave: string },
) {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(u.usuario);
  await page.getByLabel('Clave').fill(u.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();
}

test('un cambio de una persona aparece en el navegador de otra en menos de 1 s', async ({
  browser,
}) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  await entrar(a, ADMIN);
  // Segundo usuario (si ya existe de una corrida anterior, el 409 es inocuo).
  await a.request.post('/api/usuarios', {
    data: { nombreUsuario: OTRO.usuario, nombre: 'Ana TR', clave: OTRO.clave, rol: 'cotizador' },
  });
  await entrar(b, OTRO);

  await a.getByRole('link', { name: 'Ofertas' }).click();
  await a.getByLabel('Nombre de la oferta').fill(`OFE-TR ${Date.now()}`);
  await a.getByRole('button', { name: 'Crear oferta' }).click();
  await expect(a.getByLabel('Nombre del capítulo nuevo')).toBeVisible();

  await b.goto(a.url());
  await expect(b.getByLabel('Nombre del capítulo nuevo')).toBeVisible();

  await a.getByLabel('Nombre del capítulo nuevo').fill('Capítulo en vivo');
  await a.getByRole('button', { name: 'Añadir capítulo' }).click();
  await a.getByRole('button', { name: 'Añadir rubro' }).click();
  await a.getByLabel('Buscar APU para añadir').fill('RUB-E2E');
  await a.getByRole('button', { name: /Rubro ficticio para añadir/ }).click();
  // APU RUB-E2E: CU 10,00 → subtotal $ 10,00; B lo ve sin recargar.
  await expect(b.getByRole('contentinfo')).toContainText('Subtotal$ 10,00', { timeout: 1000 });

  await ctxA.close();
  await ctxB.close();
});
