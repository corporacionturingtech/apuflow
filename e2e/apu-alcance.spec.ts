import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-alcance', { stdio: 'inherit' });
});

// Dos ofertas comparten el APU ALC-E2E. «Solo en esta oferta» crea «ALC-E2E (2)» y deja la otra intacta.
test('editar un APU desde la oferta pregunta el alcance y la copia no toca a la otra oferta', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  await page.getByRole('link', { name: /ALC-E2E Oferta A/ }).click();

  await page.getByRole('gridcell', { name: 'Rubro compartido ficticio' }).dblclick();
  const dialogo = page.getByRole('region', { name: 'Editar APU' });
  await expect(dialogo).toContainText('Lo usan 2 rubros de 2 ofertas');
  await dialogo.getByRole('button', { name: /Solo en esta oferta/ }).click();
  await expect(page.getByText('Análisis de precio unitario · ALC-E2E (2)')).toBeVisible();

  await page.getByRole('link', { name: 'Ofertas' }).click();
  await page.getByRole('link', { name: /ALC-E2E Oferta B/ }).click();
  await page.getByRole('gridcell', { name: 'Rubro compartido ficticio' }).dblclick();
  await expect(page.getByRole('region', { name: 'Editar APU' })).toContainText(
    'Lo usan 1 rubro de 1 oferta',
  );
});
