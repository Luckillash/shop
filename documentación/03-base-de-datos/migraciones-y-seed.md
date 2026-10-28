---
title: "Aplicar el esquema, migraciones y datos de ejemplo"
description: "Cómo ejecutar el esquema y el seed en Supabase, la convención para nuevas migraciones, las migraciones pendientes que exige el diseño, cómo generar tipos de TypeScript y los problemas del seed actual."
keywords: ["migraciones", "seed", "aplicar esquema", "SQL editor", "apply_migration", "generate_typescript_types", "tipos", "idempotente", "pendientes"]
related: ["03-base-de-datos/modelo-de-datos.md", "07-referencia/brechas-diseno-vs-datos.md", "06-implementacion/integrar-supabase.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql", "03-base-de-datos/sql/ecommerce_seed.sql", "_archivo/avance-del-proyecto.md §3.8, §6"]
estado: "vigente"
---

# Aplicar el esquema, migraciones y seed

> **Úsalo cuando:** vas a crear la base de datos, cambiar el esquema o cargar datos de prueba.

## Archivos

| Archivo | Contenido | Orden |
|---|---|---|
| [`sql/ecommerce_schema.sql`](sql/ecommerce_schema.sql) | Extensión `pg_trgm`, enums, tablas, índices, triggers, RPC, vista, RLS y Storage. Incluye las correcciones de los advisors del 2026-10-23 | 1 |
| [`sql/ecommerce_seed.sql`](sql/ecommerce_seed.sql) | Seed de **Almacén**: **borra el catálogo y los cupones** y carga 4 categorías, 4 marcas, 12 productos, 20 variantes (4 con stock bajo y 1 agotada), 12 imágenes 4:5 y 2 cupones. Aborta si hay pedidos | 2 (opcional, solo desarrollo) |

## Aplicar

- **Con el MCP `supabase`** (recomendado para agentes): `apply_migration` con el contenido del archivo y un nombre (`ecommerce_schema`, `ecommerce_seed`). Después, `list_tables` para comprobar y `get_advisors` (security y performance).
- **A mano:** Supabase Dashboard → SQL Editor → pegar → Run.

El esquema es **idempotente**, así que se puede volver a ejecutar. Pero `create or replace function` reemplaza las funciones: si alguien las cambió en el dashboard, esos cambios se pierden.

> Antes de aplicar en un proyecto que ya tiene datos, pide confirmación. El MCP permite ejecutar SQL arbitrario en la base real.

## Convención para nuevas migraciones

- Un archivo por cambio en `sql/`, con fecha y nombre: `sql/2026-10-24_orders_checkout_fields.sql`.
- Idempotente: `add column if not exists`, `create index if not exists`, `drop policy if exists` + `create policy`.
- Si cambias `place_order`, ojo: **su firma cambia**. Haz `drop function if exists public.place_order(uuid, text, text);` antes de crear la nueva, y actualiza los `revoke`/`grant`.
- Actualiza la documentación de `03-base-de-datos/` en el mismo cambio y anótalo en [08-estado/registro-de-cambios.md](../08-estado/registro-de-cambios.md).
- Después de cada migración, regenera los tipos (abajo).

## Tipos de TypeScript

Con el MCP `supabase`: `generate_typescript_types` → guarda el resultado en `src/types/database.ts` y úsalo con `createServerClient<Database>(…)`.

## Migraciones pendientes que exige el diseño

Están ordenadas por prioridad. Detalle y motivo en [07-referencia/brechas-diseno-vs-datos.md](../07-referencia/brechas-diseno-vs-datos.md).

| # | Cambio | Para qué |
|---|---|---|
| M1 | ✅ (2026-10-24) `orders`: `contact_email text`, `customer_rut text`, `shipping_method text` (`standard` · `express` · `pickup`), `payment_method text` (`webpay` · `flow` · `transfer`), `document_type text` (`boleta` · `factura`), `expires_at timestamptz`, más `invoice_details jsonb` y checks. Aplicada con `execute_sql` del MCP (ver la nota abajo) y agregada a `ecommerce_schema.sql` §7 | Datos del checkout, retiro en tienda y vencimiento |
| M2 | ✅ (2026-10-24) `place_order`: parámetros nuevos (firma vieja borrada), cálculo del despacho (tarifas del diseño), descuento redondeado a 0 decimales en CLP, `expires_at` según el medio de pago, IVA incluido y errores con `hint`. En `ecommerce_schema.sql` §11 y `src/types/database.ts` | Totales correctos y reserva |
| M3 | ✅ Función `validate_coupon(p_code text, p_subtotal numeric, p_user_id uuid = null)`, `security definer`, solo `service_role` (D-019): aplicada con el MCP el 2026-10-24 (migración `validate_coupon`) y agregada a `ecommerce_schema.sql` §11 | Aplicar el cupón en el carro sin exponer la tabla `coupons` |
| M4 | ✅ (2026-10-25) Índice `orders_pending_expires_idx` (`status, expires_at`) `where status = 'pending'`. Junto con los intentos de pago de la fase 6: `payments.attempt`, `reference` y `confirming_until`, la tabla `payment_alerts` y las funciones `start_payment_attempt`, `claim_payment` y `settle_payment`. Aplicada con `apply_migration` como `payments_attempts_m4` (funcionó a la primera). Archivo `sql/2026-10-25_payments_attempts.sql` y `ecommerce_schema.sql` §7, §11 y §13 | Cron de vencimiento, intentos `<order_number>-<n>` (D-013, D-023), idempotencia (D-005) y B13 (D-020) |
| M5 | Extender `product_catalog` con `brand_slug` y atributos para los filtros (color, tipo) | Filtros del Listado |
| M6 | ✅ Seed de **Almacén** (Cerámica, Textiles, Velas y aromas, Cocina; imágenes 4:5): aplicado el 2026-10-23 y unificado en `ecommerce_seed.sql` | — |
| M7 | ✅ Función `search_products(q text, max_results int)` (D-016): aplicada con el MCP el 2026-10-24 (migraciones `search_products`, `search_products_fallback`, `search_products_tiebreak`) y agregada a `ecommerce_schema.sql` §12 | Búsqueda |
| M8 | ✅ (2026-10-25, fase 7.0) `orders.cancel_reason` (`vencio` · `tienda` · `cliente`) y `cancel_note`; tabla `order_events` con RLS (solo el admin lee) y el trigger `log_order_event`; `cancel_order(p_order_id, p_reason, p_note)` (firma vieja borrada). Aplicada con `apply_migration` como `order_events_m8` + `order_events_m8_kind_pending` (agrega `pending` a los tipos de evento: sin él, un `update` de vuelta a `pending` fallaba). Archivo `sql/2026-10-25_order_events.sql` y `ecommerce_schema.sql` §7, §10, §11 y §13. Probada en transacciones revertidas: eventos y actor, motivo inválido, cliente sin acceso. En el plan de la fase 7 figuraba como "M7", número que ya era de `search_products` | Historial del pedido (AdminPedido) y motivo de anulación (CorreoAnulacion) |
| M9 | ✅ (2026-10-27, fase 7.4) Acciones de la administración (D-029): `admin_act_as` (comprueba que el id sea admin y fija `shop.actor_id`), `admin_confirm_transfer` (`settle_payment(…, 'paid', …)` sobre el intento de transferencia pendiente, con el N.º de operación en el intento y en el evento `paid`), `admin_advance_order` (`paid → processing → shipped → delivered`, con `carrier` y `tracking_number` al enviar), `admin_cancel_order` (intentos pendientes a `failed` y `cancel_order(…, 'tienda', nota)`), `admin_mark_refunded` (anulado → reembolsado; con `p_manual` la transferencia devuelta a mano, decisión 5) y `admin_resolve_alert`. Todas `security definer`, `search_path = ''`, solo `service_role`, y vuelven a validar el estado esperado (`hint`: `forbidden`, `not_found`, `stale`, `transition`). Tipos de evento nuevos en `order_events`: `refund` y `alert_resolved`. Aplicada con `apply_migration` como `admin_actions_m9`. Archivo `sql/2026-10-27_admin_actions.sql` y `ecommerce_schema.sql` (§7 y §11). Advisors sin avisos nuevos. Probada en transacciones revertidas (actor admin, cliente rechazado, estado desactualizado) y de punta a punta | AdminPedido, AdminAnularPedido, AdminAlertas |
| M10 | ✅ (2026-10-27, fase 7.5) Datos personales, RUT y novedades en `profiles` (D-030, decisiones 7a y 7b): columnas `first_name`, `last_name`, `rut` (check de formato `12345678-5`; el dígito verificador lo valida la app) y `newsletter_opt_in_at`; check del celular en E.164 y de largo de los nombres; trigger `stamp_newsletter_opt_in` (desde un cliente, la fecha es `now()` al activar y se conserva mientras siga activa); `handle_new_user` copia *Recibir novedades* de los metadatos de Crear cuenta; copia de `user_metadata.newsletter = true` con la fecha de creación de la cuenta (2 cuentas al 27-10-2026; 1 en `false` y 4 sin dato quedaron vacías); `grant update` por columna a `authenticated` (solo las editables: el cliente ya no puede escribir `role` ni las fechas). Aplicada con `apply_migration` como `profile_fields_m10`. Archivo `sql/2026-10-27_profile_fields.sql` y `ecommerce_schema.sql` (§3, triggers y RLS). Advisors sin avisos nuevos. Probada en una transacción revertida con la sesión de un cliente (fecha puesta por la BD, se conserva, se vacía; `role` y `created_at` → *permission denied*; RUT y teléfono mal formados → check) y de punta a punta | Direcciones, Favoritos, Datos personales, Crear cuenta, checkout |
| M11 | ✅ (2026-10-28, fase 7.6) Reseñas con firma (D-031, decisiones 3a, 3b y 3c): política `reviews: compradores crean` con `status = 'delivered'` y sin sesión anónima; columnas `author_name` y `author_commune` llenadas por el trigger `security definer` `set_review_author` (también rechaza la segunda reseña con un mensaje claro); `user_id` con default `auth.uid()`; checks del título (1–80), la opinión (20–2000) y la firma (≤ 80); grant por columna (insert: `product_id`, `rating`, `title`, `body`; update: `rating`, `title`, `body`); sin `insert`/`update`/`delete` para `anon`. Aplicada con `apply_migration` como `reviews_m11` y `reviews_m11_duplicate_message`. Archivo `sql/2026-10-28_reviews_m11.sql` y `ecommerce_schema.sql` (§5 y RLS). Advisors sin avisos nuevos. Probada simulando cada rol en transacciones revertidas y de punta a punta | Ficha (opiniones), Escribe tu opinión |
| M12 | ✅ (2026-10-28, fase 7.7) *Los más vendidos* (D-032, B34): función `best_selling_products(p_since, p_limit = 4, p_window_days = 90)`, `security invoker`, `search_path = ''`, que devuelve solo `product_id` y `units` de pedidos `paid`/`processing`/`shipped`/`delivered` pagados desde `p_since` y en la ventana, solo productos activos con stock. `EXECUTE` solo para `service_role` (revocado a `public`, `anon` y `authenticated`). Aplicada con `apply_migration` como `best_selling_products_m12`. Archivo `sql/2026-10-28_best_sellers_m12.sql` y `ecommerce_schema.sql` (§12, junto a `search_products`). Tipos regenerados. Advisors sin avisos nuevos. Probada con `service_role` y simulando `anon` y `authenticated` (*permission denied*) | Inicio |

> **Nota (M1 + M2):** `apply_migration` del MCP falló dos veces con *Invalid or expired requestState* (trampa 46) y se aplicó con `execute_sql`. Después, el mismo día, se registró en el historial con `apply_migration` como `orders_checkout_fields_place_order_v2` (versión `20261025022852`): el SQL actual de `ecommerce_schema.sql` (M1 + M2 + retiro + express solo RM), idempotente, sin cambio de comportamiento. `list_migrations` ya la muestra.

## Contenido del seed (Almacén)

| Categoría | Marca | Productos (precio base) |
|---|---|---|
| Cerámica | Cerámica del Sur | Taza de gres esmaltado ($12.490, destacado) · Plato hondo de gres ($14.990) · Fuente ovalada para horno ($27.990, antes $34.990) · Florero de greda ($19.990) |
| Textiles | Telar Andino | Manta de lana tejida ($39.990, antes $52.990, destacado) · Cojín de lino ($16.990, antes $21.990) · Set de paños de cocina ($9.990) |
| Velas y aromas | Cera Viva | Vela de soya en frasco ($11.990, destacado) · Difusor de varillas ($18.990) |
| Cocina | Mesa Larga | Tabla de raulí para picar ($24.990, destacado; la Grande cuesta $32.990) · Set de cucharas de madera ($12.990, antes $15.990) · Frasco de vidrio con tapa ($7.990; el de 2 L cuesta $10.990) |

Casos de prueba que trae:

- **Agotada:** Taza de gres · Terracota (`CER-TAZ-TER`, stock 0).
- **Stock bajo (≤ 3):** Taza · Verde pino (2), Florero (3), Cojín · Oliva (1), Tabla · Grande (3).
- **Ofertas** (`compare_at_price`): Fuente, Manta, Cojín y Cucharas.
- **Precio por variante** (`price` no nulo): Tabla Grande y Frasco de 2 L.
- `attributes` con `color`, `aroma`, `talla` o `capacidad`. `metadata` con material, medidas, cuidado y origen (bloque *Detalles* de la Ficha).
- Las imágenes son placeholders 4:5 de `placehold.co` (1200 × 1500). No hay reseñas.

Notas:

- Cupones: `BIENVENIDA10` (10%, 1 uso por usuario) y `DESCUENTO5000` ($5.000 sobre $30.000). Con `BIENVENIDA10`, la Taza da un descuento de $1.249,00; con montos que no terminan en 0 el porcentaje puede dar decimales (ver la trampa del redondeo).
- Después de cambiar datos del catálogo directamente en la BD, la caché de Next (`'use cache'`) sigue sirviendo los datos anteriores hasta que vence o se invalida su tag. En desarrollo: borra `.next` y vuelve a compilar (ver la trampa 47).
- No crea usuarios, direcciones ni pedidos. Para probar el checkout, regístrate (el trigger crea el `profile` y el `cart`) y agrega una dirección.
- Para tener un admin: `update public.profiles set role = 'admin' where id = '<uuid>';` con el SQL editor o con `service_role` (el trigger `protect_profile_role` lo permite porque `auth.uid()` es null).
