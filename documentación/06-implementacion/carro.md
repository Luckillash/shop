---
title: "Guía: carro, drawer y cupón"
description: "Cómo está implementado el carro (store de Zustand, drawer, página /carro, Carro vacío), cómo se valida contra la base de datos y cómo se aplica el cupón con validate_coupon y rate limiting en Redis."
keywords: ["carro", "carrito", "drawer", "zustand", "cupón", "validate_coupon", "aplicar cupón", "FreeShippingBar", "refreshCart", "applyCoupon", "syncCart", "carro vacío", "rate limiting", "deshacer"]
related: ["02-arquitectura/estado-del-cliente.md", "03-base-de-datos/tablas-pedidos-y-pagos.md", "04-diseno/templates.md", "02-arquitectura/decisiones.md"]
source: ["src/store/", "src/lib/cart/", "src/components/cart/", "src/app/(tienda)/carro/page.tsx", "03-base-de-datos/sql/ecommerce_schema.sql §11"]
estado: "vigente (fase 4, 2026-10-24)"
---

# Guía: carro

> **Úsalo cuando:** tocas el drawer, la página `/carro`, el Carro vacío o *Aplicar cupón*, o vas a conectar el carro con el checkout (fase 5).

## Resumen

| Pieza | Archivo | Tipo |
|---|---|---|
| Store del carro (`items`, `couponCode`, `persist` v1) | `src/store/cart-store.ts` | Zustand + `localStorage` (`cart`) |
| Estado de UI (drawer abierto, último agregado, último eliminado) | `src/store/cart-ui-store.ts` | Zustand sin `persist` |
| Totales, líneas para el servidor, despacho de vista previa | `src/lib/cart/totals.ts` | Puro |
| Corrección del carro con la BD + avisos | `src/lib/cart/reconcile.ts` | Puro |
| Filas de la BD → snapshot, saneo de lo que manda el cliente, subtotal del servidor | `src/lib/cart/snapshot.ts` | Puro |
| Código del cupón y mensajes | `src/lib/cart/coupon.ts` | Puro |
| `refreshCart`, `applyCoupon` | `src/lib/cart/actions.ts` | Server Actions (solo leen) |
| Rate limiting (Redis, fail-open) | `src/lib/rate-limit.ts` | Puro (el cliente Redis se inyecta) |
| Drawer | `src/components/cart/cart-drawer.tsx` | Client, en el layout `(tienda)` |
| Lista con *Eliminar* + *Deshacer* | `src/components/cart/cart-lines.tsx` | Client |
| Carro y Carro vacío | `src/components/cart/cart-view.tsx` | Client |
| Cupón | `src/components/cart/coupon-form.tsx` | Client |
| Página | `src/app/(tienda)/carro/page.tsx` | Server, **estática** (○): solo aporta los recomendados cacheados y el bloque de entrega |

## 1. Store

Forma en [02-arquitectura/estado-del-cliente.md](../02-arquitectura/estado-del-cliente.md#hoy-srcstorecart-storets). Puntos clave:

- El ítem se identifica por `variantId`. `variantName` es la línea que muestra `CartItem` (*Color: Arena*, *Tamaño: Grande*) o `null` si el producto no tiene opciones; la arma `variantDescription()` de `src/lib/catalog/variants.ts`.
- `addItem(item, n)` suma y **ajusta a `maxQuantity`** (stock al agregar, tope 99). Si la variante ya estaba, también actualiza precio, imagen y máximo con los datos nuevos.
- `setQuantity` ajusta a `[1, maxQuantity]`. `restoreItem(item, index)` es el *Deshacer*.
- `persist`: `version: 1`, `migrate` descarta los carros de la versión 0 (ítems sin `variantId`, trampa 24), `partialize` guarda solo `items` y `couponCode`.
- `clear()` vacía también el cupón.

## 2. Drawer

- `<dialog>` modal (`showModal()`): el navegador atrapa el foco, cierra con Esc, deja la página inerte y **devuelve el foco** al botón que lo abrió. Cierra también con *Cerrar el carro*, con un clic en el velo y al seguir cualquier enlace del panel.
- 440 px desde la derecha en 250 ms (`@starting-style`), `::backdrop` con `scrim`, `z-drawer`, `shadow-lg`, `radius-xl` a la izquierda. A menos de 440 px ocupa todo el ancho y no lleva esquinas. Respeta `prefers-reduced-motion`. Mientras está abierto, `html` no se desplaza.
- Lo abren `useCartUi.show(nombre)` desde *Agregar al carro* de la Ficha (`ProductPurchase`) y de la tarjeta (`CatalogProductCard`, solo con una variante, D-017). El contador del header sigue enlazando a `/carro`.
- Contenido (template `CarroDrawer`): `Notice success` *Agregaste … al carro* · `FreeShippingBar` · `CartItem`s · subtotal · *El despacho y los cupones se calculan en el siguiente paso.* · *Ir a pagar* (primary → `/checkout`) · *Ver carro* (secondary → `/carro`).

## 3. Página `/carro`

- Antes de hidratar se muestra un placeholder (`aria-busy`): el carro está en `localStorage` y en el servidor no se sabe si está vacío. Se usa `useHydrated()` (`useSyncExternalStore`, igual que `CartLink`).
- **Carro:** *Tu carro · N productos* + *Seguir comprando* · `FreeShippingBar` · avisos · `CartItem`s · cupón · `OrderSummary` fijo a la derecha (debajo en móvil) · bloque de entrega (`DeliveryInfo`, compartido con la Ficha) · *Te podría gustar* (`getFeaturedProducts`).
- **Carro vacío:** ícono · *Tu carro está vacío* · recordatorio del despacho gratis · *Explorar la tienda* + *Ver mis favoritos* · *Novedades* (`getNewProducts`). Si se acaba de quitar el último producto, arriba aparece *Deshacer*.
- `OrderSummary`: `shipping = 0` (*Gratis*) si el subtotal **antes del cupón** llega a $39.990, si no `null` (*Por calcular*). Es la misma regla que `FreeShippingBar`. El costo real se define en el checkout (D-011) y lo calcula `place_order` (M2).

### Validación contra la BD (`refreshCart`)

- Al cargar la página, `refreshCart(lineas, couponCode)` lee **sin caché** las variantes del carro con el cliente anónimo (el RLS solo deja ver lo activo). El cliente manda solo `variantId` y cantidad: nunca precios.
- `reconcileCart()` corrige el store y arma el `Notice warning` *Actualizamos tu carro*:
  - *El precio de Taza de gres esmaltado (Color: Arena) cambió a $12.490.*
  - *Solo quedan 18 unidades de … Ajustamos la cantidad.* (también actualiza `maxQuantity`)
  - *Ya no quedan unidades de … Lo quitamos del carro.* / *… ya no está a la venta. Lo quitamos del carro.*
- Sin cupón, se valida una vez al cargar. **Con cupón**, se vuelve a llamar (400 ms después del último cambio) cada vez que cambian las cantidades, para recalcular el descuento. Los ítems agregados mientras la consulta estaba en curso no se tocan.
- La entrada se sanea en el servidor (`sanitizeLines`): solo UUID, sin repetidos, cantidades enteras en `[1, 99]`, máximo 50 líneas.

## Cupón

**Migración M3** (aplicada el 2026-10-24, `ecommerce_schema.sql` §11):

```sql
validate_coupon(p_code text, p_subtotal numeric, p_user_id uuid default null)
  returns table (code text, discount numeric, description text)
  -- security definer · stable · solo EXECUTE para service_role
```

- Mismas reglas que `place_order` (vigencia, `max_uses`, `max_uses_per_user`, `min_order_amount`). El descuento sale **redondeado a pesos** (el de `place_order` todavía usa 2 decimales: lo corrige M2).
- Los errores llevan un `hint` estable que la app traduce a un mensaje: `invalid`, `exhausted`, `used`, `min_order` (con la compra mínima en `detail`).
- **Solo `service_role` la puede ejecutar** (D-019). Si `anon` tuviera `EXECUTE`, cualquiera podría probar códigos por `/rest/v1/rpc/validate_coupon` con la llave publicable y saltarse el rate limiting.
- `p_user_id` lo pone el servidor desde `getClaims()`. Sin sesión (fase 4) es `null` y no se revisa el límite por usuario; `place_order` lo vuelve a revisar al crear el pedido.

**Server Action `applyCoupon(code, lineas)`:**

1. Normaliza el código (mayúsculas, `[A-Z0-9_-]{2,40}`).
2. Rate limiting por IP (D-005): `rl:coupon:<ip>`, **10 códigos inexistentes cada 10 minutos**. Solo cuentan los `invalid` (los de fuerza bruta); revalidar un cupón válido no gasta intentos.
3. Calcula el subtotal **en el servidor** con los precios de la BD y llama a `validate_coupon` con el cliente admin.
4. Devuelve `{ ok, coupon }` o `{ ok: false, reason, message }`.

El código queda en el store (`couponCode`). El descuento se recalcula en cada `refreshCart`; si el cupón deja de servir (por ejemplo, la compra baja del mínimo), se quita y se avisa: *Quitamos el cupón DESCUENTO5000. Este cupón es para compras desde $30.000…*. El descuento real lo calcula `place_order`.

| Caso | Mensaje |
|---|---|
| Campo vacío (en el cliente, sin llamar al servidor) | *Escribe el código de tu cupón.* |
| `invalid` | *Este cupón no es válido o ya venció. Revisa cómo lo escribiste.* |
| `exhausted` | *Este cupón ya alcanzó su límite de usos.* |
| `used` | *Ya usaste este cupón en otra compra.* |
| `min_order` | *Este cupón es para compras desde $30.000. Agrega productos para usarlo.* |
| Rate limiting | *Hiciste muchos intentos. Espera unos minutos y vuelve a intentarlo.* |
| Error inesperado | *No pudimos revisar el cupón. Vuelve a intentarlo.* |

Botón: *Aplicar cupón* → *Aplicando* (`Button loading`). Con un cupón aplicado: *Cupón BIENVENIDA10 aplicado · 10% en tu primera compra* + *Quitar cupón*; en el resumen, *Cupón BIENVENIDA10 −$2.498*.

### Rate limiting y Redis caído

`createRateLimiter(getRedis)` es **fail-open**: si Redis no responde en 500 ms, deja pasar y registra `[rate-limit] Redis no disponible, se deja pasar`. Se eligió así porque lo crítico (cupón, stock, total) lo vuelve a validar PostgreSQL. Con Redis caído, `getRedis()` rechaza al instante (trampa 53), así que el cupón no se demora; el timeout de 500 ms cubre el caso de un Redis que acepta la conexión pero no responde.

## Sincronización

Decisión del 2026-10-24 (D-018): **en la fase 4 el carro vive solo en Zustand.** Las acciones del carro solo leen; no se escribe `cart_items`. En la fase 5, con la sesión:

- `syncCart(items)` (Server Action) justo antes de `place_order`: reemplaza `cart_items` con el carro del cliente. **Es obligatorio** (trampa 13).
- Al iniciar sesión, fusionar el carro del cliente con `cart_items` (ver [estado-del-cliente.md](../02-arquitectura/estado-del-cliente.md#sincronización-con-la-base-de-datos-fase-5)).
- Llamar a `clear()` solo cuando el pago se aprueba o queda en transferencia.

## Pruebas

- Unitarias: `cart-store.test.ts`, `src/lib/cart/*.test.ts`, `src/lib/rate-limit.test.ts` (cliente Redis falso, fail-open y timeout), `cart-lines.test.tsx` (stepper con tope y *Deshacer*), `variantDescription` en `variants.test.ts`.
- Navegador (`next start`, Edge por CDP): drawer desde la Ficha y desde la tarjeta, foco y Esc, clic en el velo, cupones (vacío, inexistente, mínimo no alcanzado, válido y recálculo al cambiar la cantidad), carro alterado en `localStorage` (precio y cantidad corregidos), *Deshacer* en el Carro vacío, migración desde la versión 0. A 390 px se capturó con un `<iframe>` servido desde `localhost` (trampas 49 y 52).
