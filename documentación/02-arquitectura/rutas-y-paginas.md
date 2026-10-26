---
title: "Mapa de rutas: URL → template → datos → renderizado"
description: "Las rutas propuestas de la tienda, con el template de diseño que implementa cada una, de dónde salen sus datos, si requieren sesión y cómo se renderizan con Cache Components."
keywords: ["rutas", "URL", "páginas", "templates", "slug", "checkout", "retorno", "confirmación", "cuenta", "404", "renderizado", "suspense"]
related: ["02-arquitectura/estructura-de-carpetas.md", "02-arquitectura/renderizado-y-cache.md", "04-diseno/templates.md", "04-diseno/flujo-de-compra.md"]
source: ["_archivo/diseno-almacen.md §4-§5", "03-base-de-datos/sql/ecommerce_schema.sql"]
estado: "propuesta"
---

# Mapa de rutas

> **Úsalo cuando:** vas a crear una página y necesitas su URL, su template, sus datos y su estrategia de renderizado.

Las URL están en español. Existen `/api/health` y, desde la fase 3 (2026-10-24), `/`, `/categorias/[slug]`, `/novedades`, `/ofertas`, `/buscar` y `/productos/[slug]` ([guía del catálogo](../06-implementacion/catalogo-y-busqueda.md#implementación-fase-3-2026-10-24-)).

## Tienda

| URL | Template (`04-diseno/templates.md`) | Datos | Sesión | Renderizado |
|---|---|---|---|---|
| `/` | Inicio | `product_catalog` (`is_featured`, `created_at desc`), `categories` | No | Shell estático + datos con `'use cache'` |
| `/categorias/[slug]` | Listado | `categories` por `slug` + `product_catalog` filtrado | No | Lee `searchParams` (filtros, orden, página) dentro de `<Suspense>`. La consulta se cachea por argumentos |
| `/novedades`, `/ofertas` | Listado | `product_catalog` por `created_at` / con `compare_at_price` | No | Igual que el Listado |
| `/buscar?q=` | Listado o Sin resultados | `products.search_vector` (`spanish`) + `pg_trgm` sobre `name` | No | `searchParams` dentro de `<Suspense>` |
| `/productos/[slug]` | Ficha de producto | `products`, `product_variants`, `product_images`, `reviews`, relacionados | No (los favoritos sí) | Producto cacheado con tag `product:<slug>`. El stock puede ir en un `<Suspense>` aparte con vida corta |
| `/carro` | Carro / Carro vacío | Zustand, validado con `refreshCart` (precios y stock de la BD, sin caché). Cupón con `applyCoupon` | No | ✅ Estática (○): `CartView` es de cliente; los recomendados (`getFeaturedProducts`, `getNewProducts`) están cacheados. `noindex` |
| (drawer) | Carro · drawer | Zustand | No | ✅ `CartDrawer` (`<dialog>`) en el layout `(tienda)`. Lo abre *Agregar al carro* |
| `/ingresar` | Ingresar o crear cuenta | Supabase Auth | No | ✅ Formularios con Server Actions; `?volver=` (solo rutas internas, `safeNext`) |
| `/ingresar/recuperar` | (sin template) *¿Olvidaste tu contraseña?* | Supabase Auth | No | ✅ Pide el correo; `?error=enlace` si el enlace venció |
| `/ingresar/nueva-contrasena` | (sin template) Contraseña nueva | Supabase Auth | Sí (sesión de recuperación) | ✅ Destino del enlace del correo, después de `/auth/confirm` |
| `/ayuda/[slug]` | Página de contenido | Contenido estático (MDX o TS) | No | Estático |

## Checkout y pago (layout reducido)

| URL | Template | Datos | Sesión | Notas |
|---|---|---|---|---|
| `/checkout` | Checkout (pasos Contacto → Despacho → Pago) + estados de error y procesando | `addresses`, carro, costo de despacho | **Sí** (normal o anónima) | ✅ Un solo URL con los pasos en el estado. *Pagar* → `placeOrder` → Webpay (formulario POST con `token_ws`), Flow (`redirect` a `url?token=`) o `/pedido/[id]/transferencia`. Mientras tanto, *Volver al carro* sin enlace |
| `/pedido/[id]` | Confirmación · *Estamos confirmando tu pago* · *Este pedido venció* · *Te devolvimos el pago* | `orders` + `order_items` + `payments` | Sí (dueño, por RLS; también el invitado) | ✅ Fase 6. `[id]` es el `uuid` del pedido (no adivinable). La pantalla sale de `orderScreen` (`src/lib/payments/screen.ts`); rechazado y transferencia redirigen a su URL. Vacía el carro del navegador una vez por pedido con el pago aprobado. **7.2 (D-027):** a un invitado dueño del pedido le muestra *Guarda tus datos para la próxima compra* (`createGuestAccount`) o, si ya la pidió, *Revisa tu correo para terminar*; con cuenta, *Ver estado del pedido* → `/cuenta/pedidos/<n>` (B38) |
| `/pedido/[id]/pago-rechazado` | Pago rechazado (Webpay) / no completado (Flow) | Pedido + último intento | Sí | ✅ Fase 6. El caso (Webpay o Flow) y la causa (rechazado, abortado, tiempo agotado, sin conexión) salen del último intento. *Reintentar pago* / *Pagar* / *Ver datos para transferir* crean un intento nuevo para el **mismo** pedido (`retryPayment`) |
| `/pedido/[id]/transferencia` | Transferencia pendiente | Pedido + fecha límite + datos bancarios | Sí | ✅ Fase 6. Datos bancarios en `BANK_*` (reales). *Copiar*, *Pagar con tarjeta en su lugar*. Vacía el carro del navegador. *Ver estado del pedido* (ghost) solo con cuenta (7.2, B38) |
| `/pedido/no-encontrado` | *No encontramos ese pago* (sin diseño) | — | No | ✅ Fase 6. Estática. Destino de los retornos con un token u orden que no son de la tienda |

## Entradas de pasarelas (Route Handlers)

| URL | Método | Quién llama | Qué hace |
|---|---|---|---|
| `/api/pagos/webpay/retorno` | **GET y POST** (✅ fase 6, todas responden 303) | El navegador, al volver de Webpay | Lee `token_ws` / `TBK_TOKEN` / `TBK_ORDEN_COMPRA` → `commit` o anulación del intento → 303 a `/pedido/[id]` o a `/pedido/[id]/pago-rechazado` |
| `/api/pagos/flow/confirmacion` | POST | **Servidor de Flow** (`urlConfirmation`) | Lee `token` → `payment/getStatus` → actualiza `payments` → responde 200 en < 15 s |
| `/api/pagos/flow/retorno` | POST (y GET por si acaso) | El navegador (`urlReturn`) | Lee `token` → `getStatus` → 303 al resultado |
| `/api/pagos/flow/reembolso` | POST | **Servidor de Flow** (`urlCallBack` de `refund/create`) | Lee `token` → `refund/getStatus` → lo guarda en el intento; si se rechazó, alerta `refund_failed` |
| `/api/cron/expirar-pedidos` | GET/POST con `Authorization: Bearer CRON_SECRET` | Vercel Cron cada 10 min (D-021) | Consulta la pasarela de los intentos pendientes (recupera los pagados) y anula el resto con `cancel_order`. Responde `{ checked, cancelled, recovered, skipped }` |
| `/api/health` | GET | Monitoreo | ✅ Existe. PING a Redis |

Detalle en [06-implementacion/pagos-webpay-plus.md](../06-implementacion/pagos-webpay-plus.md) y [06-implementacion/pagos-flow.md](../06-implementacion/pagos-flow.md).

## Cuenta

| URL | Template | Datos |
|---|---|---|
| `/cuenta` | ✅ 7.1: redirige a `/cuenta/pedidos` (layout con el menú: *Hola, <nombre>*, *Mis pedidos*, *Cerrar sesión*; el resto llega en la 7.5, D-026) | — |
| `/auth/confirm` | (Route Handler) enlace de confirmación del correo → `?volver=` o `/ingresar?error=confirmacion` | Supabase Auth |
| `/cuenta/pedidos` | ✅ 7.1 · Mis pedidos (+ estado vacío sin diseño) | `orders` del usuario (`user_id`, `placed_at desc`, hasta 50) + ítems con la foto del producto + intentos de pago. Contenido en `<Suspense>`; sin sesión no anónima → Ingresar |
| `/cuenta/pedidos/[orderNumber]` | ✅ 7.1 · Detalle de pedido | `orders` por `order_number` y `user_id`, `order_items`, `payments`. El proxy da el código HTTP en la carga directa: sin sesión → redirect a Ingresar, pedido ajeno o inexistente → **404** (trampa 75) |
| `/cuenta/direcciones` | ⏳ 7.5 · Direcciones | `addresses` |
| `/cuenta/favoritos` | ⏳ 7.5 · Favoritos (el corazón del header ya enlaza aquí: 404 hasta entonces) | `wishlist_items` + `product_catalog` |
| `/cuenta/datos` | ⏳ 7.5 · Datos personales | `profiles` |

Todas requieren sesión **no anónima** (un invitado va a Ingresar, D-026). Cada página verifica la sesión; en el Detalle, además, el proxy lo comprueba antes del render para que el código HTTP sea real (D-026). La redirección optimista de todo `/cuenta/*` en el proxy sigue como opcional (7.8).

## Errores

| Archivo | Template |
|---|---|
| `src/app/not-found.tsx` | Página no encontrada (404) |
| `error.tsx` por grupo | Sin template. Usa `Notice danger` con un texto que ayude a resolver |
