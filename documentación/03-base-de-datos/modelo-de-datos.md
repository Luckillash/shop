---
title: "Modelo de datos: visión general y relaciones"
description: "Las 17 tablas del esquema de Supabase agrupadas por dominio, el diagrama de relaciones, los tipos enum, la vista product_catalog y las convenciones del esquema."
keywords: ["modelo de datos", "ER", "relaciones", "tablas", "esquema", "supabase", "postgres", "enum", "product_catalog", "uuid", "snapshot", "jsonb"]
related: ["03-base-de-datos/tablas-catalogo.md", "03-base-de-datos/tablas-usuarios-y-carrito.md", "03-base-de-datos/tablas-pedidos-y-pagos.md", "03-base-de-datos/funciones-y-triggers.md", "03-base-de-datos/seguridad-rls.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql"]
estado: "definido (SQL escrito; no se ha verificado si está aplicado en Supabase)"
---

# Modelo de datos

> **Úsalo cuando:** necesitas entender el esquema completo o encontrar la tabla de un concepto. Para ver las columnas, abre el archivo del dominio.

**Fuente de verdad:** [`sql/ecommerce_schema.sql`](sql/ecommerce_schema.sql), para Supabase con PostgreSQL 15+. Es idempotente (`if not exists`, `drop … if exists`, `on conflict do nothing`). No se ha confirmado si ya está ejecutado en el proyecto `nswchmyzgcutyehhuche`: verifícalo con el MCP `supabase` (`list_tables`).

## Tablas por dominio

| Dominio | Tablas | Archivo |
|---|---|---|
| Usuarios | `profiles`, `addresses` | [tablas-usuarios-y-carrito.md](tablas-usuarios-y-carrito.md) |
| Catálogo | `categories`, `brands`, `products`, `product_variants`, `product_images`, `inventory_movements` + vista `product_catalog` | [tablas-catalogo.md](tablas-catalogo.md) |
| Carro y favoritos | `carts`, `cart_items`, `wishlist_items` | [tablas-usuarios-y-carrito.md](tablas-usuarios-y-carrito.md) |
| Cupones | `coupons`, `coupon_redemptions` | [tablas-pedidos-y-pagos.md](tablas-pedidos-y-pagos.md) |
| Pedidos y pagos | `orders`, `order_items`, `payments` | [tablas-pedidos-y-pagos.md](tablas-pedidos-y-pagos.md) |
| Opiniones | `reviews` | [tablas-catalogo.md](tablas-catalogo.md) |

## Diagrama de relaciones

```
auth.users 1─1 profiles ─┬─1:N─ addresses
                         ├─1:1─ carts ─1:N─ cart_items ─N:1─┐
                         ├─1:N─ wishlist_items ─N:1─┐       │
                         ├─1:N─ reviews ─N:1────────┤       │
                         ├─1:N─ orders (user_id, set null)  │
                         └─1:N─ inventory_movements.created_by
                                                    │       │
categories (parent_id ↺) ─1:N─┐                     ▼       ▼
brands ──────────────────1:N──┴─ products ─1:N─ product_variants ─1:N─ inventory_movements
                                   │  └─1:N─ product_images (variant_id opcional)  │
                                   │                                               │ order_id
coupons ─1:N─ coupon_redemptions ─N:1─ orders ─1:N─ order_items ─N:1 (set null)─ products / variants
   └───────────1:N (coupon_id)──────────┘  └─1:N─ payments
```

- **`on delete cascade`:** los hijos "propios": direcciones, carro, variantes, imágenes, ítems de pedido, pagos.
- **`on delete set null`:** referencias históricas: `orders.user_id`, `order_items.product_id/variant_id`, `orders.coupon_id`, `products.category_id/brand_id`. Así el pedido sobrevive aunque se borre el producto o el usuario.

## Tipos enum

| Tipo | Valores | Detalle |
|---|---|---|
| `user_role` | `customer`, `admin` | [seguridad-rls.md](seguridad-rls.md) |
| `order_status` | `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` | [05-dominio/ciclo-de-vida-del-pedido.md](../05-dominio/ciclo-de-vida-del-pedido.md) |
| `payment_status` | `pending`, `authorized`, `paid`, `failed`, `refunded` | ídem |
| `discount_type` | `percentage`, `fixed` | [tablas-pedidos-y-pagos.md](tablas-pedidos-y-pagos.md#coupons) |
| `inventory_reason` | `restock`, `sale`, `return`, `cancellation`, `adjustment` | [tablas-catalogo.md](tablas-catalogo.md#inventory_movements) |

## Convenciones del esquema

- Las claves primarias son `uuid` (`gen_random_uuid()`), salvo `profiles.id` = `auth.users.id`, y `wishlist_items`, que tiene una PK compuesta.
- `orders.order_number` es un `bigint identity` que **empieza en 1001**: es el número visible (*Pedido N.º 1001*).
- Todas las tablas tienen `created_at`. Las que cambian tienen además `updated_at`, que mantiene el trigger `set_updated_at`.
- Montos en `numeric(12,2)` con `check (>= 0)`. Moneda en `char(3)`, por defecto `'CLP'`. La app usa enteros ([convenciones](../01-fundamentos/convenciones-de-codigo.md#dinero)).
- **Snapshots:** `orders.shipping_address` (jsonb) y `order_items.product_name/variant_name/sku/unit_price` copian los datos al momento de comprar. Editar el catálogo no cambia los pedidos.
- `jsonb` libre: `products.metadata` (detalles de la ficha: material, medidas, cuidado…), `product_variants.attributes` (`{"talla":"M","color":"Negro"}`) y `payments.raw_response` (respuesta completa de la pasarela).
- Funciones con `set search_path = ''` y nombres totalmente calificados (`public.tabla`): es la práctica recomendada por Supabase.
- Búsqueda: `products.search_vector` (generado, diccionario `spanish`: nombre con peso A, descripción con peso B) + `pg_trgm` sobre `name`.

## Vista `product_catalog`

Es la vista de lectura para listados y tarjetas. Usa `security_invoker = true`, así que respeta el RLS de quien consulta, y solo trae `products.is_active`.

| Columna | Origen |
|---|---|
| `id`, `slug`, `name`, `description`, `base_price`, `compare_at_price`, `currency`, `is_featured`, `category_id`, `created_at` | `products` |
| `category_slug`, `category_name` | `categories` |
| `brand_name` | `brands` |
| `min_price` | `min(coalesce(variant.price, base_price))` de las variantes activas → precio "desde" |
| `total_stock` | Suma del stock de las variantes activas (`0` = *Sin stock*) |
| `cover_image` | Primera imagen por `sort_order` |
| `avg_rating` (1 decimal), `review_count` | Reseñas publicadas |

> No tiene `brand_slug`, ni datos de color o tipo para los filtros del Listado, ni un descuento calculado. Si los necesitas, extiende la vista con una migración (ver [migraciones-y-seed.md](migraciones-y-seed.md)).

## Lo que el esquema **no** tiene todavía

Correo de contacto del pedido, RUT, método de despacho, documento tributario, vencimiento de la reserva, método de pago elegido, intentos de pago. Ver [07-referencia/brechas-diseno-vs-datos.md](../07-referencia/brechas-diseno-vs-datos.md).
