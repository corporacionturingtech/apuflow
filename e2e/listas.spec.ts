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
  await hm.fill('6,5');
  await hm.press('Enter');
  await page.reload();
  await expect(page.getByLabel(/Herramienta menor/)).toHaveValue('6,5');
});
