---
title: "Funciones RPC y triggers: place_order, cancel_order, is_admin y automatismos"
description: "Contrato exacto de place_order y cancel_order (parámetros, validaciones, efectos, errores, permisos), is_admin, y qué hace cada trigger del esquema."
keywords: ["place_order", "cancel_order", "rpc", "is_admin", "trigger", "handle_new_user", "sync_order_on_payment", "set_order_status_timestamps", "protect_profile_role", "guard_review_publication", "ensure_single_default_address", "set_updated_at", "security definer"]
related: ["03-base-de-datos/tablas-pedidos-y-pagos.md", "05-dominio/ciclo-de-vida-del-pedido.md", "06-implementacion/checkout-y-pedidos.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql §2, §9, §10, §11"]
estado: "vigente"
---

# Funciones RPC y triggers

> **Úsalo cuando:** vas a crear o cancelar un pedido, o algo cambia "solo" en la base de datos y quieres saber por qué.

## `place_order(...) → uuid` (M2, fase 5)

Firma (cambió el 2026-10-24; la anterior `(uuid, text, text)` se borró, trampa 20):

```
place_order(p_shipping_method text, p_payment_method text, p_contact_email text, p_customer_rut text,
            p_shipping_address_id uuid = null, p_recipient_name text = null, p_recipient_phone text = null,
            p_document_type text = boleta, p_invoice jsonb = null, p_coupon_code text = null,
            p_notes text = null) → uuid
```

Crea el pedido a partir del **carro en la BD** del usuario, en una sola transacción. Es `security definer` y solo la pueden ejecutar `authenticated` (incluye las sesiones anónimas) y `service_role`. La llama `placeOrder` (`src/lib/checkout/actions.ts`) con el cliente del usuario, **después de `syncUserCart`**.

```ts
const { data: orderId, error } = await supabase.rpc("place_order", {
  p_shipping_method: "standard",          // standard · express · pickup
  p_payment_method: "webpay",             // webpay · flow · transfer
  p_contact_email: "ana@correo.cl",
  p_customer_rut: "12345678-5",
  p_shipping_address_id: addressId,       // retiro: undefined + p_recipient_name y p_recipient_phone
  p_document_type: "boleta",              // factura: + p_invoice { business_name, rut, activity }
  p_coupon_code: "BIENVENIDA10",
});
```

Pasos:

1. `auth.uid()` debe existir → *Debes iniciar sesión para comprar* (`hint: auth`). **Con el cliente admin falla**, porque `auth.uid()` es null.
2. Valida método de despacho, medio de pago, documento, correo y RUT no vacío; con factura, los tres datos de `p_invoice` → `hint: input`.
3. Retiro: exige nombre y teléfono de quien retira y arma `shipping_address` con la tienda (`type: "pickup"`, D-014). Domicilio/express: la dirección debe ser del usuario → *Dirección de despacho no válida* (`hint: address`); se copia con `type: "delivery"`. Express fuera de la RM → *El despacho express es solo para la Región Metropolitana* (`hint: express_region`).
4. El carro debe tener ítems → *El carrito está vacío* (`hint: empty_cart`).
5. **Bloquea las variantes** (`for update`, ordenadas por id) y valida cada una: inactiva → `hint: unavailable`; `stock < quantity` → `hint: stock`. En ambos, `detail` = nombre del producto.
6. `subtotal` con `coalesce(v.price, p.base_price)`.
7. Cupón (si viene): lo bloquea y valida como `validate_coupon` (`hint`: `invalid` · `exhausted` · `used` · `min_order` con `detail` = mínimo). Descuento **redondeado a pesos**: `round(subtotal × value / 100)` o `round(least(value, subtotal))`.
8. **Despacho (D-011):** `pickup` 0 · `express` 4.990 (solo RM, ver paso 3) · `standard`: 0 si `subtotal − descuento ≥ 39.990`, 3.990 si la región es `Metropolitana de Santiago`, si no 6.990.
9. Inserta `orders` (`pending`, `total = subtotal − descuento + despacho`, `tax_total = round(total × 19 / 119)` (D-012), `contact_email` en minúsculas, `customer_rut`, métodos, documento, `invoice_details`, `expires_at` = +30 min o +48 h con transferencia (D-010)) y `order_items` (snapshots).
10. **Descuenta el stock** y registra `inventory_movements` (`sale`, cantidades negativas).
11. Registra `coupon_redemptions` y suma 1 a `used_count`.
12. **Vacía `cart_items`.** Devuelve el `id` del pedido.

Si algo falla, nada se aplica. Los mensajes dicen "carrito" (trampa 17): la app no los muestra tal cual, sino que traduce el `hint` con `orderFailure()` (`src/lib/checkout/order-errors.ts`).

Verificado el 2026-10-24 con los pedidos 1001 (domicilio RM, Webpay, BIENVENIDA10: $52.960 − $5.296, despacho gratis, IVA $7.610, vence en 30 min) y 1002/1003 (retiro, transferencia, factura: $20.480, vence en 48 h).

## `cancel_order(p_order_id uuid) → void`

Anula un pedido y **devuelve el stock**. Es `security definer`. Pueden ejecutarla `authenticated` y `service_role`.

| Quién llama | Puede anular |
|---|---|
| Cliente (`auth.uid()` = dueño) | Solo sus pedidos `pending`. Si no es el dueño: *Pedido no encontrado*. Si no está pendiente: *Solo puedes cancelar pedidos pendientes de pago* |
| Admin o **`service_role`** (`auth.uid()` null) | Pedidos `pending`, `paid` o `processing`. Otros estados → *Un pedido en estado X no se puede cancelar* |

Efectos: suma el stock de vuelta (`inventory_movements` con `cancellation`), borra `coupon_redemptions` y resta 1 a `used_count`, y pasa el pedido a `cancelled` (el trigger llena `cancelled_at`).

**No hace el reembolso del dinero.** Si el pedido estaba `paid`, hay que llamar a `refund` en Webpay o Flow por separado y marcar el pago como `refunded`.

Uso típico: el cron de vencimiento ([06-implementacion/pago-transferencia.md](../06-implementacion/pago-transferencia.md)) la llama con el cliente admin.

## `is_admin() → boolean`

`security definer`, `stable`. Devuelve true si `profiles.role = 'admin'` para `auth.uid()`. Se usa en todas las políticas de RLS. Úsala también en la app si necesitas saber si el usuario es admin: `rpc('is_admin')`.

## `search_products(q text, max_results int = 24) → setof product_catalog`

`security invoker` (respeta el RLS: solo productos activos), `stable`, `search_path = ''`. Ejecutable por `anon` y `authenticated`. Agregada en la fase 3 (D-016).

1. Full-text en español: `search_vector @@ websearch_to_tsquery('spanish', q)`, ordenado por `ts_rank`.
2. **Solo si el paso 1 no devuelve nada:** `extensions.word_similarity` ≥ 0,4 entre la consulta sin tildes y el nombre o la categoría sin tildes (tolera "tasa", "taz", "ceramica"). Desempata `similarity` con el nombre.

Devuelve como máximo `least(max_results, 48)` filas. La app la llama desde `searchProducts(q)` en `src/lib/catalog/queries.ts`.

## `validate_coupon(p_code text, p_subtotal numeric, p_user_id uuid = null) → table (code, discount, description)`

`security definer`, `stable`, `search_path = ''`. **Solo `service_role`** tiene `EXECUTE` (D-019). Migración M3, fase 4 (2026-10-24).

- Mismas reglas que el bloque del cupón de `place_order`: vigencia, `max_uses`, `max_uses_per_user` (solo si llega `p_user_id`) y `min_order_amount`.
- `discount` sale redondeado a pesos: `round(subtotal × value / 100)` o `round(least(value, subtotal))`.
- Errores con `hint`: `invalid` (*Cupón no válido o expirado*), `exhausted`, `used`, `min_order` (`detail` = compra mínima en CLP).
- La llaman `applyCoupon` y `refreshCart` (`src/lib/cart/actions.ts`) con el cliente admin, después del rate limiting y con el subtotal calculado con los precios de la BD.

## Intentos de pago (fase 6, migración `payments_attempts_m4`)

Las tres son `security definer`, `search_path = ''` y **solo `service_role`** (las llama `src/lib/payments/service.ts`, después de verificar que el pedido es del usuario con su propio cliente, o desde un retorno o el cron).

### `start_payment_attempt(p_order_id uuid, p_provider text) → table (payment_id, reference, attempt, amount, order_number, contact_email, expires_at)`
- Bloquea el pedido (`for update`). Errores con `hint`: `input` (medio no válido) · `not_found` · `not_pending` · `expired` · `already_paid` · `too_many` (más de 10 intentos).
- Marca `failed` los intentos `pending` anteriores (`raw_response.superseded_by = n`), cambia `orders.payment_method` y `expires_at` (D-023) e inserta el intento `pending` con `amount = orders.total` y `reference = <order_number>-<n>`. En transferencia, `provider_payment_id = reference`.

### `claim_payment(p_payment_id uuid, p_seconds int = 60) → boolean`
- Lock de la BD: pone `confirming_until = now() + p_seconds` solo si el intento sigue `pending` y nadie lo tiene (o venció). `false` = otro proceso lo está confirmando, o ya no está pendiente.

### `settle_payment(p_payment_id uuid, p_status payment_status, p_raw jsonb) → table (changed, payment_state, order_state, other_paid)`
- Idempotente. Transiciones: `pending → paid | failed` y `failed → paid` (Flow puede cobrar un intento reemplazado). Libera `confirming_until`.
- Devuelve el estado del pedido **después** del trigger `sync_order_on_payment` y si el pedido ya tenía otro pago `paid`: con eso la app detecta B13 (`order_state = cancelled`) y el doble pago (D-020).

## Triggers

| Trigger | Tabla y evento | Efecto |
|---|---|---|
| `set_updated_at` | `before update` en 12 tablas | `updated_at = now()` |
| `on_auth_user_created` → `handle_new_user()` | `after insert` en `auth.users` | Crea `profiles` (con `full_name` y `avatar_url` de la metadata) y `carts`. También se ejecuta con usuarios **anónimos** |
| `protect_profile_role` | `before update` en `profiles` | Un no admin con sesión no puede cambiar `role` → *No tienes permiso para cambiar el rol* |
| `ensure_single_default_address` | `before insert/update of is_default` en `addresses` | Desmarca las demás direcciones por defecto del usuario |
| `set_order_status_timestamps` | `before update of status` en `orders` | Llena `paid_at`, `shipped_at`, `delivered_at` o `cancelled_at` (si estaban vacíos). **No** hay columna para `processing` ni `refunded` |
| `sync_order_on_payment` | `after insert/update of status` en `payments` | Si el pago pasa a `paid`, el pedido `pending` pasa a `paid`. Si el pedido ya está `cancelled`, **no cambia** (ver la trampa en [ciclo de vida](../05-dominio/ciclo-de-vida-del-pedido.md)) |
| `guard_review_publication` | `before insert/update` en `reviews` | Un cliente no controla `is_published` |
