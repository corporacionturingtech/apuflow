import { expect, test } from '@playwright/test';
import { ADMIN } from '../playwright.config';

const INICIAL = 'Bahía de 69 kV';
const DEMO = 'Subestación ilustrativa 69/13,8 kV';
const azar = (min: number, max: number) =>
  (min + Math.random() * (max - min)).toFixed(2).replace('.', ',');

// La empresa demo es una sola para toda la instalación: se carga (idempotente) y se recorre.
test('las 7 misiones se recorren con un único objetivo resaltado por paso', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();
  const { ofertaId } = await (await page.request.post('/api/demo/cargar')).json();

  // La misión 1 añade un capítulo con APUs de otros bloques: se quita al terminar para no dejar
  // rubros que impidan a otras semillas (seed-bloques) borrar sus APUs.
  const limpiar = async () => {
    const o = await (await page.request.get(`/api/ofertas/${ofertaId}`)).json();
    for (const c of o.capitulos.filter((c: { nombre: string }) => c.nombre !== INICIAL))
      await page.request.delete(`/api/capitulos/${c.id}?version=${c.version}`);
  };
  try {
    await recorrer();
  } finally {
    await limpiar();
  }

  async function recorrer() {
    const banner = page.getByRole('region', { name: 'Guía de la misión' });
    const cumplida = page.getByRole('status', { name: 'Misión cumplida' });
    /** Un único elemento resaltado, y es el que toca. */
    async function paso(mision: number, n: number, de: number, objetivo: string) {
      await expect(banner).toContainText(`Misión ${mision} · paso ${n} de ${de}`);
      const marcado = page.locator('.guia-objetivo');
      await expect(marcado).toHaveCount(1);
      await expect(marcado).toHaveAttribute('data-guia', objetivo);
    }
    const marcado = (guia: string) => page.locator(`[data-guia="${guia}"]`);
    async function ir(guia: string) {
      await marcado(guia).click();
    }
    async function empezar(titulo: string) {
      await page.goto('/');
      await page
        .getByRole('listitem')
        .filter({ hasText: titulo })
        .getByRole('button', { name: /Empezar|Repetir/ })
        .click();
    }
    async function aOferta(mision: number, n: number, de: number) {
      await paso(mision, n, de, 'nav-ofertas');
      await ir('nav-ofertas');
      await paso(mision, n, de, `oferta-${ofertaId}`);
      await ir(`oferta-${ofertaId}`);
    }

    // 1 · Bloques
    await empezar('Cotizar rápido con bloques');
    await paso(1, 1, 2, 'nav-bloques');
    await ir('nav-bloques');
    await paso(1, 1, 2, 'bloque-anadir');
    await page.locator('select').selectOption({ label: DEMO });
    await ir('bloque-anadir');
    await aOferta(1, 2, 2);
    await paso(1, 2, 2, 'tabla-presupuesto');
    const grid = page.getByRole('grid', { name: 'Presupuesto' });
    await expect(grid.getByRole('row').nth(3)).toBeVisible();
    await grid.focus();
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    await grid.press('Enter');
    await page.getByLabel('Editar celda').fill(azar(1, 9));
    await page.getByLabel('Editar celda').press('Enter');
    await expect(cumplida).toContainText('Misión 1 cumplida');

    // 2 · Precio
    await cumplida.getByRole('button', { name: /Siguiente/ }).click();
    await paso(2, 1, 2, 'nav-materiales');
    await ir('nav-materiales');
    await paso(2, 1, 2, 'tabla-lista');
    await page.getByLabel('Buscar material').fill('Cable de cobre desnudo 2/0');
    const lista = page.getByRole('grid', { name: 'Lista de materiales' });
    await expect(
      lista.getByRole('row').filter({ hasText: 'Cable de cobre desnudo 2/0' }),
    ).toHaveCount(1);
    await lista.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('F2');
    await page.keyboard.press('Control+A');
    await page.keyboard.type(azar(8, 12));
    await page.keyboard.press('Enter');
    await paso(2, 2, 2, 'ver-cambio');
    await ir('ver-cambio');
    await expect(cumplida).toContainText('Misión 2 cumplida');

    // 3 · APU completo
    await cumplida.getByRole('button', { name: /Siguiente/ }).click();
    await paso(3, 1, 2, 'nav-apus');
    await ir('nav-apus');
    await page.getByLabel('Buscar APU').fill('Excavación a máquina');
    await paso(3, 1, 2, 'apu-primero');
    await ir('apu-primero');
    await paso(3, 2, 2, 'apu-MO');
    const peon = page.getByLabel('Cantidad Peón');
    await peon.fill(azar(2, 5));
    await peon.press('Enter');
    await expect(cumplida).toContainText('Misión 3 cumplida');

    // 4 · Indirectos
    await cumplida.getByRole('button', { name: /Siguiente/ }).click();
    await aOferta(4, 1, 3);
    await paso(4, 1, 3, 'btn-indirectos');
    await ir('btn-indirectos');
    await paso(4, 2, 3, 'panel-indirectos');
    const gg = page.getByLabel('Porcentaje Gastos generales y administrativos');
    await gg.fill(azar(5, 9));
    await gg.press('Enter');
    await paso(4, 3, 3, 'panel-indirectos');
    const util = page.getByLabel('Porcentaje Utilidad');
    await util.fill(azar(5, 9));
    await util.press('Enter');
    await expect(cumplida).toContainText('Misión 4 cumplida');

    // 5 · Costo objetivo y versiones
    await cumplida.getByRole('button', { name: /Siguiente/ }).click();
    await paso(5, 1, 5, 'btn-objetivo');
    await ir('btn-objetivo');
    await paso(5, 2, 5, 'panel-objetivo');
    const campo = page.getByLabel('Costo referencial del cliente (sin IVA)');
    await campo.fill(`${Math.floor(900_000 + Math.random() * 90_000)},00`);
    await campo.press('Enter');
    await paso(5, 3, 5, 'btn-versiones');
    await ir('btn-versiones');
    await paso(5, 4, 5, 'panel-versiones');
    await page.getByLabel('Nombre de la versión').fill('Antes de ajustar');
    await page.getByRole('button', { name: 'Guardar versión', exact: true }).click();
    await paso(5, 5, 5, 'version-comparar');
    await ir('version-comparar');
    await expect(cumplida).toContainText('Misión 5 cumplida');

    // 6 · Historial
    await cumplida.getByRole('button', { name: /Siguiente/ }).click();
    await paso(6, 1, 2, 'nav-historial');
    await ir('nav-historial');
    await paso(6, 2, 2, 'historial-filtros');
    await page.getByLabel('Qué cambió').selectOption({ index: 1 });
    await expect(cumplida).toContainText('Misión 6 cumplida');

    // 7 · Excel
    await cumplida.getByRole('button', { name: /Siguiente/ }).click();
    await aOferta(7, 1, 1);
    await paso(7, 1, 1, 'btn-exportar');
    const descarga = page.waitForEvent('download');
    await ir('btn-exportar');
    expect((await descarga).suggestedFilename()).toMatch(/\.xlsx$/);
    await expect(cumplida).toContainText('Misión 7 cumplida');
    await expect(cumplida.getByRole('button', { name: /Siguiente/ })).toHaveCount(0);

    // De vuelta en Inicio, las siete figuran como cumplidas.
    await page.getByRole('link', { name: 'Inicio' }).click();
    await expect(page.getByText('Cumplida', { exact: true })).toHaveCount(7);
  }
});
