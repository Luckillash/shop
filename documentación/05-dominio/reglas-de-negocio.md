---
title: "Reglas de negocio"
description: "Precios, ofertas, despacho (zonas, tarifas, umbral de gratis, express, retiro), stock, cupones, cuenta e invitados, pagos, cambios y devoluciones, con el origen de cada regla y si ya está implementada."
keywords: ["reglas de negocio", "precio", "oferta", "despacho", "envío", "tarifas", "39990", "starken", "express", "retiro en tienda", "stock", "cupón", "devoluciones", "30 días", "transferencia", "48 horas", "IVA"]
related: ["05-dominio/ciclo-de-vida-del-pedido.md", "04-diseno/flujo-de-compra.md", "03-base-de-datos/funciones-y-triggers.md", "02-arquitectura/decisiones.md"]
source: ["_archivo/diseno-almacen.md §5.3", "03-base-de-datos/sql/ecommerce_schema.sql §11"]
estado: "definido (en diseño); implementación parcial en SQL"
---

# Reglas de negocio

> **Úsalo cuando:** calculas precios, despacho o descuentos, o validas stock o pagos. La columna "Dónde" dice si la regla ya está en el código o solo en el diseño.

Origen: **D** = diseño · **SQL** = `ecommerce_schema.sql` · **?** = falta decidirla.

## Precios

| Regla | Origen | Dónde |
|---|---|---|
| Precio de una variante = `coalesce(variant.price, product.base_price)` | SQL | `place_order`, `product_catalog` ✅ |
| Precio "desde" de un producto = el mínimo de sus variantes activas | SQL | `product_catalog.min_price` ✅ |
| En oferta si `compare_at_price > precio`. Se muestra el −N% (`round((1 − precio/compare) × 100)`) | D + SQL | `Price` ⏳ |
| Precios en CLP enteros, con IVA incluido | D | ✅ `orders.tax_total` = IVA incluido, informativo (D-012) |
| El precio nunca se esconde. El despacho se ve antes de pagar | D | ⏳ |
| El precio del pedido es el de la BD al momento de `place_order`, no el del carro del cliente | SQL | ✅ |

## Despacho

| Regla | Origen | Dónde |
|---|---|---|
| Transportista: **Starken**, a todo Chile continental | D | Solo en los textos |
| Región Metropolitana: **$3.990**, de 1 a 2 días hábiles | D | ✅ `place_order` (fecha: el día 2) |
| Regiones: **$6.990**, de 3 a 5 días hábiles | D | ✅ `place_order` (fecha: el día 5) |
| **Gratis desde $39.990**, medido sobre el subtotal **después del cupón** (dueño, D-011) | D | ✅ `place_order`, `/carro`, `FreeShippingBar` |
| **Express: $4.990** siempre (no aplica el gratis), **solo en la Región Metropolitana** (todas sus comunas). Llega al día hábil siguiente si se paga antes de las **14:00** de un día hábil | D + dueño | ✅ `place_order` (`hint: express_region`), `validateShipping`, `isExpressAvailable` |
| **Retiro en tienda Local Tajamar: gratis**, desde el día hábil siguiente (`STORE.pickup.readyInBusinessDays`). Horario e indicaciones en el checkout y en el pedido | D | ✅ `shipping_method = pickup` (D-014; Tajamar 223, Departamento 302, Las Condes) |
| Los días hábiles se cuentan **desde que se confirma el pago** | D | ✅ Fechas estimadas suponiendo el pago hoy: checkout y Ficha (`deliveryEstimate`; en la Ficha, con la comuna de la cookie `comuna_despacho`, B35) |
| Entrega entre 9:00 y 20:00. Si no hay nadie, segundo intento al día hábil siguiente; después, 5 días hábiles en la sucursal | D | Contenido |
| La dirección se puede cambiar mientras el pedido no haya salido (por correo a *hola@almacen.cl*) | D | Contenido |
| El drawer muestra solo el subtotal. El despacho se calcula en el checkout | D | ⏳ |
| El despacho lo calcula `place_order` (M2); `src/lib/checkout/shipping.ts` repite las reglas solo para mostrar | SQL | ✅ |

**Sin decidir:** nada en el despacho.

Reglas implementadas (`place_order` y `shippingCost`; feriados en `src/lib/chile/business-days.ts`):

```
si metodo = 'pickup'   → 0
si metodo = 'express'  → 4990 si region = 'Metropolitana de Santiago'; si no, se rechaza
si base >= 39990       → 0                       (base = subtotal − descuento)
si region = 'Metropolitana de Santiago' → 3990
si no                  → 6990
```

## Stock

| Regla | Origen | Dónde |
|---|---|---|
| Se vende por variante. El stock está en `product_variants.stock` | SQL | ✅ |
| Al crear el pedido se descuenta el stock (con bloqueo; no hay sobreventa) | SQL | `place_order` ✅ |
| Al anular el pedido el stock vuelve | SQL | `cancel_order` ✅ |
| La cantidad máxima en el carro es el stock disponible | D | `QuantityStepper max` ⏳ |
| Stock bajo → *Quedan N unidades de este color*. Umbral **?** (propuesta: ≤ 3) | D | ⏳ |
| Las variantes agotadas siguen visibles, pero no se pueden elegir. Un producto agotado muestra *Sin stock* | D | ⏳ |
| Un pedido pendiente retiene el stock hasta que se paga o vence | SQL + D | Falta el vencimiento (D-010) ⚠️ |

## Cupones

| Regla | Origen | Dónde |
|---|---|---|
| Se ingresa en el **carro** (*Aplicar cupón*). En el checkout solo se muestra | D | ✅ carro (fase 4): `validate_coupon` + `applyCoupon`, rate limiting por IP |
| El código no distingue mayúsculas | SQL | ✅ |
| `percentage` (1–100) o `fixed`. El `fixed` nunca supera el subtotal | SQL | ✅ |
| Compra mínima comparada con el subtotal | SQL | ✅ |
| Límite global y por usuario. Vigencia por fechas | SQL | ✅ |
| Un solo cupón por pedido | SQL | ✅ (un solo `coupon_id`) |
| El descuento porcentual debe redondearse a pesos enteros | Convención | ✅ en `validate_coupon` · ⚠️ `place_order` todavía redondea a 2 decimales (M2) |

## Cuenta

| Regla | Origen | Dónde |
|---|---|---|
| Se puede comprar como invitado. Crear cuenta se ofrece en el login y en la confirmación | D | ✅ sesión anónima (D-008; falta activarla en Supabase). En la Confirmación: fase 6 |
| Contraseña de al menos 8 caracteres | D | Configuración de Supabase Auth |
| Solo quien compró el producto puede reseñarlo. Una reseña por producto. Decisión 3 del dueño (27-10-2026): con el pedido **entregado**, sin invitados, firmada *Nombre · Comuna* | SQL | RLS ✅ (hoy desde `paid` y sin excluir anónimos; la 7.6 lo ajusta ⏳) |

## Pagos

| Regla | Origen | Dónde |
|---|---|---|
| Medios: Webpay Plus (tarjetas), Flow (otros medios), transferencia | D | ⏳ |
| Si el pago falla, el pedido **no se pierde**: se conservan los productos, la dirección y el despacho gratis, y se informa que no hubo cargo | D | Pedido `pending` + reintento ⏳ |
| La transferencia reserva el stock **48 horas** (fecha y hora exactas, en hora de Chile). Monto exacto, con el mensaje *Pedido N.º* | D | ⏳ |
| Si la transferencia no llega a tiempo → se liberan los productos y el pedido se anula sin costo | D | Cron + `cancel_order` ⏳ |
| La transferencia se confirma por correo en menos de un día hábil | D | Manual (admin) ⏳ |
| Un pago `paid` pasa el pedido `pending` a `paid` | SQL | Trigger ✅ |
| Webpay aprobado = `response_code == 0` **y** `status == "AUTHORIZED"` | Transbank | ⏳ |
| Flow pagado = `status == 2` | Flow | ⏳ |

## Postventa

| Regla | Origen |
|---|---|
| **Cambios y devoluciones en 30 días** desde que se recibe el pedido | D |
| Contacto: *hola@almacen.cl*, respuesta en menos de un día hábil | D |
| El reembolso de dinero se hace aparte con la pasarela (`cancel_order` no reembolsa) | SQL |

## Datos de la empresa (del diseño, por confirmar)

Almacén SpA · RUT 76.543.210-3 · hola@almacen.cl · pagos@almacen.cl · Banco de Chile, cuenta corriente 00-123-45678-09 · Tienda: Almacén Providencia.
