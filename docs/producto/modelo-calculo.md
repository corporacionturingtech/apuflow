# Modelo de cálculo (fuente de verdad)

Copiado de `apuCalc()` y `calc()` de `referencia/prototipo_v2.html` (líneas 723–785), que a
su vez copia el Excel real de SEDEMI. **El total de Turing APU debe cuadrar al centavo con el
Excel del cliente.** Ese es el momento de confianza del producto: si no cuadra, no compran.

Todo el cálculo vive en `packages/motor` (funciones puras). Ningún otro paquete calcula.

## Redondeo

`r2(v)` = redondeo a 2 decimales, mitad hacia arriba, igual que `ROUND(x;2)` de Excel.
En el prototipo: `Math.round(Number((v*100).toPrecision(15)))/100`.
En el motor: `decimal.js` con `ROUND_HALF_UP`. Nunca sumar `number` sueltos para dinero.

Se redondea **cada línea y cada subtotal**, en el orden de abajo. Cambiar el orden cambia
centavos y rompe la paridad.

## Precio de un insumo

| Lista | Precio que usa el APU |
|---|---|
| Materiales | `B = r2(PU × FACTOR)` |
| Equipos | `B = tarifa/hora` |
| Mano de obra | `B = jornal/hora` |
| Transporte | `B = tarifa` |

## APU (una hoja "APU xx" de su Excel)

Con `A` = cantidad de la línea y `R` = rendimiento del APU:

```
Equipos:      C = A × B          D = r2(A × B × R)
Mano de obra: C = A × B          D = r2(A × B × R)
Materiales:   C = r2(A × B)
Transporte:   C = r2(A × B)

MO  = r2( Σ D(mano de obra) )
HM  = r2( MO × %HM / 100 )                 ← herramienta menor
EQ  = r2( Σ D(equipos) + HM )              ← EQ incluye la herramienta menor
MA  = r2( Σ C(materiales) )
TRA = r2( Σ C(transporte) )
CU  = r2( EQ + MO + MA + TRA )             ← costo directo unitario

%IND       = r2( Σ % de indirectos de la oferta )
PU_OFERTA  = r2( CU × (1 + %IND / 100) )
```

## Oferta (hoja Presupuesto)

Por cada rubro con cantidad `q`:

```
CT EQ  = r2(EQ × q)     CT MO = r2(MO × q)     CT MA = r2(MA × q)     CT TRA = r2(TRA × q)
CU TOTAL       = r2(CU × q)
TOTAL OFERTADO = r2(PU_OFERTA × q)
```

Totales:

```
CU_TOTAL_OFERTA = r2( Σ CU TOTAL )
SUBTOTAL        = r2( Σ TOTAL OFERTADO )          ← "subtotal sin IVA"
INDIRECTOS      = r2( SUBTOTAL − CU_TOTAL_OFERTA )
IVA             = r2( SUBTOTAL × %IVA / 100 )
TOTAL           = r2( SUBTOTAL + IVA )
PESO(rubro)     = CU TOTAL / CU_TOTAL_OFERTA      (sin redondear; se muestra en %)
```

Por capítulo: suma de `CU TOTAL` y de `TOTAL OFERTADO` de sus rubros, redondeada.

## Costo objetivo

```
BRECHA   = r2(SUBTOTAL − COSTO_OBJETIVO)
BRECHA % = BRECHA / COSTO_OBJETIVO × 100
LLEGÓ    = BRECHA ≤ 0
```

Los "rubros que más pesan" son los 8 primeros ordenados por `CU TOTAL` descendente (igual que el peso).

## Impacto de un cambio (para el panel de impacto)

Antes de aplicar un cambio se calcula `SUBTOTAL_antes`; después, `SUBTOTAL_después`.
El panel muestra: APUs que usan el insumo, rubros de esos APUs, diferencia y milisegundos
del recálculo (los ms los mide la UI; el motor es puro: `impacto(oferta, cambio, antes?)` en `packages/motor`, pasar `antes` evita recalcularlo). Ver `withImpact` y `setPrice` (líneas 1380–1403 del prototipo).

## Paridad (test obligatorio)

`packages/motor/test/paridad.test.ts` carga el `DATA` del prototipo, ejecuta el JS original
de `apuCalc`/`calc` con `node:vm` y compara cada APU, cada rubro y el total al centavo con el
motor TS. Cualquier cambio al motor que rompa este test se revierte.

El test extrae el JS del prototipo por texto (`const sum =`, `const r2 =`, `function maps(` hasta
`return { A, rows, caps, t, M };`), no por número de línea; si se reorganiza el HTML, ajustar esos marcadores.
El motor devuelve `Decimal` (clon propio en `redondeo.ts`); convertir a número solo en la UI.

Cuando se tenga un libro real de un cliente (anonimizado), se agrega como segundo fixture
con el total que muestra su Excel.
