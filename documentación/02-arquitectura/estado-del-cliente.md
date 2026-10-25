---
title: "Estado del cliente: carro en Zustand y sincronización con la base de datos"
description: "Cómo es useCartStore desde la fase 4 (CartItem por variante, setQuantity, persist v1 con migrate), cómo se evita el hydration mismatch, cómo se valida contra la BD y cómo se sincronizará con carts/cart_items en la fase 5."
keywords: ["zustand", "useCartStore", "useCartUi", "carro", "carrito", "persist", "localStorage", "hidratación", "sync", "cart_items", "CartItem", "variant_id", "refreshCart", "migrate"]
related: ["06-implementacion/carro.md", "03-base-de-datos/tablas-usuarios-y-carrito.md", "04-diseno/componentes.md"]
source: ["src/store/cart-store.ts", "src/store/cart-ui-store.ts", "src/components/cart/", "_archivo/diseno-almacen.md §2.10, §6", "03-base-de-datos/sql/ecommerce_schema.sql §5, §11"]
estado: "store e hidratación: vigente (fase 4) · sincronización con cart_items: vigente (fase 5)"
---

# Estado del cliente: el carro

> **Úsalo cuando:** tocas `src/store/cart-store.ts`, el drawer o la página del carro, o el paso de carro → pedido.

## Hoy (`src/store/cart-store.ts`)

```ts
export type CartItem = {
  variantId: string;           // product_variants.id
  productId: string;
  slug: string;                // para enlazar a /productos/[slug]
  name: string;                // products.name
  variantName: string | null;  // "Color: Arena" · null sin opciones (variantDescription)
  image: string | null;
  unitPrice: number;           // CLP entero, coalesce(variant.price, base_price)
  compareAt: number | null;    // solo si es mayor que unitPrice
  quantity: number;
  maxQuantity: number;         // stock al agregar o al validar, tope MAX_QUANTITY (99)
};

type CartState = {
  items: CartItem[];
  couponCode: string | null;                       // cupón aplicado en /carro
  addItem(item, quantity = 1);                     // suma y ajusta a maxQuantity
  setQuantity(variantId, quantity);                // ajusta a [1, maxQuantity]
  removeItem(variantId);
  restoreItem(item, index);                        // Deshacer
  replaceItems(items);                             // corrección de refreshCart
  setCouponCode(code | null);
  clear();                                         // vacía ítems y cupón
};
// persist: { name: "cart", version: 1, migrate: migrateCart, partialize: items + couponCode }
```

`src/store/cart-ui-store.ts` (`useCartUi`, sin `persist`): `open`, `added` (nombre para *Agregaste … al carro*), `removed` (para *Deshacer*), `show(nombre)`, `close()`, `setRemoved()`.

`MAX_QUANTITY` vive en `src/lib/cart/totals.ts` para que el servidor lo use sin importar el store.

## Problemas conocidos y cómo quedaron

| # | Problema | Estado |
|---|---|---|
| 1 | `id` no decía si era de un producto o de una variante | ✅ `variantId` |
| 2 | Faltaban `variantName`, `image`, `compareAt`, `maxQuantity`, `slug` | ✅ (B28) |
| 3 | No había `setQuantity` | ✅ con tope en el stock |
| 4 | `addItem` sumaba siempre 1 | ✅ acepta N (fase 3) y ajusta al máximo |
| 5 | Sin `version` ni `migrate` en `persist` | ✅ versión 1; los carros de la versión 0 se descartan |
| 6 | `persist` lee `localStorage` en el cliente (*hydration mismatch*) | ✅ ver [Hidratación](#hidratación) |
| 7 | El precio del carro es solo para mostrar | Se mitiga con `refreshCart` en `/carro`; el total real sigue saliendo de `place_order` (trampa 25) |

## Hidratación

- Los componentes que leen el carro (contador del header, drawer, `/carro`) son `"use client"`.
- El contador usa `useSyncExternalStore(useCartStore.subscribe, cartCount, () => 0)`: 0 en el servidor y durante la hidratación, el valor real después.
- `/carro` usa `useHydrated()` (`src/components/cart/use-hydrated.ts`, también con `useSyncExternalStore`): antes de hidratar muestra un placeholder, porque no se sabe si el carro está vacío. Así la página puede ser estática.
- El drawer no necesita el flag: está cerrado en el HTML del servidor y solo se abre después de una acción del usuario.

## Validación contra la base de datos (fase 4)

`refreshCart(lineas, couponCode)` (Server Action, solo lectura) devuelve el estado actual de cada variante y, si hay cupón, su descuento. `reconcileCart()` corrige el store (precio, stock, máximo, nombre, imagen) y arma los avisos. Detalle en [06-implementacion/carro.md](../06-implementacion/carro.md#validación-contra-la-bd-refreshcart).

## Sincronización con la base de datos (fase 5)

**Decisión D-018:** mientras no haya sesión, el carro vive solo en Zustand y no se escribe `cart_items`.

En la BD hay un carro por usuario (`carts.user_id unique`), que crea el trigger `handle_new_user`. `place_order` **lee `cart_items`, no el carro del cliente**.

| Momento | Acción |
|---|---|
| Agregar, cambiar cantidad o eliminar, **con sesión** | Opcional: la Server Action `syncCart` en segundo plano (existe; hoy no se llama al editar) |
| **Iniciar sesión** (o crearse una sesión anónima) | Fusiona: para cada `variantId`, la cantidad máxima entre el cliente y la BD (con tope en el stock). Luego reemplaza el estado del cliente con el resultado |
| **Antes de `place_order`** (obligatorio) | `syncCart(items)` reemplaza `cart_items` con el carro del cliente: `delete` + `insert`, o un `upsert` sobre `(cart_id, variant_id)` |
| Después de `place_order` | La BD ya vació `cart_items`. Llama a `clear()` en el cliente **solo cuando el pago se aprueba o queda en transferencia**. Si el pago falla, el pedido conserva los productos (ver el diseño de Pago rechazado) |
| Cerrar sesión | `clear()` en el cliente |

✅ Implementado (2026-10-24): `syncUserCart(supabase, userId, lines, { merge })` en `src/lib/cart/server.ts` (server-only): `mergeLines` (cantidad mayor) → `loadSnapshots` → `clampToSnapshots` (solo lo activo y con stock, ajustado al stock) → upsert en `cart_items` y borrado del resto → `toCartItems` para el store (lógica pura en `src/lib/cart/merge.ts`). La usan `signIn`/`signUp`/`startGuestCheckout` (con `merge`), `placeOrder` (sin `merge`) y la acción `syncCart`. *Cerrar sesión* llama a `clear()`.
