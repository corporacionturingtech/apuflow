import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test('agrega, edita, elimina con Supr, restaura y persiste', async ({ page }) => {
  const codigo = `PAP-${Date.now() % 100000}`;
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Transporte' }).click();

  await page.getByRole('button', { name: 'Agregar' }).click();
  const form = page.getByRole('form', { name: 'Agregar' });
  await form.getByLabel('Código').fill(codigo);
  await form.getByLabel('Descripción').fill('Flete de papelera ficticio');
  await form.getByLabel('Unidad').fill('viaje');
  await form.getByLabel('P.U.').fill('15,50');
  await form.getByLabel('P.U.').press('Enter');
  await form.getByRole('button', { name: 'Cerrar' }).click();

  const grid = page.getByRole('grid', { name: 'Lista de transporte' });
  await page.getByLabel('Buscar tarifa').fill(codigo);
  const fila = grid.getByRole('row').filter({ hasText: codigo });
  await expect(fila).toContainText('$ 15,50');

  // Editar el P.U. con el teclado
  await grid.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('F2');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('16,00');
  const guardado = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok());
  await page.keyboard.press('Enter');
  await expect(fila).toContainText('$ 16,00');
  await guardado;

  // Eliminar con Supr y Deshacer
  await page.keyboard.press('Delete');
  await expect(page.getByText('pasó a la papelera')).toBeVisible();
  await expect(fila).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(fila).toHaveCount(1);

  // Eliminar de nuevo, verlo en la papelera y restaurarlo
  await grid.focus();
  await page.keyboard.press('Delete');
  await expect(fila).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver papelera' }).click();
  const papelera = page.getByRole('region', { name: 'Papelera' });
  await expect(papelera).toContainText(codigo);
  await papelera
    .getByRole('listitem')
    .filter({ hasText: codigo })
    .getByRole('button', { name: 'Restaurar' })
    .click();
  await expect(papelera).not.toContainText(codigo);
  await page.reload();
  await page.getByLabel('Buscar tarifa').fill(codigo);
  await expect(page.getByRole('grid').getByRole('row').filter({ hasText: codigo })).toContainText(
    '$ 16,00',
  );
});
