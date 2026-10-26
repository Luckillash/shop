---
title: "Guía: pagos con Flow en la tienda"
description: "Integración de Flow en Shop: firma HMAC, payment/create con commerceOrder por intento y timeout, urlConfirmation (servidor a servidor, 200 en menos de 15 s), urlReturn, getStatus, mapeo de estados y pruebas en sandbox con túnel."
keywords: ["flow", "payment/create", "getStatus", "urlConfirmation", "urlReturn", "token", "commerceOrder", "flowOrder", "firma", "HMAC", "timeout", "sandbox", "túnel", "status 2"]
related: ["05-dominio/ciclo-de-vida-del-pedido.md", "03-base-de-datos/tablas-pedidos-y-pagos.md", "04-diseno/estados-y-mensajes.md", "06-implementacion/checkout-y-pedidos.md"]
source: ["../flow/documentación/README.md", "../flow/documentación/02-guias/pagos-ecommerce.md", "../flow/documentación/03-api-reference/payment.md", "../flow/documentación/07-referencia/trampas-conocidas.md"]
estado: "vigente (fase 6, 2026-10-25)"
---

# Guía: Flow

> **Úsalo cuando:** implementas o depuras el pago con Flow (otros medios). Para el contrato completo, lee `../flow/documentación/02-guias/pagos-ecommerce.md` y `03-api-reference/payment.md` (rutas relativas a la raíz del proyecto `shop/`), o los recursos `flow-docs://` del MCP `flow`.

## Lo esencial de Flow

| Tema | Regla |
|---|---|
| URL base | Sandbox `https://sandbox.flow.cl/api` · Producción `https://www.flow.cl/api`. Las credenciales son distintas en cada uno |
| Estilo | RPC: `POST /payment/create` (body `application/x-www-form-urlencoded`, **no JSON**), `GET /payment/getStatus` (query) |
| Autenticación | `apiKey` en todos los requests + firma **`s`** = `hex(HMAC_SHA256(secretKey, concat(nombre+valor de todos los parámetros ordenados por nombre, sin s)))` |
| Respuesta | JSON. `400`/`401` → `{ code, message }` |
| Callbacks | Flow envía **solo `token`**. El estado real se obtiene con `payment/getStatus` |
| Confirmación | `urlConfirmation` debe responder **HTTP 200 en menos de 15 s** |
| Estados | `1` pendiente · `2` pagada · `3` rechazada · `4` anulada |
| Monto mínimo | 350 CLP |
| Expiración | **`timeout`** (segundos). **Sin él, la orden no expira nunca** |

## Variables

```env
FLOW_API_URL=https://sandbox.flow.cl/api
FLOW_API_KEY=...
FLOW_SECRET_KEY=...
NEXT_PUBLIC_SITE_URL=https://<túnel-o-dominio>   # urlConfirmation debe ser pública
```

## `src/lib/payments/flow.ts` (server-only)

| Función | Llamada | Parámetros clave |
|---|---|---|
| `sign(params)` | — | Ordena las claves, concatena `clave+valor` y calcula el HMAC-SHA256 hex con `FLOW_SECRET_KEY` |
| `createPayment(...)` | `POST /payment/create` | `commerceOrder` = `${order_number}-${n}` (único) · `subject` = `Pedido N.º <order_number>` · `currency=CLP` · `amount` entero · `email` = el correo de contacto · `urlConfirmation` = `${SITE_URL}/api/pagos/flow/confirmacion` · `urlReturn` = `${SITE_URL}/api/pagos/flow/retorno` · `timeout=1200` · `paymentMethod=9` (todos) · `optional` (JSON con `orderId`) → `{ url, token, flowOrder }` |
| `getStatus(token)` | `GET /payment/getStatus` | → `{ status, commerceOrder, amount, paymentData, … }` |
| `refund(...)` | `POST /refund/create` | El campo es **`urlCallBack`** (con B mayúscula) |

Redirección: `redirect(url + "?token=" + token)` (GET), directo desde la Server Action.

## `POST /api/pagos/flow/confirmacion` (servidor a servidor)

1. Lee `token` del body (form-urlencoded).
2. `getStatus(token)` → busca `payments` por (`flow`, `token`) con el cliente admin.
3. Verifica que `amount` y `commerceOrder` coincidan.
4. Mapea: `2` → `paid` · `3`/`4` → `failed` · `1` → no cambia. Guarda `raw_response`. Es idempotente: si ya está `paid`, no hagas nada.
5. Responde **200 rápido** (< 15 s). Si hay trabajo pesado (correos), hazlo después de responder.

## `POST /api/pagos/flow/retorno` (navegador)

1. Lee `token` (acepta POST y GET).
2. `getStatus(token)` (no esperes a la confirmación: puede llegar después) y actualiza `payments` igual que arriba.
3. 303 → Confirmación (`2`) · Pago no completado (`3`/`4`) · *procesando* con un reintento de consulta (`1`).

## Probar en sandbox

- `urlConfirmation` debe ser **alcanzable desde internet**. Flow acepta `http://localhost` al crear la orden, pero no puede enviar la confirmación ahí. Usa un túnel (cloudflared, ngrok) y pon su URL en `NEXT_PUBLIC_SITE_URL`.
- Tarjeta `4051885600446623`, CVV `123`, RUT `11111111-1`, clave `123`.
- **No uses `@example.com` en `email`**: Flow responde 400 con el código 1620.
- MCP `flow`: `flow_payment_create` y `flow_payment_getStatus` para explorar las respuestas sin escribir código.
- Trampas: `optional` (singular) en `payment/create`, `hasMore` llega como booleano, y varios números llegan como string. Ver `../flow/documentación/07-referencia/trampas-conocidas.md`.

## Implementación (fase 6, 2026-10-25) ✅

| Pieza | Dónde |
|---|---|
| Cliente (firma `s`, create, getStatus, refund/create, refund/getStatus) | `src/lib/payments/flow.ts` (server-only, timeout 10 s) |
| Reglas puras: `signFlowParams`, `matchesFlowAttempt`, `flowOutcome` | `src/lib/payments/flow-core.ts` (+ tests) |
| Crear el intento (`commerceOrder` = `payments.reference`, `timeout=1200`, `paymentMethod=9`) → `redirect(url?token=)` | `startAttempt` (`service.ts`) + `startPaymentOrRedirect` (`start.ts`) |
| `urlConfirmation` | `src/app/api/pagos/flow/confirmacion/route.ts`: 200 en ~1 s, 200 con un token desconocido, 503 si `getStatus` falla (para que Flow reintente) |
| `urlReturn` (POST/GET) → 303 | `src/app/api/pagos/flow/retorno/route.ts` |
| `urlCallBack` del reembolso | `src/app/api/pagos/flow/reembolso/route.ts` |
| Consulta desde *Estamos confirmando tu pago* (`status` 1) | `checkPayment` (`src/lib/payments/actions.ts`) + `PaymentPending`: cada 3 s, hasta 10 veces |

Diferencias con la propuesta: **sin `optional`** (Flow lo muestra al pagador, trampa 70). Un intento `failed` (reemplazado o anulado por el cron) que Flow cobra igual se registra como `paid` y se reembolsa (D-020).

**Verificado en sandbox** (pedidos 1027, 1028, 1030): rechazo en el simulador (`status` 3) → *Tu pago en Flow no se completó* con Flow preseleccionado → reintento pagado (`status` 2) → Confirmación *Pagado con Webpay vía Flow*; confirmación simulada con `curl` (repetida e idempotente); pago después de que el cron anuló el pedido → reembolso en Flow + alerta. **Sin túnel** (D-024). **`urlConfirmation` real** probada el 25-10-2026 desde `https://audazia.dev` (pedido 1036): con la pestaña cerrada al aprobarse el pago, el aviso de Flow dejó el pedido `paid` sin pasar por `urlReturn`.
