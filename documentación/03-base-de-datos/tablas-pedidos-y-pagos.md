---
title: "Tablas de pedidos, pagos y cupones: orders, order_items, payments, coupons, coupon_redemptions"
description: "Columnas y reglas de los pedidos, sus ítems, los pagos de cada pasarela y los cupones, con cómo mapear Webpay y Flow a la tabla payments."
keywords: ["orders", "order_items", "payments", "coupons", "coupon_redemptions", "order_number", "provider", "provider_payment_id", "raw_response", "discount_type", "min_order_amount", "max_uses", "shipping_address"]
related: ["05-dominio/ciclo-de-vida-del-pedido.md", "03-base-de-datos/funciones-y-triggers.md", "06-implementacion/pagos-webpay-plus.md", "06-implementacion/pagos-flow.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql §6, §7, §11"]
estado: "definido"
---

# Tablas de pedidos, pagos y cupones

> **Úsalo cuando:** creas o lees pedidos, registras un pago o trabajas con cupones.

## `orders`

Se crea **solo** con `place_order()`: el RLS no permite `insert` a los clientes.

| Columna | Notas |
|---|---|
| `id` | uuid. Úsalo en las URL (`/pedido/[id]`) |
| `order_number` | bigint identity **desde 1001**, unique. Es el número visible: *Pedido N.º 1001* (estilo `sku`, mono) |
| `user_id` | `set null`. Con sesión anónima es el id del anónimo |
| `status` | `order_status`, por defecto `pending`. Ver [ciclo de vida](../05-dominio/ciclo-de-vida-del-pedido.md) |
| `subtotal` | Σ `unit_price × quantity` |
| `discount_total` | Descuento del cupón, redondeado a pesos (M2) |
| `shipping_total` | Lo calcula `place_order` según `shipping_method`, región y subtotal − descuento (D-011) |
| `tax_total` | IVA incluido en el total: `round(total × 19 / 119)`, informativo (D-012) |
| `total` | `subtotal − discount_total + shipping_total` (lo calcula `place_order`) |
| `currency` | `'CLP'` |
| `coupon_id` | `set null` |
| `shipping_address` | jsonb **not null**: copia de la dirección con `type: "delivery"`, o la tienda con `type: "pickup"`, `store` y quien retira (D-014) |
| `billing_address` | jsonb, nullable. Sin uso (los datos de la factura van en `invoice_details`) |
| `notes` | Texto libre (`p_notes`) |
| `contact_email` | M1. Correo del paso Contacto, en minúsculas (también para invitados) |
| `customer_rut` | M1. RUT de quien compra, `12345678-5` (boleta) |
| `shipping_method` | M1. `standard` · `express` · `pickup` (check) |
| `payment_method` | M1. `webpay` · `flow` · `transfer` (check) |
| `document_type` | M1. `boleta` (por defecto) · `factura`. Con factura, `invoice_details` es obligatorio (check) |
| `invoice_details` | M1. jsonb `{ business_name, rut, activity }` |
| `expires_at` | M1. Límite para pagar: +30 min (Webpay, Flow) o +48 h (transferencia), D-010. Lo usará el cron de la fase 6 |
| `carrier`, `tracking_number` | Despacho: *Despacha Starken*, código de seguimiento |
| `placed_at` | Fecha de compra |
| `paid_at`, `shipped_at`, `delivered_at`, `cancelled_at` | Las llena el trigger `set_order_status_timestamps` al cambiar el `status` |

Índices: (`user_id`, `placed_at desc`) para *Mis pedidos*, `status`, `coupon_id`.

## `order_items`

Son snapshots: `product_name`, `variant_name`, `sku`, `unit_price`, `quantity > 0` y **`line_total` generado** (`unit_price * quantity`). `product_id` y `variant_id` quedan en `set null` si se borra el producto.

## `payments`

Hay **una fila por intento de pago**. Un pedido puede tener varias: rechazado → reintento.

| Columna | Notas |
|---|---|
| `order_id` | `cascade` |
| `provider` | text libre. **Valores acordados:** `'webpay'`, `'flow'`, `'transfer'` |
| `provider_payment_id` | Identificador de la pasarela (ver la tabla de abajo). **unique (`provider`, `provider_payment_id`)** → permite un `upsert` idempotente |
| `status` | `payment_status`: `pending` · `authorized` · `paid` · `failed` · `refunded` |
| `amount` | Monto cobrado (entero en la práctica) |
| `raw_response` | jsonb para auditar: `create` (url o `flowOrder`), `result` (respuesta de `commit` / `status` / `getStatus`, o los parámetros del retorno sin commit), `shop_reason` (`rejected` · `aborted` · `timeout` · `expired` · `gateway_error` · `mismatch`), `superseded_by` (intento que lo reemplazó), `refund` y `refund_status` |
| `attempt` | Fase 6. Número de intento `n` del pedido (1, 2, …). unique (`order_id`, `attempt`) |
| `reference` | Fase 6. `<order_number>-<n>` (D-013): `buy_order` de Webpay, `commerceOrder` de Flow, referencia de la transferencia. unique |
| `confirming_until` | Fase 6. Lock de la BD mientras un proceso confirma el intento (`claim_payment`, 60 s). Respalda al lock de Redis (D-005) |

Lo escribe **el backend con el cliente admin** (`service_role`): los clientes solo lo leen. Los intentos se crean con `start_payment_attempt` y el resultado se registra con `settle_payment` (ver [funciones](funciones-y-triggers.md)). Cuando `status` pasa a `paid`, el trigger **`sync_order_on_payment`** pasa el pedido de `pending` a `paid`.

### Mapeo por pasarela

| `provider` | `provider_payment_id` | Al crear | Resultado → `status` |
|---|---|---|---|
| `webpay` | `token` de `create` | `pending` | `commit` con `response_code == 0` **y** `status == "AUTHORIZED"` → `paid` · cualquier otro → `failed` · `TBK_TOKEN` (abortado) o `TBK_ORDEN_COMPRA` sin token (timeout) → `failed` sin commit |
| `flow` | `token` de `payment/create` (y `flowOrder` en `raw_response`) | `pending` | `getStatus.status`: `2` → `paid` · `3` / `4` → `failed` · `1` → sigue `pending` |
| `transfer` | `reference` (`"1007-1"`) | `pending` | Un admin confirma la recepción → `paid`. Al vencer → `failed` + `cancel_order` |

> `authorized` solo tiene sentido con captura diferida (Webpay con otro código de comercio), que este proyecto no usa. `refunded` se usa cuando se hace un `refund` en la pasarela: desde la fase 6, automático para un pago aprobado sobre un pedido anulado o ya pagado (D-020). El pedido se marca `refunded` a mano o con otra acción.

## `payment_alerts` (fase 6)

Alertas para el admin (D-020). Las escribe el backend con `service_role`; el admin las lee y las resuelve (`resolved_at`). Sin diseño de administración: se consultan con el MCP o el Dashboard.

| Columna | Notas |
|---|---|
| `order_id` | `cascade` |
| `payment_id` | `set null` |
| `kind` | `paid_after_cancel` (B13) · `double_payment` · `amount_mismatch` · `refund_failed` (check) |
| `detail` | jsonb: respuesta de la pasarela, estado del pedido, error del reembolso |
| `resolved_at` | null = abierta (índice parcial `payment_alerts_open_idx`) |

## `coupons`

| Columna | Notas |
|---|---|
| `code` | Único sin importar mayúsculas (índice sobre `lower(code)`). El diseño lo muestra en MAYÚSCULAS |
| `discount_type` / `value` | `percentage` (1–100) o `fixed` (CLP). Con `fixed`, el descuento nunca supera el subtotal |
| `min_order_amount` | Se compara con el **subtotal** |
| `max_uses` / `used_count` | Límite global |
| `max_uses_per_user` | Se cuenta en `coupon_redemptions` |
| `starts_at` / `ends_at` | Vigencia (nullable) |
| `is_active` | |

**RLS: solo el admin puede leer cupones.** El cliente no puede validar un cupón desde el carro con su propio cliente de Supabase. Por eso existe `validate_coupon` (M3, `security definer`, solo `service_role`), que la Server Action `applyCoupon` llama con el cliente admin (ver [06-implementacion/carro.md](../06-implementacion/carro.md#cupón)).

Mensajes de `place_order` (se pueden mostrar al usuario): *Cupón no válido o expirado* · *Este cupón ya alcanzó su límite de usos* · *Ya usaste este cupón* · *El cupón requiere una compra mínima de N*.

## `coupon_redemptions`

(`coupon_id`, `user_id`, `order_id`), unique (`coupon_id`, `order_id`). La escribe `place_order` y la borra `cancel_order`, que además descuenta `used_count`.
