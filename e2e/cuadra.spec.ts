import { expect, test } from '@playwright/test';
import { exportarLibro, type LibroEntrada } from '../packages/excel/src';
import { ADMIN } from '../playwright.config';

// Libro propio (prefijo CUAE2E) para no depender de las semillas, que corren en paralelo.
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

test('al subir su libro muestra que cuadra con su Excel', async ({ page }) => {
  const p = `CUAE2E${Date.now()}`;
  const buffer = Buffer.from(await exportarLibro(libro(p)));
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.usuario);
  await page.getByLabel('Clave').fill(ADMIN.clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Ofertas' }).click();
  await page.getByRole('link', { name: 'Importar libro de Excel' }).click();

  await page.getByLabel('Archivo de Excel').setInputFiles({
    name: 'libro.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });
  await expect(page.getByTestId('cuadra')).toContainText(
    '✓ Cuadra con su Excel: $ 69,40 = $ 69,40',
  );
});
