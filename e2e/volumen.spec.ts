import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-volumen-oferta', { stdio: 'inherit' });
});

// Oferta sembrada: 5.000 rubros de CU 10,00 × cantidad 1 → subtotal $ 50.000,00.
test('oferta de 5.000 rubros: recálculo < 300 ms, scroll fluido y guardado', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  await page.getByRole('link', { name: /OFE-VOL Oferta de 5000 rubros/ }).click();

  const barra = page.getByRole('contentinfo');
  const grid = page.getByRole('grid', { name: 'Presupuesto' });
  await expect(page.getByText('5000 rubros', { exact: false }).last()).toBeVisible();
  await expect(barra).toContainText('$ 50.000,00');

  // Scroll: pasos de rueda con el peor intervalo entre cuadros medido en la página.
  await grid.focus();
  await page.evaluate(() => {
    const w = window as unknown as { __peor: number };
    w.__peor = 0;
    let t = performance.now();
    const paso = (ahora: number) => {
      w.__peor = Math.max(w.__peor, ahora - t);
      t = ahora;
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
  const caja = (await grid.boundingBox())!;
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(16);
  }
  const peor = await page.evaluate(() => (window as unknown as { __peor: number }).__peor);
  const filasDom = await grid.getByRole('row').count();
  console.log(`VOLUMEN scroll: peor cuadro ${peor.toFixed(0)} ms, filas en DOM ${filasDom}`);
  expect(filasDom).toBeLessThan(200);
  expect(peor).toBeLessThan(150);

  // Recálculo: editar la cantidad del primer rubro (1 → 3) y esperar el nuevo total.
  await grid.evaluate((el) => (el.scrollTop = 0));
  await grid.focus();
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  await grid.press('Enter');
  await page.getByLabel('Editar celda').fill('3');
  const guardado = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok());
  const t0 = Date.now();
  await page.getByLabel('Editar celda').press('Enter');
  await expect(barra).toContainText('$ 50.020,00');
  const recalculo = Date.now() - t0;
  const tG = Date.now();
  await guardado;
  console.log(`VOLUMEN recálculo ${recalculo} ms, guardado +${Date.now() - tG} ms`);
  expect(recalculo).toBeLessThan(300);

  await page.reload();
  await expect(page.getByRole('contentinfo')).toContainText('$ 50.020,00');
});
