---
title: "Glosario: términos del negocio, del diseño y del código"
description: "Equivalencias entre los términos en español de Chile (UI y negocio), los identificadores del código y la base de datos, y los términos de las pasarelas de pago."
keywords: ["glosario", "términos", "vocabulario", "carro", "despacho", "boleta", "factura", "comuna", "RUT", "giro", "razón social", "buy_order", "token_ws", "flowOrder", "SKU", "variante"]
related: ["04-diseno/principios-voz-y-accesibilidad.md", "05-dominio/formatos-chile.md"]
source: ["_archivo/diseno-almacen.md", "03-base-de-datos/sql/ecommerce_schema.sql"]
estado: "vigente"
---

# Glosario

> **Úsalo cuando:** no sabes cómo se llama algo en el código, o qué significa un término chileno o de una pasarela.

## Negocio e interfaz → código

| En la UI (es-CL) | En el código / BD | Notas |
|---|---|---|
| Carro | `cart`, `carts`, `cart_items`, `useCartStore` | Nunca "carrito" en la UI |
| Producto | `products` | |
| Variante (color, talla) | `product_variants`, `attributes` | Todo se vende por variante. "Única" si no hay opciones |
| SKU | `product_variants.sku` | Se muestra en mono |
| Marca | `brands` | Estilo `overline` |
| Categoría | `categories` | |
| Favoritos | `wishlist_items` | Por producto |
| Opiniones, valoración | `reviews`, `rating` | |
| Pedido, N.º de pedido | `orders`, `order_number` (desde 1001) | El `id` (uuid) va en la URL |
| Despacho | `shipping_*` | Nunca "envío" en la UI, salvo en textos legales |
| Despacho express | `shipping_method = 'express'` (propuesto) | |
| Retiro en tienda | `shipping_method = 'pickup'` (propuesto) | |
| Comuna | `addresses.city` | Unidad administrativa (346 en Chile) |
| Región | `addresses.region` | 16 regiones |
| RUT | `customer_rut` (propuesto) | Rol Único Tributario, con dígito verificador |
| Boleta | `document_type = 'boleta'` (propuesto) | Comprobante para personas |
| Factura | `document_type = 'factura'` (propuesto) | Para empresas: razón social, RUT, giro |
| Razón social | — | Nombre legal de la empresa |
| Giro | — | Actividad económica registrada en el SII |
| SII | — | Servicio de Impuestos Internos |
| Cupón | `coupons`, `coupon_redemptions` | Código en MAYÚSCULAS en la UI |
| Pago pendiente | `orders.status = 'pending'` | |
| En preparación | `paid` / `processing` | |
| En camino | `shipped` | |
| Entregado | `delivered` | |
| Transferencia | `provider = 'transfer'` | Reserva de 48 h |
| Días hábiles | — | De lunes a viernes, sin feriados |
| IVA | `tax_total` | 19%, incluido en los precios |
| CLP | `currency = 'CLP'` | Peso chileno, sin decimales |

## Pasarelas

| Término | Pasarela | Significado |
|---|---|---|
| Webpay Plus | Transbank | Pago con tarjeta por redirección |
| `buy_order` | Webpay | Orden de compra del comercio (≤ 26, única) → `<order_number>-<n>` |
| `session_id` | Webpay | Identificador de sesión del comercio → `orderId` |
| `token_ws` | Webpay | Token de la transacción. Se envía por POST a la `url` y vuelve en el retorno |
| `TBK_TOKEN` | Webpay | Aparece en el retorno cuando el pago se abortó → no se hace commit |
| `TBK_ORDEN_COMPRA` | Webpay | Aparece solo en un timeout |
| Commit | Webpay | Confirmación obligatoria de la transacción (`PUT`) |
| `response_code` / `status` | Webpay | `0` y `AUTHORIZED` = aprobada |
| `payment_type_code` | Webpay | `VD` débito, `VN` crédito, etc. |
| Código de comercio | Transbank | `Tbk-Api-Key-Id` (integración: `597055555532`) |
| `commerceOrder` | Flow | Orden del comercio, única → `<order_number>-<n>` |
| `flowOrder` | Flow | Número de orden asignado por Flow |
| `token` | Flow | Identificador del pago. Llega en `urlConfirmation` y `urlReturn` |
| `urlConfirmation` | Flow | Callback servidor a servidor (200 en < 15 s) |
| `urlReturn` | Flow | Adonde vuelve el navegador |
| `s` | Flow | Firma HMAC-SHA256 de los parámetros |
| `status` 1/2/3/4 | Flow | Pendiente / pagada / rechazada / anulada |

## Técnicos del proyecto

| Término | Significado |
|---|---|
| Cache Components | Modelo de caché de Next 16 (`cacheComponents: true`): `'use cache'` + `<Suspense>` |
| Static shell | La parte de la página prerenderizada que se envía de inmediato |
| Proxy | Ex middleware de Next.js (`src/proxy.ts`) |
| RLS | Row Level Security de PostgreSQL |
| RPC | Función de PostgreSQL llamada con `supabase.rpc()` |
| `service_role` | Llave de Supabase que salta RLS |
| Sesión anónima | Usuario de Supabase sin credenciales (`signInAnonymously`), para los invitados |
| Artifact | Página de claude.ai donde vive el diseño |
