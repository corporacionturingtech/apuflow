import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

// El panel cuenta lo hecho en el mes: se usa la demo (bloques) y se emite una oferta.
test('el panel de valor muestra cifras tras usar la demo y las horas siguen a los minutos', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();
  await page.request.post('/api/demo/cargar');

  const o = await (
    await page.request.post('/api/ofertas', { data: { nombre: `OFE-VAL ${Date.now()}` } })
  ).json();
  const bloques = (await (await page.request.get('/api/bloques')).json()).items;
  const cap = await (
    await page.request.post(`/api/ofertas/${o.id}/bloques`, { data: { bloqueId: bloques[0].id } })
  ).json();
  await page.request.post(`/api/ofertas/${o.id}/versiones`, {
    data: { nombre: 'Emisión de prueba', emitir: true },
  });
  // Los rubros del bloque no quedan en la oferta: no impiden a otras semillas borrar APUs.
  const c = await (await page.request.get(`/api/ofertas/${o.id}`)).json();
  for (const k of c.capitulos)
    await page.request.delete(`/api/capitulos/${k.id}?version=${k.version}`);
  expect(cap).toBeTruthy();

  await page.goto('/');
  const panel = page.getByLabel('Panel de valor');
  await expect(panel).toBeVisible();
  const cifra = (nombre: string) => panel.locator(`[data-cifra="${nombre}"]`);
  await expect(cifra('Ofertas creadas')).not.toHaveText('0');
  await expect(cifra('Ofertas emitidas')).not.toHaveText('0');
  await expect(cifra('Bloques reutilizados')).not.toHaveText('0');
  await expect(cifra('Horas ahorradas (estimado)')).not.toHaveText(/^0 h$/);

  await panel.getByLabel('Minutos por rubro copiado a mano').fill('0');
  await panel.getByLabel('Minutos por rubro recalculado').fill('0');
  await panel.getByRole('button', { name: 'Aplicar minutos' }).click();
  await expect(cifra('Horas ahorradas (estimado)')).toHaveText('0 h');
  await expect(panel.getByText('× 0 min').first()).toBeVisible();

  await panel.getByRole('link', { name: 'Resumen para imprimir' }).click();
  await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible();
  await expect(page.getByText('Horas ahorradas (estimado)')).toBeVisible();

  // Se restauran los minutos de la empresa
  await page.goto('/');
  await page.getByLabel('Minutos por rubro copiado a mano').fill('3');
  await page.getByLabel('Minutos por rubro recalculado').fill('2');
  await page.getByRole('button', { name: 'Aplicar minutos' }).click();
  await expect(page.getByText('× 3 min').first()).toBeVisible();
});
