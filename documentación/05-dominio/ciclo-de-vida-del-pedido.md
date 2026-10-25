---
title: "Ciclo de vida del pedido y del pago"
description: "Máquinas de estado de orders.status y payments.status, quién provoca cada transición, cómo se muestra cada estado en la UI (Badge y seguimiento), los vencimientos y los casos de carrera (un pago que llega con el pedido ya anulado)."
keywords: ["estados", "máquina de estados", "order_status", "payment_status", "pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded", "vencimiento", "expires_at", "badge", "seguimiento", "carrera", "idempotencia"]
related: ["03-base-de-datos/tablas-pedidos-y-pagos.md", "03-base-de-datos/funciones-y-triggers.md", "04-diseno/estados-y-mensajes.md", "06-implementacion/pago-transferencia.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql §1, §10, §11", "_archivo/diseno-almacen.md §5.3 (Pedidos), §6", "../transbank/documentación/README.md (Invariantes)", "../flow/documentación/03-api-reference/payment.md"]
estado: "definido (estados en SQL) · transiciones de app: propuesta"
---

# Ciclo de vida del pedido y del pago

> **Úsalo cuando:** cambias el estado de un pedido o un pago, o muestras un estado en la UI.

## Pedido (`orders.status`)

```
                 place_order()
                      │
                      ▼
   ┌──────────── pending ─────────────┐
   │ pago 'paid'      │ vence / cliente│ cancela / admin
   │ (trigger)        ▼                │
   │             cancelled ◄───────────┤
   ▼                  ▲                │
  paid ──► processing ┴──► shipped ──► delivered
   │          │ (admin: cancel_order + refund)
   └──────────┴──► refunded (admin, después del refund en la pasarela)
```

| Transición | Quién | Cómo | Efectos |
|---|---|---|---|
| — → `pending` | Cliente | `place_order` | Stock descontado, carro vaciado, cupón usado |
| `pending` → `paid` | Pasarela | `payments.status = 'paid'` → trigger `sync_order_on_payment` | `paid_at` |
| `pending` → `cancelled` | Cliente (solo lo suyo), cron, admin | `cancel_order` | Stock devuelto, cupón liberado, `cancelled_at` |
| `paid` → `processing` | Admin | `update orders set status` | — (no hay `processing_at`) |
| `processing` → `shipped` | Admin | `update` + `carrier`, `tracking_number` | `shipped_at` |
| `shipped` → `delivered` | Admin (o webhook de Starken en el futuro) | `update` | `delivered_at` |
| `paid`/`processing` → `cancelled` | Admin / `service_role` | `cancel_order` + **refund en la pasarela** | Stock devuelto |
| → `refunded` | Admin | `update`, después del refund | — |

No hay restricciones de transición en la BD: un admin podría pasar de `delivered` a `pending`. Valida las transiciones en la Server Action de administración.

## Pago (`payments.status`)

| Estado | Significado | Viene de |
|---|---|---|
| `pending` | Intento creado; el usuario está en la pasarela o la transferencia no ha llegado | Al iniciar el pago |
| `authorized` | Autorizado sin captura (captura diferida) | **No se usa** en este proyecto |
| `paid` | Cobrado | Webpay aprobado / Flow `2` / transferencia confirmada |
| `failed` | Rechazado, abortado, vencido o anulado | Webpay rechazado / `TBK_TOKEN` / Flow `3`/`4` / vencimiento |
| `refunded` | Reembolsado | Refund en la pasarela |

Un pedido tiene **N intentos**. Solo uno debería quedar `paid`. Antes de crear un intento nuevo, comprueba que no haya otro `paid` (doble pago) y marca como `failed` el `pending` anterior del mismo pedido.

## Cómo se muestra (UI)

El diseño define tres estados de despacho más *Pago pendiente*. Lo que falta es una propuesta.

| `orders.status` | `Badge` (Mis pedidos) | Seguimiento (4 pasos) |
|---|---|---|
| `pending` | `warning` *Pago pendiente* | — |
| `paid` | `neutral` + `info` *En preparación* | ✓ Confirmado |
| `processing` | `neutral` + `info` *En preparación* | ✓ Confirmado · ✓ Preparado |
| `shipped` | `new` + `truck` *En camino* | ✓ Confirmado · ✓ Preparado · ✓ En camino |
| `delivered` | `success` + `check` *Entregado* | ✓ todos |
| `cancelled` | `danger` + `close` *Anulado* (propuesta) | — |
| `refunded` | `neutral` *Reembolsado* (propuesta) | — |

## Vencimientos (D-010 ✅, cron D-021 ✅)

| Medio | Reserva (`expires_at`) | Configuración de la pasarela |
|---|---|---|
| Transferencia | `placed_at + 48 h`. Se muestra en `America/Santiago`: *hasta el sábado 24 de octubre a las 22:00* | — |
| Webpay Plus | `+ 30 min` | El token dura 5 min y el formulario 4 min (10 en integración). `status` sirve hasta 7 días |
| Flow | `+ 30 min` | Envía **`timeout`** en `payment/create` (por ejemplo, 1200 s). **Sin él, la orden de Flow no expira nunca** |

Cron (`/api/cron/expirar-pedidos`, cada 10–15 min):

1. Busca los pedidos `pending` con `expires_at < now()`.
2. Si el medio es Webpay o Flow, **antes de anular consulta el estado en la pasarela** (`status` / `getStatus`). Si está pagado, registra el pago en vez de anular. Esto cubre al usuario que cerró el navegador después de pagar.
3. Si no está pagado: marca los `payments` pendientes como `failed` y llama a `cancel_order` con el cliente admin.
4. Invalida `stock:<productId>` (`revalidateTag(…, 'max')`).

## Carreras e idempotencia

| Caso | Qué pasa | Qué hacer |
|---|---|---|
| El usuario recarga el retorno de Webpay o hace doble clic | El segundo `commit` falla (el token ya se confirmó) | Lock en Redis (`SET NX`) + si `payments` ya no está `pending`, solo redirige al resultado |
| Flow envía `urlConfirmation` varias veces | Se repite la actualización | `upsert` por (`provider`, `provider_payment_id`). Si ya está `paid`, responde 200 sin hacer nada |
| **El pago se aprueba después de que el cron anuló el pedido** | El trigger no cambia el pedido (solo actúa sobre `pending`). El stock ya volvió | ✅ **Reembolso automático + alerta** `paid_after_cancel` (D-020): `settle_payment` devuelve el estado del pedido después del trigger. En Webpay no se llega a cobrar (sin commit); en Flow sí (pedido 1030) |
| Dos pestañas pagan el mismo pedido | Dos intentos `paid` | ✅ `start_payment_attempt` rechaza un intento nuevo si ya hay uno `paid` (`already_paid`). Si igual ocurre (Flow cobra un intento reemplazado), reembolso + alerta `double_payment` (D-020) |
| El usuario cierra el navegador después de pagar en Webpay | No llega el retorno, así que no hay `commit`: la transacción queda `INITIALIZED` (con `vci`) y **no se cobra** | ✅ El cron hace el `commit` del intento pendiente (`reconcileWebpay` con `final`): si el usuario había terminado, sale `AUTHORIZED` y el pago se registra (pedido 1029, `recovered: 1`); si no, `INITIALIZED` → `failed` + `cancel_order`. Verificado el 2026-10-25 (trampa 67) |
