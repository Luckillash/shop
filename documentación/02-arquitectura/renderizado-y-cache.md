---
title: "Renderizado y caché (Cache Components) y el rol de Redis"
description: "Qué se cachea con 'use cache', qué perfil cacheLife usar, la convención de tags, quién invalida cada tag, cómo tratar los datos por usuario y para qué usar Redis."
keywords: ["cache", "use cache", "use cache: private", "cacheLife", "cacheTag", "revalidateTag", "updateTag", "suspense", "static shell", "redis", "rate limit", "idempotencia", "lock"]
related: ["01-fundamentos/stack-y-versiones.md", "02-arquitectura/rutas-y-paginas.md", "02-arquitectura/decisiones.md"]
source: ["next.config.ts", "node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md", "node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md", "node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md", "src/lib/redis.ts"]
estado: "propuesta"
---

# Renderizado y caché

> **Úsalo cuando:** escribes una consulta o una página y debes decidir si se cachea, por cuánto tiempo y cómo se invalida.

## Modelo (con `cacheComponents: true`)

- Por defecto **nada se cachea**: todo se ejecuta en cada request.
- Lo marcado con `'use cache'` (una función o un componente) entra en el **static shell** y se puede prefetchear.
- Lo que no está cacheado y es async (consultas, `cookies()`, `headers()`, `searchParams`, `params`) va dentro de **`<Suspense>`**. Si no, el overlay de desarrollo muestra el aviso *blocking-route*.
- Dentro de `'use cache'` **no se puede** llamar a `cookies()`/`headers()`. Por eso **el catálogo se consulta con el cliente anónimo de Supabase** (sin cookies), y lo que depende del usuario no se cachea en el servidor, o usa `'use cache: private'`.
- Acompaña cada `'use cache'` con un `cacheLife(...)`. Sin él se aplica el perfil `default`.

## Qué se cachea

| Datos | Función sugerida | `cacheLife` | Tags | Notas |
|---|---|---|---|---|
| Árbol de categorías | `getCategories()` | `days` | `categories` | Cambia poco |
| Productos destacados y nuevos (Inicio) | `getFeaturedProducts()`, `getNewProducts()` | `hours` | `products` | |
| *Los más vendidos* (Inicio, 7.7) | `getBestSellers(since, 4)` → `rpc('best_selling_products')` con `createSupabaseAdmin()` + `getProductsByIds(ids)` | `hours` | `products` | `since` sale de `BEST_SELLERS_SINCE` (D-032): sin ella devuelve `[]` sin consultar. Si falla, `[]` y un `console.error`. Ningún pago lo invalida: se pone al día con la revalidación de 1 h |
| Listado por categoría y filtros | `listProducts({ category, filters, sort, page })` | `minutes` | `products`, `category:<slug>` | Los argumentos forman la clave. Normaliza el orden de los filtros para no fragmentar la caché |
| Ficha de producto | `getProductBySlug(slug)` | `hours` | `products`, `product:<slug>` | Sin stock. El stock se lee aparte |
| Stock de las variantes | `getVariantStock(productId)` | `seconds` o sin caché | `stock:<productId>` | Es lo que más cambia. Va en su propio `<Suspense>` |
| Reseñas publicadas | `getReviews(productId)` | `hours` | `reviews:<productId>` | Las 10 más recientes con su firma (M11) y el promedio y total de `product_catalog` (7.6) |
| Búsqueda | `searchProducts(q)` | `minutes` | `products` | No pongas datos personales en la clave |
| Carro, pedidos, direcciones, perfil | — | **No se cachean en el servidor** | — | Dependen de la sesión. Si hace falta, `'use cache: private'` |

## Quién invalida

| Evento | Llamada | Dónde |
|---|---|---|
| Un admin edita un producto o una variante | `revalidateTag('product:<slug>', 'max')` + `revalidateTag('products', 'max')` | Server Action de administración (no existe) |
| Se crea un pedido (baja el stock) | `revalidateTag('stock:<productId>', 'max')` por cada producto del pedido | Acción de checkout, después de `place_order` |
| Se anula un pedido (vuelve el stock) | Lo mismo | Cron de expiración / `cancel_order` |
| El usuario publica o edita una reseña y debe verla de inmediato | `updateTag('reviews:<productId>')` + `refresh()`, y `revalidateTag('products', 'max')` para el promedio de los listados (D-031) | `publishReview` (`src/lib/reviews/actions.ts`; `updateTag` **solo** funciona en una Server Action) |
| Se paga un pedido (cambia el ranking de *Los más vendidos*) | **Nada** (D-032): `getBestSellers` se revalida cada hora. Invalidar `products` en cada pago vaciaría todo el catálogo; desde un webhook o el cron solo podría ser `revalidateTag` | — |
| Cambio masivo del catálogo (seed, importación) | `revalidateTag('products', 'max')` y `revalidateTag('categories', 'max')` | Route Handler protegido o script |

Reglas:

- `revalidateTag` **siempre con dos argumentos** (`'max'` = stale-while-revalidate).
- Para que el usuario vea su propio cambio en el mismo request: `updateTag`. Para refrescar el router desde una acción: `refresh()`.
- Los tags y argumentos se guardan en texto plano: **no** uses correos, RUT ni tokens.

## Rol de Redis

Redis se usa en `/api/health`, para el **rate limiting** (desde la fase 4, `src/lib/rate-limit.ts`) y, desde la fase 6, para los **locks de pago** (`src/lib/payments/lock.ts`). D-005 ✅ en [decisiones.md](decisiones.md). Todo es **fail-open**: Redis no corre en local, y la garantía de los pagos la da el lock de la BD (`claim_payment`, columna `payments.confirming_until`).

| Uso | Clave | Operación | Por qué Redis |
|---|---|---|---|
| **Lock de confirmación de pago** | `lock:pay:<provider>:<token>` | `SET … NX EX 60` antes del `commit` o `getStatus`, y `DEL` al terminar | ✅ Fase 6. El retorno de Webpay puede llegar dos veces (doble clic, recarga) y el `commit` no es idempotente: el segundo falla. Flow puede repetir `urlConfirmation`. Ocupado → redirige a *Estamos confirmando tu pago*; sin Redis → sigue con `claim_payment` |
| **Rate limiting** | `rl:<acción>:<ip|user>` | `INCR` + `EXPIRE` (ventana fija), fail-open con timeout de 500 ms | ✅ Aplicar cupón (`rl:coupon:<ip>`), login, crear cuenta, invitado, crear pedido (`rl:order:<user>`) y reintentar el pago (`rl:payment:<user>`, 20 por hora). Propuesto: newsletter |
| Datos de un intento de pago | `pay:<token>` → `{orderId, paymentId}` con TTL | `SET EX 900` | Es opcional: lo mismo está en `payments.provider_payment_id` |
| Caché remota de `'use cache: remote'` | — | Cache handler | Solo si se despliega en varias instancias. Lee la doc de `use cache: remote` antes |

**No uses Redis** como fuente de verdad del stock, del carro ni de los pedidos. Eso está en PostgreSQL.

`getRedis()` (`src/lib/redis.ts`) mantiene una sola conexión por proceso, guardada en `globalThis`. Si falla, la siguiente llamada reintenta. Es `server-only`.
