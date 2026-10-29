# Excel: importar y exportar

El Excel es la puerta de entrada (importar) y de salida (exportar) del producto. El cliente
no abandona su Excel de golpe: Turing APU tiene que leer su libro y devolverle uno igual.

El formato base es el libro de SEDEMI, visto en la reunión del 5 oct 2026 (no tenemos el
archivo: solo capturas, y el prototipo lo replica con datos ficticios). Otros clientes
tendrán variantes: el importador trabaja por **encabezados**, no por posiciones fijas.

## Hojas del libro

| Hoja | Columnas (fila de encabezado) | Notas |
|---|---|---|
| Datos generales | Pares clave/valor: proyecto, cliente, ubicación, fecha, plazo, tipo | |
| Equipos | ITEM · DESCRIPCIÓN · TARIFA/HORA | Debajo: "Herramienta menor (% de la mano de obra)" |
| Mano Obra | ITEM · DESCRIPCIÓN · JORNAL/HR | |
| Materiales | ITEM · DESCRIPCIÓN · UNIDAD · PRECIO REFERENCIAL · PRECIO UNITARIO · PRECIO [· CPC · P / ND / I · VAE] | Celda FACTOR arriba (E1/F1). Filas de sección por disciplina. Las 3 últimas columnas solo en ofertas públicas (Turing APU las guarda por rubro y las exporta en `Presupuesto`, ver abajo). `PRECIO = ROUND(PU × FACTOR; 2)` |
| Transporte | ITEM · DESCRIPCIÓN · UNIDAD · TARIFA | |
| Indirectos | CONCEPTO · PORCENTAJE | Total y luego IVA |
| Presupuesto | NUMERO · DESCRIPCIÓN DEL RUBRO · DESCRIPCIÓN CPC · UNIDAD · CANTIDAD · EQ · CT EQ · MO · CT MO · MA · CT MA · TRA · CT TRA · CU · CU TOTAL · PESO · RENDIMIENTO · P.U. OFERTADO · TOTAL OFERTADO | Fila de total arriba. Capítulos como filas de título |
| APU xx | Rubro, unidad, disciplina, rendimiento R (C4); bloques EQUIPOS / MANO DE OBRA / MATERIALES / TRANSPORTE | Una hoja por APU. Prefijo "APU " porque `C01` solo parece una celda |

Referencia exacta de filas, estilos y fórmulas: `buildXlsx` en el prototipo (líneas 1855–2069).

## Exportar

- Librería **ExcelJS** en `packages/excel` (el prototipo armaba el zip a mano; no se copia).
- Fórmulas reales entre hojas (Presupuesto → `APU xx` → Materiales/Equipos/…) **y** el valor
  calculado en caché, para que el archivo muestre cifras aunque no se recalcule.
- Ofertas públicas: `Presupuesto` agrega «P / ND / I» (col. T) y «VAE» (col. U); CPC va en la col. C.
- Celdas de entrada (precios, cantidades, %) con el estilo amarillo de su libro.
- Test: exportar el fixture, abrirlo con LibreOffice en modo headless forzando recálculo y
  comparar el total con el del motor (quitar el valor en caché de las celdas con fórmula y `soffice --headless --convert-to xlsx`; ver `packages/excel/test/exportar.test.ts`).

## Importar

Flujo de 3 pasos en la UI: **Subir → Revisar → Confirmar**.

1. **Subir** el .xlsx. Se lee en el servidor de la instancia (nunca sale a terceros).
2. **Revisar**: el sistema muestra qué encontró ("4 listas, 312 insumos, 86 APUs, 1 presupuesto
   de 412 rubros") y lo que no entendió, por hoja y fila, en lenguaje llano. Detecta columnas
   por nombre normalizado (sin tildes, mayúsculas, espacios), con alias configurables.
3. **Confirmar**: carga todo en una oferta nueva y muestra la comprobación
   **"Total en su Excel vs total en Turing APU"**. Si difiere, lista los rubros que no cuadran.

Modos de importación:
- **Libro completo** (onboarding): listas + APUs + presupuesto.
- **Solo precios** (hecho, `/importar/precios`; el libro puede traer solo algunas hojas de lista): actualiza precios de una lista por coincidencia de descripción (o código),
  con vista previa de qué cambia y panel de impacto al confirmar.

Reglas:
- Los valores en caché del libro sirven para la comprobación de "cuadra", no para calcular.
- Un insumo repetido con distinto precio se reporta, no se elige uno en silencio.
- Libros con estructura distinta: se agregan como "perfil de importación" de esa empresa
  (mapa de hojas y columnas en JSON), no como código especial por cliente.
