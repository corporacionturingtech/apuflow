# Índice del prototipo v2 (`prototipo_v2.html`, 2.262 líneas, ~250 KB)

Es el prototipo que se le mostró a SEDEMI el 15 oct 2026 (datos ficticios). Sirve de
**especificación ejecutable**: el cálculo, los textos y los flujos de APUflow salen de aquí.

**No lo leas entero** (~70k tokens). Lee solo el rango que necesitas:

```bash
sed -n 735,785p referencia/prototipo_v2.html
```

Si una línea cambió, ubícala con `grep -n "function apuCalc" referencia/prototipo_v2.html`.

| Líneas | Qué hay | Para qué ticket sirve |
|---|---|---|
| 1–476 | `<head>`, CSS y HTML base | Solo como referencia visual; no se copia |
| 477–631 | `DATA`: datos generales, factor, herramienta menor, IVA, indirectos, materiales, mano de obra, equipos, transporte, APUs, bloques | Fixture de pruebas y empresa demo |
| 641–660 | `sum`, `r2` (redondeo), `fmt`, `money` (formato `$ 1.313,64`) | Motor y formato de moneda |
| 660–674 | `parseNum` (acepta `10,40` y `10.40`) | Entrada de números en la tabla |
| 675–721 | Estado, `fresh`, `load`, `save`, `receive` (sincronía entre pestañas) | Solo referencia |
| 723–731 | `maps`, `precioMat`, `pctInd` | Motor |
| 732–751 | `apuCalc`: cálculo de un APU | **Motor (crítico)** |
| 752–785 | `calc`: cálculo de la oferta (hoja Presupuesto) | **Motor (crítico)** |
| 786–809 | `addBlockTo`, `numbering`: bloques a capítulos y numeración | Bloques |
| 810–823 | `stamp`, `logChange`: historial | Bitácora |
| 824–889 | Navegación, `gapInfo` (brecha al costo objetivo), barra de totales | Layout, costo objetivo |
| 890–927 | Vistas Inicio y Datos generales | Onboarding |
| 928–994 | Vista Presupuesto (columnas por tipo público/privado) | Presupuesto |
| 995–1059 | Vista APU (los cuatro componentes en una pantalla) | Pantalla APU |
| 1060–1125 | Listas de precios y aviso de impacto | Listas de precios |
| 1126–1144 | Indirectos y utilidad | Indirectos |
| 1145–1196 | Costo objetivo, rubros que más pesan, versiones | Costo objetivo |
| 1197–1240 | Bloques e Historial | Bloques, bitácora |
| 1241–1295 | `MISIONES`: 7 misiones con la frase de la clienta y el "qué gana" | Onboarding guiado, textos de valor |
| 1304–1364 | `render`, barra guía (`coachRender`, `checkMission`) | Onboarding guiado |
| 1380–1426 | `withImpact`, `setPrice`, `undo` | **Panel de impacto y deshacer** |
| 1428–1482 | Compañeros simulados y prueba de volumen (1.500 rubros) | Volumen |
| 1495–1703 | `ACT` y `EDIT`: todas las acciones del usuario | Referencia de flujos |
| 1758–1854 | Zip, CRC32, estilos y hojas del .xlsx | No se copia (usamos ExcelJS) |
| 1855–2069 | `buildXlsx`: hojas, columnas y fórmulas del Excel exportado | **Exportar Excel** |
| 2089–2152 | `unzipRead`, `readXlsx` | Referencia de importación |
| 2153–2262 | `parseCSV`, `analyzeImport`, `applyImport`: importar la hoja Materiales | **Importar Excel** |
