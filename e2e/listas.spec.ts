import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-volumen', { stdio: 'inherit' });
});

const listas = [
  { enlace: 'Equipos', tabla: 'Lista de equipos', buscar: 'Buscar equipo', codigo: 'LST-EQ-01' },
  {
    enlace: 'Mano de obra',
    tabla: 'Lista de mano de obra',
    buscar: 'Buscar cargo',
    codigo: 'LST-MO-01',
  },
  {
    enlace: 'Transporte',
    tabla: 'Lista de transporte',
    buscar: 'Buscar tarifa',
    codigo: 'LST-TR-01',
  },
];

for (const l of listas) {
  test(`${l.enlace}: edita un P.U. con el teclado y persiste`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Usuario').fill(ADMIN.usuario);
    await page.getByLabel('Clave').fill(ADMIN.clave);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByRole('link', { name: l.enlace }).click();
    const grid = page.getByRole('grid', { name: l.tabla });
    await page.getByLabel(l.buscar).fill(l.codigo);
    const fila = grid.getByRole('row').filter({ hasText: l.codigo });
    await expect(fila).toHaveCount(1);
    await grid.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('F2');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('7,30');
    await page.keyboard.press('Enter');
    await expect(fila).toContainText('$ 7,30');
    await page.reload();
    await page.getByLabel(l.buscar).fill(l.codigo);
    await expect(grid.getByRole('row').filter({ hasText: l.codigo })).toContainText('$ 7,30');
  });
}

test('Equipos: edita la herramienta menor y persiste', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Equipos' }).click();
  const hm = page.getByLabel(/Herramienta menor/);
  // Otro valor que el actual: si no, no hay nada que guardar.
  const nuevo = (await hm.inputValue()) === '6,5' ? '7' : '6,5';
  await hm.fill(nuevo);
  await hm.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/Herramienta menor/)).toHaveValue(nuevo);
});

test('Equipos: busca sin tildes y, sin coincidencias, ofrece ver todos', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Equipos' }).click();
  const grid = page.getByRole('grid', { name: 'Lista de equipos' });
  await page.getByLabel('Buscar equipo').fill('grua ficticia');
  await expect(grid.getByRole('row').filter({ hasText: 'LST-EQ-01' })).toHaveCount(1);
  await expect(page.getByText(/^\d+ de [\d.]+ equipos$/)).toBeVisible();
  await page.getByLabel('Buscar equipo').fill('zzz-no-existe');
  await expect(page.getByText('Sin resultados para «zzz-no-existe»')).toBeVisible();
  await page.getByRole('button', { name: 'Ver todos los equipos' }).click();
  await expect(grid.getByRole('row').filter({ hasText: 'LST-EQ-01' })).toHaveCount(1);
  await expect(page.getByLabel('Buscar equipo')).toHaveValue('');
});

test('Mano de obra: historial y papelera con el mouse desde la fila', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Mano de obra' }).click();
  const grid = page.getByRole('grid', { name: 'Lista de mano de obra' });
  await page.getByLabel('Buscar cargo').fill('LST-MO-01');
  const fila = grid.getByRole('row').filter({ hasText: 'LST-MO-01' });
  await fila.hover();
  await fila.getByRole('button', { name: 'Historial del precio' }).click();
  const historial = page.getByRole('region', { name: 'Historial de precios' });
  await expect(historial).toBeVisible();
  await historial.getByRole('button', { name: 'Cerrar historial' }).click();
  await expect(historial).toHaveCount(0);
  await fila.hover();
  await fila.getByRole('button', { name: 'Mandar a la papelera' }).click();
  await expect(fila).toHaveCount(0);
  const aviso = page.getByRole('status').filter({ hasText: 'papelera' });
  await aviso.getByRole('button', { name: 'Deshacer' }).click();
  await expect(fila).toHaveCount(1);
});
