---
title: "Brechas entre el diseño, la base de datos y el código"
description: "Lista numerada de lo que el diseño muestra y el esquema o el código no soportan (o al revés), con su impacto y la solución propuesta. Es la lista de trabajo para alinear las tres capas."
keywords: ["brechas", "gaps", "inconsistencias", "pendientes", "diseño vs base de datos", "faltantes", "invitado", "despacho", "RUT", "email", "factura", "seed", "expires_at"]
related: ["02-arquitectura/decisiones.md", "03-base-de-datos/migraciones-y-seed.md", "06-implementacion/hoja-de-ruta.md"]
source: ["_archivo/diseno-almacen.md", "03-base-de-datos/sql/ecommerce_schema.sql", "03-base-de-datos/sql/ecommerce_seed.sql", "src/"]
estado: "vigente (revisado el 2026-10-24)"
---

# Brechas entre el diseño, la base de datos y el código

> **Úsalo cuando:** vas a implementar algo del diseño y quieres saber si los datos lo soportan. Cuando cierres una brecha, márcala ✅ con la fecha.

Impacto: 🔴 bloquea el flujo de compra · 🟠 se ve mal o los datos quedan incompletos · 🟢 menor.

## Checkout y pedidos

| # | Brecha | Impacto | Solución propuesta |
|---|---|---|---|
| B1 | ✅ 2026-10-24 · **Compra como invitado** en el diseño vs. `place_order`, que exige `auth.uid()` | — | Cerrada: sesión anónima con `startGuestCheckout` (D-008), activada en Supabase y verificada con el pedido 1004 |
| B2 | ✅ 2026-10-24 · No había **correo de contacto** en `orders` | — | Cerrada: M1 `orders.contact_email` |
| B3 | ✅ 2026-10-24 · **Despacho siempre en $0** (`v_shipping := 0`) | — | Cerrada: M2, despacho en `place_order` (D-011) |
| B4 | ✅ 2026-10-24 · No había **método de despacho** ni retiro en tienda | — | Cerrada: M1 `shipping_method` + la tienda en `shipping_address` (D-014) |
| B5 | Parcial (2026-10-24) · Los pedidos pendientes **vencen**, pero nadie los anula todavía | 🟠 | M1 `expires_at` ✅ (D-010). Falta el cron + M4 (fase 6) |
| B6 | ✅ 2026-10-24 · No había **RUT** del cliente | — | Cerrada: M1 `orders.customer_rut` |
| B7 | ✅ 2026-10-24 · No había **documento tributario** | — | Cerrada en datos: M1 `document_type` + `invoice_details`. La emisión (SII) sigue pendiente (D-012, fase 7) |
| B8 | ✅ 2026-10-24 · No había **medio de pago elegido** en `orders` | — | Cerrada: M1 `payment_method` |
| B9 | ✅ 2026-10-24 · El descuento porcentual se redondeaba a 2 decimales | — | Cerrada: M2, `place_order` redondea a pesos |
| B10 | ✅ 2026-10-24 · `tax_total` siempre 0 | — | Cerrada: M2, IVA incluido `round(total × 19 / 119)` (D-012) |
| B11 | ✅ 2026-10-24 · El cupón se aplica **en el carro**, pero el RLS no deja que los clientes lean `coupons` | — | Cerrada: M3 `validate_coupon` (solo `service_role`, D-019) + Server Action `applyCoupon` con rate limiting |
| B12 | ✅ 2026-10-24 · Vencimiento de tarjeta y Flow no definido (afecta *Tu pedido sigue guardado*) | — | Cerrada: 30 min Webpay/Flow, 48 h transferencia (D-010). El cron que los anula es de la fase 6 |
| B13 | ✅ 2026-10-25 · Un pago aprobado sobre un pedido ya `cancelled` no se manejaba | — | Cerrada: reembolso automático + alerta `paid_after_cancel` en `payment_alerts` (D-020). Pantalla *Te devolvimos el pago* y correo (textos propuestos, sin diseño). Verificado con Flow (pedido 1030) |
| B14 | ✅ 2026-10-25 · Pago **abortado en Webpay** (`TBK_TOKEN`) sin texto propio | — | Cerrada con textos **propuestos** en el template Pago rechazado: título *Tu pago no se completó*; abortado *Cancelaste el pago en Webpay Plus. No hicimos ningún cargo.*; tiempo agotado *Se acabó el tiempo para pagar en Webpay Plus. No hicimos ningún cargo.*; sin conexión *No pudimos conectar con Webpay Plus. Intenta de nuevo en unos minutos o elige otro medio de pago.* (`rejectionCopy` en `src/lib/payments/labels.ts`). ✅ Aprobados por el dueño (2026-10-25) |
| B37 | ✅ 2026-10-25 · Pantallas sin diseño de la fase 6: *Estamos confirmando tu pago* (Flow con `status` 1 o el retorno en curso), *Este pedido venció*, *Te devolvimos el pago* y *No encontramos ese pago* | — | Cerrada: textos propuestos (2026-10-25) con el layout de la Confirmación, aprobados por el dueño el mismo día |
| B38 | *Ver estado del pedido* (Confirmación y Transferencia pendiente) y el `Notice` *Crear cuenta* de la Confirmación no se muestran | 🟢 | Fase 7: Mis pedidos / Detalle de pedido y la conversión del invitado en cuenta (D-008, D-024) |
| B39 | La Confirmación dice *Te enviamos el detalle a …* y no *Te enviamos la boleta y el detalle* | 🟢 | No hay proveedor de boleta (D-012) y el correo depende de `RESEND_API_KEY` (D-022) |

## Catálogo

| # | Brecha | Impacto | Solución |
|---|---|---|---|
| B15 | ✅ 2026-10-23 · El **seed** era de otra tienda (ropa, calzado, electrónica) | — | Cerrada: seed de Almacén (M6) |
| B16 | ✅ 2026-10-23 · Las imágenes del seed eran de 800 × 800 (1:1) | — | Cerrada: placeholders 4:5 (M6) |
| B17 | Los filtros **Tipo** y **Color** del Listado no tienen soporte en `product_catalog`. La fase 3 implementó solo Disponibilidad y Precio | 🟠 | M5 |
| B18 | ✅ 2026-10-24 · El bloque *Detalles* de la Ficha no tenía columnas | — | Cerrada: se lee de `products.metadata` (`material`, `capacidad`, `medidas`, `duracion`, `cuidado`; `origen` va en la Descripción). `src/lib/catalog/mappers.ts` |
| B19 | ✅ 2026-10-24 · Umbral de "stock bajo" no definido | — | Cerrada: ≤ 3 (`LOW_STOCK_THRESHOLD` en `src/lib/catalog/variants.ts`). Confirmado por el dueño el 2026-10-24 |
| B20 | No hay `brand_slug` en la vista | 🟢 | M5 (no bloquea: no hay páginas de marca) |
| B33 | Las variantes guardan el **nombre** del color, pero no su código: `VariantPicker` necesita la muestra | 🟢 | Hoy: mapa fijo en `variants.ts` (6 colores del seed; los desconocidos se ven en `surface-sunken`). Con M5: `attributes.color_hex` o una tabla de colores |
| B34 | *Los más vendidos* del Inicio no tiene datos (no hay pedidos). **El cambio no es automático:** el Inicio siempre muestra *Destacados* | 🟢 | Hoy se muestra *Destacados* (`is_featured`, aprobado por el dueño el 2026-10-24). Con ventas: función `security definer` que devuelva solo ids de producto ordenados por unidades vendidas en pedidos pagados (el RLS no deja que `anon` lea `order_items`), cacheada con el tag `products`, y respaldo a *Destacados* si hay menos de 4 |
| B35 | ✅ 2026-10-25 · La Ficha no tenía **fecha de entrega** concreta | — | Cerrada: `DeliveryEstimate` (cliente) en el bloque de entrega de la Ficha lee la cookie `comuna_despacho` (región y comuna, validadas contra la lista oficial) y calcula *Llega el martes 27 de octubre a Providencia* con `deliveryEstimate` + el costo (`shippingCost`). La cookie la escribe `saveShipping` (paso Despacho) o el selector *Elige tu comuna* / *Cambiar comuna* (`CommunePicker`, desde el navegador). Sin comuna: plazos por zona. La Ficha sigue estática: la fecha se calcula en el navegador |
| B36 | Las *Opiniones* de la Ficha son de solo lectura: no hay formulario para publicar una reseña | 🟢 | Fase 7 (requiere un pedido pagado, por RLS) |

## Cuenta

| # | Brecha | Impacto | Solución |
|---|---|---|---|
| B21 | *Recibir novedades* (opción al crear cuenta) y la suscripción del footer no tienen tabla | 🟢 | Tabla `newsletter_subscribers`, o un proveedor externo |
| B22 | `profiles` sin RUT | 🟢 | Opcional: `profiles.rut` para autocompletar el checkout |
| B23 | Los favoritos de invitados no están definidos | 🟢 | Pedir que ingrese |
| B24 | Mis pedidos: los estados `cancelled` y `refunded` no tenían `Badge` en el diseño | 🟢 | 🔄 El canvas de la fase 7 los define (*Anulado* `danger` + `close`, *Reembolsado* `neutral` + `returns`, con el motivo en una línea). Badges en `customerStatusBadge` (`src/lib/orders/order-status.ts`, 7.0, 2026-10-25); la línea de cada estado va en la 7.1 |
| B25 | Las fechas de entrega estimadas no se guardan (el diseño las muestra en Mis pedidos y en Detalle) | 🟢 | ✅ 2026-10-25 (7.0) · Se calculan sin columna nueva: `estimatedDelivery()` desde `paid_at` (o `placed_at`) con los plazos por zona, la misma función que usa la Confirmación (D-025). Se muestran en la 7.1 y en `AdminPedido` |

## Código vs. diseño

| # | Brecha | Impacto | Solución |
|---|---|---|---|
| B26 | ✅ 2026-10-23 · `layout.tsx`: `lang="en"`, fuentes Geist, metadata "Create Next App" | — | Cerrada en la fase 0 |
| B27 | ✅ 2026-10-23 · `globals.css`: variables de la plantilla, no los tokens | — | Cerrada en la fase 0 |
| B28 | ✅ 2026-10-24 · `CartItem` de Zustand sin imagen, variante, `compareAt` ni máximo | — | Cerrada: `CartItem` con `variantId`, `variantName`, `image`, `compareAt`, `maxQuantity`, `slug`; `setQuantity`; `persist` v1 con `migrate` ([carro.md](../06-implementacion/carro.md)) |
| B29 | ✅ 2026-10-23 · El design system era de React 18 con un bundle global | — | Cerrada: portado a `src/components/ui/` (D-006) |
| B30 | ✅ 2026-10-23 · No había componente `Select` | — | Cerrada: `src/components/ui/select.tsx` |
| B31 | ✅ 2026-10-24 · No había listas de regiones, comunas ni feriados | — | Cerrada: `src/lib/chile/regions.ts` (16 regiones, 346 comunas; sin Isla de Pascua, Juan Fernández ni Antártica) y `business-days.ts` (feriados 2026–2027, verificados el 24-10-2026). Hay que agregar cada año |
| B32 | ✅ 2026-10-23 · `.env.example` ignorado por `.gitignore` | — | Cerrada: `!.env.example` |

## Sin diseño ni datos

Correos transaccionales · emisión de boleta o factura (SII) · integración con Starken (seguimiento) · panel de administración · toast de producto agregado · páginas de Direcciones, Favoritos y Datos personales.
