---
title: "Guía: catálogo, listado, ficha y búsqueda"
description: "Cómo implementar Inicio, Listado (filtros, orden y paginación en la URL), Ficha de producto (variantes, stock, galería) y Búsqueda (full-text en español + trigramas), con las consultas, la caché y los casos vacíos."
keywords: ["catálogo", "listado", "ficha", "producto", "búsqueda", "filtros", "orden", "paginación", "cargar más", "searchParams", "product_catalog", "search_vector", "pg_trgm", "websearch_to_tsquery", "generateStaticParams"]
related: ["03-base-de-datos/tablas-catalogo.md", "02-arquitectura/renderizado-y-cache.md", "04-diseno/templates.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql §4, §12", "_archivo/diseno-almacen.md §4.1, §4.3"]
estado: "vigente"
---

# Guía: catálogo y búsqueda

> **Úsalo cuando:** implementas Inicio, Listado, Ficha, Búsqueda, Sin resultados o la 404 (fase 3), o vas a cambiarlos.

## Implementación (fase 3, 2026-10-24) ✅

| Pantalla | Ruta | Archivos | Renderizado |
|---|---|---|---|
| Inicio | `/` | `src/app/(tienda)/page.tsx` | Todo cacheado: static shell (revalida cada minuto por el banner de ofertas) |
| Listado | `/categorias/[slug]`, `/novedades`, `/ofertas` | `src/components/catalog/listing.tsx` + `listing-controls.tsx` | `generateStaticParams` con las categorías. Cabecera en el shell; resultados en `<Suspense>` (leen `searchParams`) |
| Ficha | `/productos/[slug]` | `src/app/(tienda)/productos/[slug]/page.tsx`, `product-purchase.tsx`, `product-gallery.tsx` | `generateStaticParams` con todos los productos. El stock va en su propio `<Suspense>` (`cacheLife("seconds")`) |
| Búsqueda / Sin resultados | `/buscar?q=` | `src/app/(tienda)/buscar/page.tsx` | En `<Suspense>`. Sin `q`: buscador + búsquedas populares |
| 404 | cualquiera | `src/app/not-found.tsx` (con header y footer) y `src/app/(tienda)/not-found.tsx` (dentro del layout) → `not-found-content.tsx` | Estática |

- **Lógica pura con tests:** `src/lib/catalog/listing.ts` (searchParams ↔ filtros, `listingHref`), `variants.ts` (grupos de `VariantPicker`, disponibilidad, stock bajo) y `mappers.ts` (filas → `CatalogItem`, `numeric` → CLP entero, *Detalles*).
- **Listado:** filtros **Disponibilidad** (`?disponible=1`) y **Precio** (`?precio=hasta-15000|15000-30000|desde-30000`, rangos `[min, max)` sobre `min_price`); orden `?orden=`; *Cargar más* = enlace a `?pagina=N+1` que trae las páginas 1..N+1 juntas (`range(0, N·8−1)`, tope 20) sin mover el scroll. Los chips y el orden navegan con `router.push` dentro de una transición (los resultados se atenúan mientras tanto); *Cargar más* y *Limpiar filtros* son enlaces y funcionan sin JS. Desempate por `name` para que la paginación sea estable. **Tipo** y **Color** siguen esperando M5 (B17).
- **`/novedades`** lista todo con orden *Novedades* por defecto; **`/ofertas`**, los productos con `compare_at_price`.
- **Tarjetas:** `CatalogProductCard` (cliente) envuelve `ProductCard`. Con una variante agrega al carro y abre el drawer; con varias dice *Ver opciones* (D-017).
- **Ficha:** la isla `ProductPurchase` recibe las variantes (cacheadas con el producto) y el stock por separado. Mientras carga el stock, el botón dice *Revisando stock*. Elige por defecto la primera variante con stock; las agotadas se ven deshabilitadas (*(agotado)* para lectores de pantalla); con ≤ 3 unidades muestra *Quedan N unidades de este color*. *Agregar al carro* llama a `addItem(…, cantidad)` con la variante, la imagen y el stock como máximo, y abre el drawer del carro (fase 4, [carro.md](carro.md)). El favorito es solo local hasta la fase 5. La entrega muestra plazos por zona (B35). Metadata con título, descripción y `og:image`.
- **Imágenes:** `<img>` mientras sean placeholders SVG (D-015).
- **Búsqueda:** `searchProducts(q)` llama a la función `search_products` (D-016). La consulta se normaliza (espacios, largo 80, minúsculas) antes de cachearla.
- **Producto o categoría inexistente:** `notFound()` se llama dentro de `<Suspense>`, así que la respuesta es **200 con `noindex`** y la plantilla 404 (comportamiento documentado de Next). Las URL que no coinciden con ninguna ruta sí responden 404 (trampa 48).

Lo que sigue de esta guía es el diseño original de la fase; las diferencias con lo implementado están arriba.

## Consultas (`src/lib/catalog/queries.ts`)

Todas usan `createSupabasePublic()` (sin cookies) y `'use cache'`. Ver los tags en [renderizado-y-cache.md](../02-arquitectura/renderizado-y-cache.md#qué-se-cachea).

| Función | Consulta |
|---|---|
| `getCategories()` | `categories` activas, `order(sort_order)` |
| `getFeaturedProducts(limit)` | `product_catalog` con `is_featured = true` |
| `getNewProducts(limit)` | `product_catalog` `order(created_at desc)` |
| `listProducts({ categorySlug, sort, page, filters })` | `product_catalog` + `category_slug`, `range(from, to)`, `count: 'exact'` |
| `getProductBySlug(slug)` | `products` + `brands` + `product_images(order sort_order)` + `product_variants(is_active)` |
| `getVariantStock(productId)` | `product_variants` (`id`, `stock`): vida corta o sin caché |
| `getReviews(productId)` | `reviews` publicadas |
| `getRelatedProducts(categoryId, excludeId)` | `product_catalog` de la misma categoría |

## Listado

- **Estado en la URL:** `?orden=menor-precio&color=arena&pagina=2`. Así es compartible, funciona sin JS y sirve como clave de caché.
- Lee `searchParams` (async) en la página y pásalos ya normalizados a `listProducts`. Envuelve la grilla en `<Suspense>`.
- Orden:

| Opción del diseño | `?orden=` | SQL |
|---|---|---|
| Destacados | (por defecto) | `is_featured desc, created_at desc` |
| Menor precio | `menor-precio` | `min_price asc` |
| Mayor precio | `mayor-precio` | `min_price desc` |
| Novedades | `novedades` | `created_at desc` |
| Mejor evaluados | `mejor-evaluados` | `avg_rating desc nulls last, review_count desc` |

- Filtros: **Disponibilidad** → `total_stock > 0`; **Precio** → rangos sobre `min_price`. **Tipo** y **Color** no se pueden hacer con la vista actual (está en `attributes` de las variantes o en una subcategoría): necesitan la migración M5.
- *Mostrando 8 de 12* + *Cargar más productos*: paginación por `?pagina=` (página de 8 en el diseño). *Cargar más* puede ser un enlace a la página siguiente que conserve las anteriores, o una Server Action que devuelva más tarjetas.
- Cero resultados en una categoría: muestra *Limpiar filtros*. Cero resultados en la búsqueda: template *Sin resultados*.

## Ficha

- `params` es async: `const { slug } = await params`. Si no existe o está inactivo → `notFound()` (template 404).
- `generateStaticParams` con los productos destacados es opcional. Lee la guía de ISR con Cache Components antes de usarlo.
- Variantes: agrupa `attributes` por clave (`color`, `talla`) para `VariantPicker`. Las opciones sin stock van con `disabled`. Al elegir un color, filtra la galería por `product_images.variant_id`, si existe.
- El stock va en un componente aparte dentro de `<Suspense>` (stock bajo, máximo del stepper, *Sin stock*).
- *Agregar al carro* es una isla de cliente: `addItem` en Zustand → abre el drawer con `Notice success`.
- Bloque de entrega: fecha estimada según la comuna (si se conoce) y la regla de despacho gratis ([05-dominio/reglas-de-negocio.md](../05-dominio/reglas-de-negocio.md#despacho)).
- Detalles: desde `products.metadata` (material, capacidad, medidas, cuidado, origen) + SKU en mono.
- `Rating` solo si `review_count > 0`.
- Metadata de la página (`generateMetadata`): título del producto, descripción y `og:image` con la portada. Considera JSON-LD `Product` (hay una guía `json-ld.md` en la doc de Next).

## Búsqueda

```sql
-- Propuesta: función RPC para combinar full-text y trigramas
select p.*
  from public.product_catalog p
  join public.products pr on pr.id = p.id
 where pr.search_vector @@ websearch_to_tsquery('spanish', :q)
    or pr.name % :q                       -- pg_trgm: tolera errores de tipeo
 order by ts_rank(pr.search_vector, websearch_to_tsquery('spanish', :q)) desc,
          similarity(pr.name, :q) desc
 limit 24;
```

- Créala como función `search_products(q text)` con `security invoker` para respetar el RLS, o arma la consulta con `.textSearch('search_vector', q, { type: 'websearch', config: 'spanish' })` (en ese caso sin trigramas).
- El operador `%` y `similarity` están en el esquema `extensions` en Supabase: califícalos (`extensions.similarity`) o agrega `extensions` al `search_path` de la función.
- *Búsquedas populares* (chips) en Sin resultados: una lista fija por ahora. Opcional: contarlas en Redis.
