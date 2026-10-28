---
title: "Tablas del catálogo: categorías, marcas, productos, variantes, imágenes, inventario y reseñas"
description: "Columnas, restricciones e índices de categories, brands, products, product_variants, product_images, inventory_movements y reviews, con su uso en las pantallas."
keywords: ["categories", "brands", "products", "product_variants", "product_images", "inventory_movements", "reviews", "slug", "sku", "stock", "compare_at_price", "base_price", "attributes", "metadata", "search_vector"]
related: ["03-base-de-datos/modelo-de-datos.md", "06-implementacion/catalogo-y-busqueda.md", "03-base-de-datos/seguridad-rls.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql §4, §8, §12"]
estado: "definido"
---

# Tablas del catálogo

> **Úsalo cuando:** consultas o modificas productos, variantes, stock, imágenes o reseñas.

## `categories`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `parent_id` | uuid → `categories` | `on delete set null`. Árbol de un nivel o más |
| `name` | text | Lo que se muestra |
| `slug` | text **unique** | Va en la URL `/categorias/[slug]` |
| `description`, `image_url` | text | La imagen se usa en *Explora por categoría* (4:5) |
| `sort_order` | int (0) | Orden del menú |
| `is_active` | bool (true) | Las inactivas solo las ve el admin |

## `brands`

`id`, `name`, `slug` **unique**, `logo_url`. Lectura pública. En la tarjeta y en la Ficha se muestra como `overline` (mayúsculas).

## `products`

| Columna | Tipo | Notas |
|---|---|---|
| `category_id`, `brand_id` | uuid | `set null` |
| `name` | text | |
| `slug` | text **unique** | `/productos/[slug]` |
| `description` | text | Máximo 70 caracteres por línea al mostrarla (diseño) |
| `base_price` | numeric(12,2) ≥ 0 | Precio si la variante no define uno |
| `compare_at_price` | numeric(12,2) ≥ 0, nullable | Precio "antes". Si es mayor que el precio, el producto está **en oferta** (`Price` con `compareAt`) |
| `currency` | char(3) | `'CLP'` |
| `is_active` | bool | Visible en la tienda |
| `is_featured` | bool | Sale en el Inicio |
| `metadata` | jsonb | Propuesta para el bloque *Detalles* de la Ficha: `{"material":"Gres","capacidad":"350 ml","medidas":"…","cuidado":"…","origen":"…"}` |
| `search_vector` | tsvector generado | `spanish`: `name` (A) + `description` (B). Índice GIN |

Índices: `category_id`, `brand_id`, GIN `search_vector`, GIN trigram `name`.

## `product_variants`

Todo producto se vende **a través de una variante**. Un producto sin opciones tiene una sola variante llamada `Única`.

| Columna | Tipo | Notas |
|---|---|---|
| `product_id` | uuid | `cascade` |
| `sku` | text **unique** | Se muestra con el estilo `sku` (mono) |
| `name` | text (`'Única'`) | Lo que muestra `CartItem` como variante (`"M / Negro"`) |
| `attributes` | jsonb | `{"talla":"M","color":"Negro"}`. Las claves están en español. `VariantPicker` usa `type: "size"` para `talla` y `type: "color"` para `color` |
| `price` | numeric(12,2), nullable | `null` = usa `products.base_price` |
| `stock` | int ≥ 0 | Fuente de verdad del stock. **Lo descuenta `place_order`** y lo devuelve `cancel_order` |
| `weight_grams` | int | Para calcular el despacho en el futuro |
| `is_active` | bool | Las inactivas no se venden |

Precio efectivo: **`coalesce(variant.price, product.base_price)`**.

Reglas del diseño ligadas al stock:

- `QuantityStepper max = stock`.
- Stock bajo → `Badge warning` *Quedan N unidades de este color*. El umbral no está definido; propuesta: `stock <= 3`.
- Variante sin stock → visible pero deshabilitada en `VariantPicker`. Producto con `total_stock = 0` → *Sin stock* en la tarjeta.

## `product_images`

| Columna | Notas |
|---|---|
| `product_id` | `cascade` |
| `variant_id` | Opcional (`set null`). Permite cambiar la galería al elegir un color |
| `url` | URL pública. Si está en Storage: bucket `product-images` |
| `alt` | Describe el producto (color, material). No escribas "foto de producto" |
| `sort_order` | La 0 es la portada (`product_catalog.cover_image`) |

El diseño pide imágenes en **4:5** de al menos 1200 × 1500 px. El seed usa placeholders de `placehold.co` en 1200 × 1500.

## `inventory_movements`

Es el libro de movimientos del stock. Solo lo usa el admin (RLS).

| Columna | Notas |
|---|---|
| `variant_id` | `cascade` |
| `quantity` | ≠ 0. Positivo = entrada, negativo = salida |
| `reason` | `restock` · `sale` (lo escribe `place_order`) · `return` · `cancellation` (lo escribe `cancel_order`) · `adjustment` |
| `order_id` | FK a `orders`, que se agrega después de crear `orders` |
| `created_by` | `profiles.id` o null |

> No hay un trigger que sincronice `product_variants.stock` con la suma de los movimientos. Quien registre un `restock` o un `adjustment` debe **actualizar los dos** en la misma transacción.

## `reviews`

| Columna | Notas |
|---|---|
| `product_id`, `user_id` | **unique** juntos: una reseña por usuario y producto (el trigger `set_review_author` lo dice antes con *Ya publicaste una opinión de este producto…*). `user_id` tiene default `auth.uid()` (M11): el cliente no lo escribe |
| `rating` | smallint 1–5 |
| `title` | Opcional, de 1 a 80 caracteres (check `reviews_title_length`, M11) |
| `body` | Obligatorio, de 20 a 2000 caracteres sin los espacios de los bordes (check `reviews_body_length`, M11) |
| `author_name`, `author_commune` | M11 (7.6, D-031): la firma *Nombre · Comuna*. Las llena el trigger `set_review_author` al insertar (nombre como `greetingName`; comuna del pedido entregado más reciente con el producto, `null` en el retiro). El cliente no puede escribirlas. Quedan las del momento de publicar |
| `is_published` | true por defecto. El trigger `guard_review_publication` impide que un cliente la cambie: solo el admin puede ocultarla |

RLS (M11): solo puede crearla una cuenta no anónima con un pedido **`delivered`** que tenga el producto (decisiones 3a y 3c). Grant por columna: el cliente inserta solo `product_id`, `rating`, `title` y `body`, y actualiza solo `rating`, `title` y `body`. La Ficha muestra las 10 más recientes con su firma (`getReviews`) y el promedio y total de `product_catalog`.
