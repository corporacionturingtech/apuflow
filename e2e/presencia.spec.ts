import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-rubros', { stdio: 'inherit' });
});

const OTRO = { usuario: 'presencia-e2e', clave: 'clave-e2e-9012' };

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

test('cada sesión ve quién más está en la oferta y en qué capítulo', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  await entrar(a, ADMIN);
  await a.request.post('/api/usuarios', {
    data: {
      nombreUsuario: OTRO.usuario,
      nombre: 'Ana Presencia',
      clave: OTRO.clave,
      rol: 'cotizador',
    },
  });
  await entrar(b, OTRO);

  await a.getByRole('link', { name: 'Ofertas' }).click();
  await a.getByLabel('Nombre de la oferta').fill(`OFE-RUB-PR ${Date.now()}`);
  await a.getByRole('button', { name: 'Crear oferta' }).click();
  await a.getByLabel('Nombre del capítulo nuevo').fill('Obra civil');
  await a.getByRole('button', { name: 'Añadir capítulo' }).click();
  await a.getByRole('button', { name: 'Añadir rubro' }).click();
  await a.getByLabel('Buscar APU para añadir').fill('RUB-E2E');
  await a.getByRole('button', { name: /Rubro ficticio para añadir/ }).click();
  await expect(
    a.getByRole('row').filter({ hasText: 'Obra civil' }).filter({ hasText: '1 rubros' }),
  ).toBeVisible();

  await b.goto(a.url());
  await expect(b.getByLabel('Nombre del capítulo nuevo')).toBeVisible();
  const lista = b.getByRole('list', { name: 'Quién más está en la oferta' });
  await expect(lista).toContainText('Administrador');

  await b
    .getByRole('row')
    .filter({ hasText: 'Obra civil' })
    .filter({ hasText: '1 rubros' })
    .click();
  const listaA = a.getByRole('list', { name: 'Quién más está en la oferta' });
  await expect(listaA).toContainText('Ana Presencia está en el capítulo «Obra civil»');

  await ctxA.close();
  await ctxB.close();
});
