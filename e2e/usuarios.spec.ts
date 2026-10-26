import { execSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN } from '../playwright.config';

test.beforeAll(() => {
  execSync('pnpm --filter api db:seed-rubros', { stdio: 'inherit' });
});

async function entrar(page: Page, usuario: string, clave: string) {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(usuario);
  await page.getByLabel('Clave').fill(clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();
}

// El admin crea un cotizador Civil y activa la restricción; ese cotizador no puede tocar un rubro Eléctrico.
test('un cotizador Civil no edita rubros Eléctricos cuando la empresa restringe por disciplina', async ({
  page,
  browser,
}) => {
  const sufijo = Date.now();
  const civil = `civil${sufijo}`;
  await entrar(page, ADMIN.usuario, ADMIN.clave);
  await page.getByRole('link', { name: 'Usuarios' }).click();

  const disciplinas = page.getByRole('region', { name: 'Disciplinas' });
  for (const d of ['Civil', 'Eléctrico']) {
    if (await disciplinas.getByText(d, { exact: true }).count()) continue;
    await disciplinas.getByLabel('Nueva disciplina').fill(d);
    await disciplinas.getByRole('button', { name: 'Agregar disciplina' }).click();
  }
  await disciplinas.getByLabel('Restringir a cada cotizador').check();
  await disciplinas.getByRole('button', { name: 'Guardar disciplinas' }).click();
  await expect(disciplinas.getByRole('status')).toHaveText('Guardado');

  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  const form = page.getByRole('form', { name: 'Nuevo usuario' });
  await form.getByLabel('Nombre de usuario').fill(civil);
  await form.getByLabel('Nombre completo').fill('Carla Civil');
  await form.getByLabel('Clave').fill('clave-civil-1');
  await form.getByLabel('Rol').selectOption('cotizador');
  await form.getByRole('checkbox', { name: 'Civil' }).check();
  await form.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('row', { name: new RegExp(civil) })).toContainText('Civil');

  // Oferta con un capítulo Eléctrico y un rubro, armada por API con la sesión del admin.
  const o = await (
    await page.request.post('/api/ofertas', {
      data: { nombre: `OFE-USU ${sufijo}`, tipo: 'publico' },
    })
  ).json();
  await page.request.post(`/api/ofertas/${o.id}/capitulos`, {
    data: { nombre: 'Montaje', disciplina: 'Eléctrico' },
  });
  const detalle = await (await page.request.get(`/api/ofertas/${o.id}`)).json();
  const apus = await (await page.request.get('/api/apus?q=RUB-E2E')).json();
  const nuevo = await page.request.post(`/api/ofertas/${o.id}/rubros`, {
    data: { capituloId: detalle.capitulos[0].id, apuId: apus.items[0].id },
  });
  const rubro = (await nuevo.json()).rubro;

  const ctx = await browser.newContext();
  const paginaCivil = await ctx.newPage();
  await entrar(paginaCivil, civil, 'clave-civil-1');
  const r = await paginaCivil.request.patch(`/api/rubros/${rubro.id}`, {
    data: { version: rubro.version, cantidad: '5' },
  });
  expect(r.status()).toBe(403);
  expect((await r.json()).mensaje).toBe('No tiene permiso para editar rubros de Eléctrico');
  await ctx.close();

  // Quita el rubro para que seed-rubros pueda recrear el APU en la próxima corrida.
  await page.request.delete(`/api/rubros/${rubro.id}?version=${rubro.version}`);

  // Deja la empresa sin restricción para no afectar a otros specs.
  const emp = await (await page.request.get('/api/empresa/disciplinas')).json();
  await page.request.put('/api/empresa/disciplinas', {
    data: { version: emp.version, disciplinas: emp.disciplinas, restringir: false },
  });
});
