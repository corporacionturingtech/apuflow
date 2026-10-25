import { expect, test } from '@playwright/test';
import { exportarLibro, type LibroEntrada } from '../packages/excel/src';
import { ADMIN } from '../playwright.config';

// Libro propio (prefijo IPRE2E) para no depender de las semillas, que corren en paralelo.
function libro(p: string): LibroEntrada {
  return {
    datos: {
      proyecto: `${p} Subestación`,
      cliente: 'Cliente ficticio',
      tipo: 'privado',
      fecha: '2026-10-25',
      empresa: 'Demo',
    },
    factor: '1',
    iva: '15',
    herramientaMenor: '5',
    indirectos: [{ nombre: 'Indirectos', porcentaje: '10' }],
    insumos: [
      {
        id: 'm',
        tipo: 'MA',
        descripcion: `${p} Cable`,
        unidad: 'm',
        pu: '2.5',
        seccion: 'Eléctrico',
      },
      { id: 'o', tipo: 'MO', descripcion: `${p} Peón`, unidad: 'h', pu: '3.5', seccion: null },
    ],
    apus: [
      {
        id: 'a',
        codigo: `${p}-01`,
        descripcion: `${p} Tendido`,
        unidad: 'm',
        disciplina: null,
        rendimiento: '0.5',
        herramientaMenor: '5',
        lineas: [
          { insumoId: 'm', cantidad: '1.05' },
          { insumoId: 'o', cantidad: '2' },
        ],
      },
    ],
    capitulos: [{ id: 'c', nombre: 'Cables' }],
    rubros: [
      {
        capituloId: 'c',
        apuId: 'a',
        codigo: `${p}-01`,
        cantidad: '10',
        cpc: null,
        origen: null,
        vae: null,
      },
    ],
  };
}

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

test('sube una lista de precios, ve qué cambia y su impacto, y confirma', async ({ page }) => {
  const p = `IPRE2E${Date.now()}`;
  const base = libro(p);
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('link', { name: 'Ofertas' })).toBeVisible();

  // Preparación: una oferta que usa el cable a $ 2,50.
  await page.goto('/importar');
  await page.getByLabel('Archivo de Excel').setInputFiles({
    name: 'libro.xlsx',
    mimeType: XLSX,
    buffer: Buffer.from(await exportarLibro(base)),
  });
  await page.getByRole('button', { name: 'Importar como oferta nueva' }).click();
  await expect(page.getByText(`${p} Tendido`)).toBeVisible();

  // Una lista solo con Materiales: el cable sube a $ 3,00 y hay un material que no existe.
  const lista = await exportarLibro({
    ...base,
    apus: [],
    capitulos: [],
    rubros: [],
    insumos: [
      { ...base.insumos[0]!, pu: '3' },
      { ...base.insumos[0]!, id: 'x', descripcion: `${p} Inexistente`, pu: '9' },
    ],
  });
  await page.goto('/importar/precios');
  await page.getByLabel('Archivo de Excel').setInputFiles({
    name: 'precios.xlsx',
    mimeType: XLSX,
    buffer: Buffer.from(lista),
  });
  await expect(page.getByTestId('resumen-precios')).toContainText(
    'Cambian 1 precios. 0 ya están al día; 1 no existen en APUflow y se omiten.',
  );
  await expect(page.getByRole('row', { name: new RegExp(`${p} Cable`) })).toContainText('$ 3,00');
  await expect(page.getByText(/Afectará 1 APUs, 1 rubros, \+\$ /)).toBeVisible();
  await page.getByRole('button', { name: 'Ver qué cambiaría' }).click();
  await expect(page.getByText(`${p} Subestación`, { exact: false }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Actualizar 1 precios' }).click();
  await expect(page.getByRole('status')).toContainText('Se actualizaron 1 precios');
});
