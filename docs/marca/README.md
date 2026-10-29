# Marca del producto

Ícono de **Turing APU** (nombre comercial del producto, antes APUflow, en la familia Turing: Turing APU,
Turing Factura, Turing Dental, Turing Bodega).

| Archivo | Uso |
|---|---|
| `turing_apu_icono.svg` | Tiendas (iOS, Android): cuadrado a sangre, el sistema aplica su máscara |
| `turing_apu_icono_redondeado.svg` | Web, presentaciones, favicon de 32 px o más (radio 22,37 %) |
| `turing_apu_favicon.svg` | Favicon simplificado (16/32 px): una línea blanca y el total naranja, trazo de 70 px |
| `generar_icono.py` | Genera los SVG del ícono y del favicon y rasteriza (Pillow) `favicon.ico` (16/32/48), `favicon-16/32.png`, `apple-touch-icon.png` (180, a sangre) e `icono-192/512.png` en `apps/web/public/`. Cambiar medidas aquí y regenerar |
| `turing_apu_isotipo_claro.png`, `turing_apu_isotipo_oscuro.png` | Isotipo **original** de Turingtech recortado (copia también en `apps/web/src/assets/`) |
| `recortar_isotipo.py` | Rehace los recortes; solo lee `turingtech-docs/assets/` |
| `turing_apu_logo_horizontal.png` | Logo horizontal **provisional** hecho con IA (1508×377, fondo blanco): solo para usos fuera de la app |

## Logo en la app

`apps/web/src/ui/LogoTuringApu.tsx`: `<LogoTuringApu variante="claro" | "oscuro" descriptor />`. El tamaño sale
del `font-size` del contenedor. Texto real en Inter bold: «TURING» navy (blanco en `oscuro`) y «APU» `#EA580C`;
descriptor «Análisis de precios unitarios» en `#334155` (en `oscuro`, slate-300 por contraste sobre navy).
Isotipo = altura de las mayúsculas (con descriptor abarca las dos líneas); separación 0,75 em.
Se usa en el login (con descriptor) y como marca de respaldo en la navegación cuando la empresa no sube logo propio.

## Recorte del isotipo

Desde `turingtech-docs/assets/`: `logo.png` (1652×952, fondo blanco) → caja de contenido (515,34)-(1188,542)
más 6 px de margen, fondo vuelto transparente; `logoazul.png` (559×322, fondo `#0F172A`) → caja (173,18)-(392,192)
más 6 px. Se descarta el wordmark TURINGTECH y el lema. El original oscuro es de baja resolución (231×186):
sirve hasta ~2× a 28 px de alto; para tamaños mayores pedir el vector a Turingtech.

## Reglas del ícono

- Fondo `#0F172A` plano; símbolo blanco `#FFFFFF` y un solo elemento naranja `#EA580C`.
- Hoja al 58 % del alto, centrada; trazo único de 44 px en lienzo de 1024 (extremos redondeados).
- Dos rubros blancos (medio y corto) y el total en naranja, la línea más larga.
- Sin flechas, texto, degradados ni sombras.

## Familia

Los demás productos usan el mismo marco, trazo y colores; cambia solo el símbolo y su
único elemento naranja (Factura: comprobante; Dental: muela; Bodega: cajas con flecha).

## Pendiente

- Vector final del logo horizontal y del isotipo (el PNG oscuro es de baja resolución).
- Dejar de usar `turing_apu_logo_horizontal.png` donde aún se use fuera de la app.
