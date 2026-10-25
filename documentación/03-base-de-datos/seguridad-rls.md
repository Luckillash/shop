---
title: "Seguridad: Row Level Security y Storage"
description: "Matriz de permisos por tabla y rol (anon, customer, admin, service_role), las políticas de RLS del esquema y las del bucket product-images."
keywords: ["RLS", "row level security", "políticas", "policies", "permisos", "anon", "authenticated", "admin", "service_role", "storage", "bucket", "product-images"]
related: ["02-arquitectura/autenticacion-y-autorizacion.md", "03-base-de-datos/funciones-y-triggers.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql §9, §13, §14"]
estado: "definido"
---

# Seguridad: RLS y Storage

> **Úsalo cuando:** una consulta devuelve vacío o falla por permisos, o vas a agregar una tabla o política.

Las 17 tablas tienen RLS activado. **Sin una política que lo permita, no se puede acceder**: una consulta del cliente devuelve 0 filas, sin error. Si ves resultados vacíos inesperados, revisa esta tabla antes de buscar un bug en el código.

## Matriz de permisos

L = lectura · E = escritura (insert/update/delete) · "propio" = `user_id = auth.uid()`.

| Tabla | `anon` | `customer` | `admin` | Notas |
|---|---|---|---|---|
| `profiles` | — | L/update propio | L/update todos | No hay `insert` (lo hace el trigger) |
| `addresses` | — | L/E propias | L todas | |
| `categories` | L activas | L activas | L/E todas | |
| `brands` | L | L | L/E | |
| `products` | L activos | L activos | L/E | |
| `product_variants` | L activas | L activas | L/E | |
| `product_images` | L | L | L/E | |
| `inventory_movements` | — | — | L/E | `place_order` y `cancel_order` escriben como `security definer` |
| `carts` | — | L/E propio | — | |
| `cart_items` | — | L/E de su carro | — | |
| `wishlist_items` | — | L/E propios | — | |
| `coupons` | — | **—** | L/E | Se validan solo dentro de `place_order` |
| `coupon_redemptions` | — | — | L | |
| `orders` | — | L propios | L/update | **Nadie inserta directamente**: solo `place_order` |
| `order_items` | — | L de sus pedidos | L | |
| `payments` | — | L de sus pedidos | L/E | El backend escribe con `service_role` (`start_payment_attempt`, `settle_payment`) |
| `payment_alerts` | — | — | L / actualiza (`resolved_at`) | Fase 6. El backend inserta con `service_role` |
| `reviews` | L publicadas | L publicadas + propias · insert si compró · update/delete propias | todo | `guard_review_publication` protege `is_published` |

`service_role` salta RLS en todas las tablas.

## Patrones usados

- `(select auth.uid())` y `(select public.is_admin())` entre paréntesis con `select`: Postgres los evalúa una vez por consulta, no por fila (recomendación de rendimiento de Supabase).
- Las políticas de `cart_items`, `order_items` y `payments` usan `exists (…)` contra la tabla padre para comprobar el dueño.
- Las funciones `security definer` llevan `set search_path = ''`.
- **Una sola política permisiva por rol y acción.** La gestión del admin se escribe como políticas `insert`/`update`/`delete` separadas (por ejemplo, `categories: admin inserta`), no como `FOR ALL`. Si fuera `FOR ALL`, se sumaría a la política de lectura y Postgres evaluaría las dos en cada `SELECT` (aviso *multiple_permissive_policies* del advisor). En `addresses` hay una sola política de lectura (`dueño o admin lee`) y tres de escritura solo para el dueño.
- **Permisos de funciones:** las funciones de trigger `security definer` (`handle_new_user`, `sync_order_on_payment`) no tienen `EXECUTE` para `anon` ni `authenticated`, así que no se pueden llamar como RPC. `is_admin` sí lo tiene, porque las políticas la llaman también para `anon`. `place_order` y `cancel_order` solo para `authenticated` y `service_role`. `validate_coupon` solo para `service_role` (D-019): con `EXECUTE` para `anon`, cualquiera podría probar códigos por `/rest/v1/rpc` sin el rate limiting de la app.

### Avisos aceptados del advisor de seguridad

| Aviso | Por qué se acepta |
|---|---|
| `is_admin()` ejecutable por `anon` y `authenticated` | Las políticas de lectura del catálogo la llaman para `anon`; sin `EXECUTE`, el catálogo fallaría. Solo devuelve `true`/`false` del propio usuario |
| `place_order` y `cancel_order` ejecutables por `authenticated` | Son la API del checkout. Validan el dueño y el estado por dentro |

## Storage

Bucket **`product-images`**: público, máximo **5 MB** por archivo, tipos `image/jpeg`, `image/png`, `image/webp` y `image/avif`.

| Operación | Quién |
|---|---|
| Leer | Cualquiera (bucket público, por URL) |
| Subir, editar, borrar | Solo `admin` |

URL pública: `https://<project>.supabase.co/storage/v1/object/public/product-images/<ruta>`. Para usarla con `next/image`, agrega el host a `images.remotePatterns` en `next.config.ts` (`images.domains` está deprecado en Next 16).

## Al agregar una tabla

1. `alter table … enable row level security;`
2. Políticas explícitas por rol y operación, con `(select auth.uid())`.
3. Si guarda datos de un usuario, una política de "dueño" y una de admin.
4. Trigger `set_updated_at` si tiene `updated_at`.
5. Revisa los advisors de seguridad con el MCP `supabase` (`get_advisors`).
6. Actualiza esta matriz.

## Usuarios anónimos (fase 5, D-008)

Con los inicios anónimos activados, los invitados usan el rol `authenticated` (con `is_anonymous = true` en el JWT), así que **todas las políticas de `authenticated` también los cubren**. El advisor `auth_allow_anonymous_sign_ins` (lint 0012) lo avisa en 19 tablas; es esperado:

- Políticas de dueño (`addresses`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `profiles`, `wishlist_items`): las necesita el invitado para comprar y ver su pedido.
- Políticas de admin: usan `is_admin()`; un anónimo no es admin.
- ⏳ **`reviews`**: un invitado que compró podría escribir una reseña. Decidir en la fase 7 si se exige `(auth.jwt() ->> 'is_anonymous')::boolean is not true`.

