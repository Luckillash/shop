---
title: "Guía: checkout y creación del pedido"
description: "Implementación del checkout en 3 pasos con Server Actions: sesión (o sesión anónima), validación de Contacto y Despacho, cálculo del despacho, place_order, creación del intento de pago y redirección a Webpay, Flow o la transferencia."
keywords: ["checkout", "server action", "place_order", "pedido", "validación", "useActionState", "contacto", "despacho", "pago", "redirect", "buy_order", "intento de pago", "invitado"]
related: ["04-diseno/flujo-de-compra.md", "03-base-de-datos/funciones-y-triggers.md", "06-implementacion/pagos-webpay-plus.md", "06-implementacion/pagos-flow.md", "06-implementacion/pago-transferencia.md"]
source: ["_archivo/diseno-almacen.md §5.2, §5.4", "03-base-de-datos/sql/ecommerce_schema.sql §11", "node_modules/next/dist/docs/01-app/02-guides/forms.md"]
estado: "vigente (fases 5 y 6)"
---

# Guía: checkout y pedido

> **Úsalo cuando:** implementas `/checkout` (fase 5) o cambias cómo se crea un pedido.

## Implementado (fase 5, 2026-10-24)

| Pieza | Archivo |
|---|---|
| Página: sin sesión muestra *Ingresar* / *Continuar como invitado*; con sesión, los 3 pasos. Lee la sesión y la dirección guardada dentro de `<Suspense>` | `src/app/(checkout)/checkout/page.tsx` |
| Pasos (cliente): `CheckoutView` (paso actual, `refreshCart` al entrar, carro vacío → `/carro`), `ContactStep`, `ShippingStep`, `PaymentStep`, `CheckoutSummary` (lateral en escritorio, plegado en móvil), `ErrorSummary`, `StepIndicator`, `OptionGroup` | `src/components/checkout/` |
| Acciones: `saveContact`, `saveShipping` (inserta o actualiza `addresses`; la primera queda `is_default`), `placeOrder` (valida los 3 pasos otra vez → rate limiting por usuario → `syncUserCart` → `place_order` → `revalidateTag` del stock → redirección a `/pedido/<id>`) | `src/lib/checkout/actions.ts` |
| Validación compartida (cliente al salir del campo, servidor al enviar) con los textos de [estados-y-mensajes](../04-diseno/estados-y-mensajes.md#errores-de-formulario) | `src/lib/checkout/validation.ts` |
| Costo y fecha de despacho para mostrar (el monto real lo calcula `place_order`) | `src/lib/checkout/shipping.ts`, `src/lib/chile/` |
| Errores de `place_order` → `Notice` (por `hint`; stock y cupón devuelven el carro corregido) | `src/lib/checkout/order-errors.ts` |
| Pedido creado (provisoria hasta la fase 6): número, aviso *Falta el pago* con el vencimiento, entrega y detalle | `src/app/(checkout)/pedido/[id]/page.tsx` |

Notas:

- Si el stock recortó alguna línea al sincronizar, `placeOrder` **no crea el pedido**: devuelve el carro corregido (trampa 61).
- El carro del cliente **no se vacía** al crear el pedido (se vaciará con el pago aprobado o la transferencia, fase 6).
- Pendiente para la fase 6: `startWebpay` / `startFlow` / transferencia, `retryPayment` y la línea *Te estamos llevando a Webpay Plus…* (hoy: *Estamos creando tu pedido…*). También *Volver al carro* sin enlace mientras se paga (el header está en el layout).

**Requisitos previos:** las migraciones M1 y M2 (campos del pedido, despacho y redondeo), la sesión anónima (D-008), el carro con `variantId` y `src/lib/format/`.

## Estructura

- `src/app/(checkout)/checkout/page.tsx`: Server Component que lee la sesión dentro de `<Suspense>`. Sin sesión → crea una anónima (con una Server Action, porque un Server Component no puede escribir cookies) o muestra *Ingresar / comprar como invitado*. Carro vacío → redirige a `/carro`.
- Un formulario por paso, cada uno con su Server Action y `useActionState` para devolver los errores por campo.
- `src/lib/checkout/actions.ts`: `saveContact`, `saveShipping`, `placeOrderAndPay`, `retryPayment`.

## Paso 1 · Contacto (`saveContact`)
- Valida el correo. Guárdalo en una cookie firmada o en el estado del checkout. Se persiste en `orders.contact_email` cuando se crea el pedido.

## Paso 2 · Despacho (`saveShipping`)
1. Valida en el servidor (no confíes solo en la validación del cliente):
   - nombre, apellido, `isValidRut`, teléfono, región, comuna, calle **con número**;
   - método: `standard` | `express` | `pickup`.
2. Si hay errores, devuelve `{ errors: { campo: mensaje }, count }` → el `Notice danger` *Revisa N datos para continuar* con enlaces `#campo`. Los mensajes están en [04-diseno/estados-y-mensajes.md](../04-diseno/estados-y-mensajes.md#errores-de-formulario).
3. Si está bien: `insert`/`update` en `addresses` (cliente usuario; RLS = dueño) y devuelve el `addressId`, el costo del despacho y la fecha estimada para el resumen.

## Paso 3 · Pago (`placeOrderAndPay`)

```
1. claims = getClaims()                      → sin sesión: error
2. validar: medio ∈ {webpay, flow, transfer}, documento (boleta | factura + razón social, RUT, giro), términos aceptados
3. syncCart(items del cliente)               → reemplaza cart_items
4. orderId = rpc('place_order', { p_shipping_address_id, p_coupon_code, p_shipping_method, p_contact_email, ... })
     error → mapear el mensaje (stock, cupón) a un Notice; no se creó nada
5. revalidateTag('stock:<productId>', 'max') por cada producto
6. según el medio:
     webpay   → startWebpay(orderId)   → { url, token }  → el cliente envía un <form method="post"> con token_ws
     flow     → startFlow(orderId)     → redirect(url + '?token=' + token)
     transfer → registrar payments('transfer','pending') → redirect('/pedido/<id>/transferencia')
```

- `startWebpay` y `startFlow` leen el **total desde `orders`** con el cliente admin (después de verificar que `orders.user_id = user.id`). Nunca uses un monto que mande el cliente.
- Intento de pago: `buy_order` / `commerceOrder` = `` `${order_number}-${n}` `` (D-013). Inserta `payments` (`pending`, `provider_payment_id = token`) **después** de recibir el token.
- Si la pasarela falla (error de red o 4xx/5xx), el pedido queda `pending` y el usuario ve el `Notice` de error técnico, con la opción de reintentar o cambiar de medio.
- Botón *Pagar $TOTAL* → *Pagando*, con fieldsets deshabilitados y la línea `role="status"`.
- **No vacíes el carro del cliente** hasta tener un resultado: confirmación o transferencia pendiente.

> ✅ **Fase 6 (2026-10-25):** `placeOrder` (`src/lib/checkout/actions.ts`) llama a `startPaymentOrRedirect` (`src/lib/payments/start.ts`) después de `place_order`. El intento lo crea `start_payment_attempt` con el total de `orders` (no el del cliente). Si la pasarela no responde, el pedido ya existe: se redirige a Pago rechazado con *No pudimos conectar con …* y *Elige cómo pagar* (no se vuelve al checkout, para no crear un segundo pedido). El estado *procesando* muestra *Te estamos llevando a Webpay Plus para pagar $X…* (o *…a Flow…*) y deja *Volver al carro* sin enlace (`usePaymentUi`).

## Reintentar (`retryPayment(orderId, medio)`)
1. Verifica que el pedido sea del usuario, que esté `pending` y que no esté vencido.
2. Verifica que no exista un `payments` `paid`. Marca como `failed` los `pending` anteriores.
3. Crea un intento nuevo (`n + 1`) con el medio elegido.
4. Si el pedido venció (cancelado por el cron), ofrece volver al carro: el stock ya se liberó.

> ✅ **Fase 6:** `retryPayment` (`src/lib/payments/actions.ts`) verifica la sesión y el dueño con el cliente del usuario, aplica `PAYMENT_RATE_LIMIT` y llama a `start_payment_attempt`, que hace los pasos 1 a 3 en una transacción (D-023). Vencido, pagado o anulado → redirige a `/pedido/<id>`, que muestra *Este pedido venció* (con *Volver al carro*) o la Confirmación. Lo usan *Elige cómo pagar* (Pago rechazado y *Estamos confirmando tu pago*) y *Pagar con tarjeta en su lugar*.

## Seguridad
- Toda acción vuelve a verificar la sesión con `getClaims()`.
- Rate limiting en `placeOrderAndPay` (Redis), para que nadie bloquee stock en masa creando pedidos.
- Los errores de `place_order` se pueden mostrar, porque están pensados para el usuario. Otros errores de la BD no: registra el detalle y muestra un mensaje genérico.
