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
  await page.getByLabel('Oferta destino').selectOption({ label: nombre });
  await tarjeta.getByRole('button', { name: 'Añadir' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Se añadió «Bahía de 230 kV» a ' + nombre + ': 1 rubro, subtotal $ 50,00',
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

test('añadir un bloque «2 veces» duplica sus cantidades', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  const nombre = `OFE-BLQ ${Date.now()} x2`;
  await page.getByLabel('Nombre de la oferta').fill(nombre);
  await page.getByRole('button', { name: 'Crear oferta' }).click();
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible();

  await page.getByRole('link', { name: 'Bloques' }).click();
  const tarjeta = page.getByRole('article', { name: 'Bahía de 230 kV' });
  await page.getByLabel('Oferta destino').selectOption({ label: nombre });
  await tarjeta.getByLabel('Veces que se añade «Bahía de 230 kV»').fill('2');
  // La cifra sigue a la cantidad antes de añadir.
  await expect(tarjeta).toContainText('$ 100,00');
  await tarjeta.getByRole('button', { name: 'Ver rubros de «Bahía de 230 kV»' }).click();
  await expect(tarjeta.getByRole('table')).toContainText('$ 100,00');
  await tarjeta.getByLabel('Veces que se añade «Bahía de 230 kV»').press('Enter');
  const aviso = page.getByRole('status').filter({ hasText: 'Se añadió' });
  await expect(aviso).toContainText(
    'Se añadió «Bahía de 230 kV × 2» a ' + nombre + ': 1 rubro, subtotal $ 100,00',
  );

  await aviso.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Se quitó' })).toContainText(
    'Se quitó «Bahía de 230 kV × 2» de ' + nombre,
  );
});

// Bloque propio (BLQ-E2E papelera): borrar el de la semilla afectaría a otros specs en paralelo.
test('buscar sin tildes, borrar a la papelera y deshacer', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();
  const o = await (
    await page.request.post('/api/ofertas', { data: { nombre: `OFE-BLQ ${Date.now()} papelera` } })
  ).json();
  const semilla = (await (await page.request.get('/api/bloques')).json()).items.find(
    (b: { nombre: string }) => b.nombre === 'Bahía de 230 kV',
  );
  const { capituloId } = await (
    await page.request.post(`/api/ofertas/${o.id}/bloques`, { data: { bloqueId: semilla.id } })
  ).json();
  const nombre = `BLQ-E2E papelera ${Date.now()}`;
  await page.request.post('/api/bloques', { data: { capituloId, nombre } });

  await page.getByRole('link', { name: 'Bloques' }).click();
  await page.getByLabel('Buscar bloque').fill(nombre.replace('BLQ-E2E', 'blq-e2e'));
  const fila = page.getByRole('article', { name: nombre });
  await expect(fila).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);

  await fila.getByRole('button', { name: `Borrar «${nombre}»` }).click();
  const aviso = page.getByRole('status').filter({ hasText: 'papelera' });
  await expect(aviso).toContainText(`«${nombre}» se movió a la papelera.`);
  await expect(fila).toBeHidden();
  await aviso.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText(`«${nombre}» volvió a la lista de bloques.`)).toBeVisible();
  await expect(fila).toBeVisible();
});
