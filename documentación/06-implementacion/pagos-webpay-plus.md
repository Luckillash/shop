---
title: "Guía: pagos con Webpay Plus en la tienda"
description: "Integración de Webpay Plus en Shop: variables, create con buy_order por intento, redirección por POST con token_ws, Route Handler de retorno (GET y POST) con todos los casos de tokens, commit idempotente con lock, registro en payments y recuperación con status."
keywords: ["webpay", "webpay plus", "transbank", "token_ws", "TBK_TOKEN", "TBK_ORDEN_COMPRA", "commit", "status", "refund", "buy_order", "return_url", "AUTHORIZED", "response_code", "integración"]
related: ["05-dominio/ciclo-de-vida-del-pedido.md", "03-base-de-datos/tablas-pedidos-y-pagos.md", "04-diseno/estados-y-mensajes.md", "06-implementacion/checkout-y-pedidos.md"]
source: ["../transbank/documentación/README.md", "../transbank/documentación/02-guias/webpay-plus.md", "../transbank/documentación/07-referencia/trampas-conocidas.md", "_archivo/diseno-almacen.md §6"]
estado: "vigente (fase 6, 2026-10-25)"
---

# Guía: Webpay Plus

> **Úsalo cuando:** implementas o depuras el pago con tarjeta. Para el contrato completo de la API, lee `../transbank/documentación/02-guias/webpay-plus.md` (rutas relativas a la raíz del proyecto `shop/`), o los recursos `tbk-docs://` del MCP `transbank`.

## Lo esencial de Transbank

| Tema | Regla |
|---|---|
| Host | Integración `https://webpay3gint.transbank.cl` · Producción `https://webpay3g.transbank.cl` |
| Base path | `/rswebpaytransaction/api/webpay/v1.2` |
| Autenticación | Headers `Tbk-Api-Key-Id` (código de comercio) + `Tbk-Api-Key-Secret`. JSON. Sin firma |
| Integración | Comercio `597055555532`. Llave `579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C` |
| **Aprobada** | `response_code === 0` **y** `status === "AUTHORIZED"`. Un rechazo llega con **HTTP 200** |
| Retorno | **No hay webhooks.** El navegador vuelve a `return_url` por GET o POST |
| Plazos | Token 5 min · formulario 4 min (10 en integración) · `status` 7 días · reversa < 3 h · anulación 90 días |
| Montos | CLP **enteros**. `buy_order` único, máximo **26** caracteres. `session_id` máximo 61 |
| Comprobante | Transbank no entrega voucher: la tienda muestra el suyo (la Confirmación) |

## Variables

```env
WEBPAY_ENV=integration                    # integration | production
WEBPAY_COMMERCE_CODE=597055555532
WEBPAY_API_KEY=579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## `src/lib/payments/webpay.ts` (server-only)

| Función | Llamada | Notas |
|---|---|---|
| `createTransaction({ buyOrder, sessionId, amount, returnUrl })` | `POST /transactions` | `amount` entero. `sessionId` = `orderId` (uuid, 36 caracteres). `returnUrl` = `${SITE_URL}/api/pagos/webpay/retorno`. Devuelve `{ token, url }` |
| `commitTransaction(token)` | `PUT /transactions/{token}` | Body vacío. **Solo una vez por token** |
| `getTransactionStatus(token)` | `GET /transactions/{token}` | Para recuperar resultados (hasta 7 días) |
| `refundTransaction(token, amount)` | `POST /transactions/{token}/refunds` | Reversa o anulación según el plazo |
| `isApproved(r)` | — | `r.response_code === 0 && r.status === "AUTHORIZED"` |

## Redirección a Webpay

Webpay espera un **formulario POST** a `url` con el campo `token_ws`. Un `redirect()` de Next.js hace un GET, así que la Server Action devuelve `{ url, token }` y un componente de cliente envía el formulario:

```tsx
<form ref={formRef} method="post" action={url}>
  <input type="hidden" name="token_ws" value={token} />
</form>
// useEffect(() => formRef.current?.submit(), [])
```

Sin iframe. Mientras tanto se muestra el estado *procesando*.

## Route Handler de retorno (`src/app/api/pagos/webpay/retorno/route.ts`)

Exporta **`GET` y `POST`**: los parámetros pueden llegar por query o por body `application/x-www-form-urlencoded`.

| Llega | Significado | Acción |
|---|---|---|
| Solo `token_ws` | Flujo normal | **Commit** → aprobado: `payments.paid` · si no: `payments.failed` |
| `TBK_TOKEN` (+ `TBK_ORDEN_COMPRA`, `TBK_ID_SESION`), con o sin `token_ws` | El usuario abortó o hubo un error en el formulario | **No hacer commit.** `payments.failed` → Pago rechazado |
| Solo `TBK_ORDEN_COMPRA` + `TBK_ID_SESION` | Timeout en el formulario | **No hacer commit.** `failed` → Pago rechazado |

Pasos para `token_ws`:

1. Busca `payments` con `provider = 'webpay'` y `provider_payment_id = token` (cliente admin). Si no existe → 404 a una página de error.
2. Si ya **no** está `pending` (recarga o doble envío) → redirige al resultado sin hacer commit.
3. Lock: `SET lock:pay:webpay:<token> 1 NX EX 60`. Si no lo obtienes, espera o redirige a una página que consulte el estado.
4. `commitTransaction(token)`. Si falla por red, usa `getTransactionStatus` para decidir.
5. Verifica que `amount` y `buy_order` de la respuesta coincidan con el pago esperado.
6. `update payments set status, raw_response = <respuesta>` → si es `paid`, el trigger pasa el pedido a `paid`.
7. Si el pedido estaba `cancelled` (venció mientras pagaba) y el pago se aprobó → reembolsa o crea una alerta ([ciclo de vida](../05-dominio/ciclo-de-vida-del-pedido.md#carreras-e-idempotencia)).
8. 303 → `/pedido/<orderId>` (Confirmación) o `/pedido/<orderId>/pago-rechazado`.

La Confirmación muestra el medio con `payment_type_code` (`VD` = débito, `VN` = crédito, etc.) y las cuotas. Detalle de los códigos en `../transbank/documentación/04-objetos/codigos-y-enumeraciones.md`.

## Probar

- MCP `transbank`: `tbk_webpay_plus_create` → abre la `url` → paga con VISA `4051885600446623`, CVV `123`, RUT `11.111.111-1`, clave `123` → `tbk_list_returns` → `tbk_webpay_plus_commit`.
- Rechazo: MASTERCARD `5186059559590568`.
- Abortado: presiona *Anular compra* en el formulario de Webpay → vuelve con `TBK_TOKEN`.
- `return_url` puede ser `http://localhost:3000/...`, porque la redirección la hace el navegador.

## Implementación (fase 6, 2026-10-25) ✅

| Pieza | Dónde |
|---|---|
| Cliente REST (create, commit, status, refund) | `src/lib/payments/webpay.ts` (server-only, timeout 10 s, `GatewayError`) |
| Reglas puras: `parseWebpayReturn`, `isApproved`, `matchesAttempt`, `webpayOutcome`, `webpayCardLabel` | `src/lib/payments/webpay-core.ts` (+ tests) |
| Crear el intento (`start_payment_attempt` → create → guarda el token) | `startAttempt` en `src/lib/payments/service.ts` |
| Formulario POST con `token_ws` | `src/components/payment/webpay-redirect.tsx` (lo usan el checkout y *Elige cómo pagar*) |
| Retorno GET/POST → 303 | `src/app/api/pagos/webpay/retorno/route.ts` |
| Commit con lock (Redis fail-open + `claim_payment`), fallback a `status`, verificación de monto, `buy_order` y `session_id`, B13 | `reconcileWebpay` en `service.ts` |

Diferencias con la propuesta de arriba:
- `session_id` = `orders.id`; `buy_order` = `payments.reference` (`1020-1`). El intento se busca por el token (`commit`, `TBK_TOKEN`) o por `TBK_ORDEN_COMPRA` (timeout), y se comprueba que `TBK_ID_SESION` sea el pedido.
- Lock ocupado (otro proceso confirma) → 303 a `/pedido/<id>`, que muestra *Estamos confirmando tu pago*. Si el commit falla con 422 o por red, se consulta `status`: `INITIALIZED` deja el intento `pending` (el usuario no terminó; ver trampa 67).
- `/pedido/[id]` no hace commit nunca: solo el retorno y el cron.
- La Confirmación muestra *Pagado con tarjeta de crédito vía Webpay Plus* (de `payment_type_code`).

**Verificado en integración** (pedidos 1020–1022, 1029, 1031): aprobado con cuenta y como invitado; rechazado (MASTERCARD) → Pago rechazado; *Anular compra y volver* (`TBK_TOKEN`, POST) → sin commit; timeout simulado (solo `TBK_ORDEN_COMPRA` + `TBK_ID_SESION`); sesión ajena → *No encontramos ese pago*; 3 recargas del retorno ya confirmado → 303 sin commit; 2 retornos simultáneos → un solo commit; navegador cerrado después de pagar → el cron hace el commit y recupera el pago; pedido anulado por el cron durante el formulario → sin commit (INITIALIZED, sin cobro).
