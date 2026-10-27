---
title: "Guía: transferencia bancaria, reserva de 48 h y cron de vencimiento"
description: "Cómo implementar el pago por transferencia (pantalla de datos, reserva con expires_at), la confirmación manual por un admin y el cron que anula los pedidos vencidos de cualquier medio de pago."
keywords: ["transferencia", "48 horas", "reserva", "expires_at", "cron", "vencimiento", "cancel_order", "confirmar pago", "datos bancarios", "copiar", "CRON_SECRET"]
related: ["05-dominio/ciclo-de-vida-del-pedido.md", "04-diseno/estados-y-mensajes.md", "03-base-de-datos/funciones-y-triggers.md"]
source: ["_archivo/diseno-almacen.md §2.3, §4.4, §5.3", "03-base-de-datos/sql/ecommerce_schema.sql §11"]
estado: "vigente (fase 6, 2026-10-25)"
---

# Guía: transferencia y vencimiento

> **Úsalo cuando:** implementas el pago por transferencia, la confirmación manual o la anulación automática de pedidos pendientes.

## Al elegir transferencia

1. `place_order` (con M2: `payment_method = 'transfer'`, `expires_at = now() + interval '48 hours'`).
2. Insertar `payments` (`provider = 'transfer'`, `status = 'pending'`, `amount = orders.total`).
3. Enviar un correo con los datos bancarios y la fecha límite (**no hay proveedor de correo definido**).
4. `redirect('/pedido/<id>/transferencia')`.

## Pantalla *Transferencia pendiente*

- Datos bancarios desde la configuración del servidor (variables `BANK_*`), no escritos en el componente. Los reales están en `.env.local` desde el 25-10-2026.
- Fecha límite: `formatDeadline(expires_at)` en `America/Santiago` → *hasta el sábado 24 de octubre a las 22:00*.
- Botones *Copiar*: `navigator.clipboard.writeText`. El texto cambia a *Copiado* y se anuncia con `role="status"`. *Copiar todos los datos* copia un bloque de texto.
- Mensaje de la transferencia: *Pedido <order_number>*.
- *Pagar con tarjeta en su lugar* → `retryPayment(orderId, 'webpay')`: el `expires_at` pasa a ser el de tarjeta (decídelo), y el pago de transferencia queda `failed`.

## Confirmación manual (admin)

No hay diseño de administración. Mínimo viable: una Server Action protegida (`is_admin()`) o una operación con el MCP `supabase` que:

1. Verifica el monto recibido contra `orders.total`.
2. `update payments set status = 'paid', raw_response = '{"confirmed_by": "<admin>", "bank_ref": "…"}'` → el trigger pasa el pedido a `paid`.
3. Envía el correo de confirmación.

## Cron de vencimiento (`/api/cron/expirar-pedidos`)

Se aplica a **todos los medios**, no solo a la transferencia: un pedido de Webpay o Flow abandonado también retiene el stock.

```ts
// Protegido con: Authorization: Bearer ${process.env.CRON_SECRET}
// 1. pedidos = orders where status='pending' and expires_at < now()   (cliente admin; índice M4)
// 2. por cada pedido:
//    - webpay/flow: consultar status/getStatus del último intento
//        pagado  → registrar el pago (el trigger lo pasa a paid) y seguir con el siguiente
//    - marcar los payments 'pending' como 'failed'
//    - rpc('cancel_order', { p_order_id })   // con service_role: auth.uid() null = staff
//    - revalidateTag(`stock:${productId}`, 'max') por cada producto
// 3. responder { cancelled: n, recovered: m }
```

- Frecuencia: cada 10–15 minutos. Puede ser Vercel Cron, un cron externo o `pg_cron` + `pg_net` llamando a la URL.
- Idempotente: si un pedido ya no está `pending`, `cancel_order` falla y se ignora.
- Opcional: un correo *Tu pedido fue anulado porque no recibimos la transferencia*.
- El token de Webpay sirve para `status` durante 7 días. El vencimiento de 30 minutos está muy por debajo de ese límite.

## Implementación (fase 6, 2026-10-25) ✅

- Al elegir transferencia (checkout o *Ver datos para transferir*): `start_payment_attempt(order, 'transfer')` → intento `pending` con `provider_payment_id = reference` → correo con los datos (`after()`, Resend, D-022) → `/pedido/<id>/transferencia`.
- Pantalla: `src/app/(checkout)/pedido/[id]/transferencia/page.tsx` + `TransferDetails` (*Copiar*, *Copiado*, `role="status"`). Datos de `bankDetails()` (`BANK_*`, reales desde el 25-10-2026). Fecha límite con `formatDeadline` en hora de Chile. Vacía el carro del navegador (una vez por pedido).
- *Pagar con tarjeta en su lugar*: `retryPayment(order, 'webpay')`. El intento de transferencia queda `failed` y el plazo **no se acorta** (D-023).
- *Ver estado del pedido*: no se muestra hasta Mis pedidos (fase 7, B38).
- Confirmación manual del admin: sin implementar (no hay administración). Mínimo viable con el MCP: `select settle_payment('<payment_id>', 'paid', '{"confirmed_by":"<admin>","bank_ref":"…"}')` como `service_role`, después de comparar el monto con `orders.total`.
- Cron: `src/app/api/cron/expirar-pedidos/route.ts` + `src/lib/payments/expire.ts`, en lotes de 50, `vercel.json` cada 10 min (D-021). Para Webpay y Flow consulta la pasarela con `final: true` antes de anular. Las transferencias anuladas reciben *Anulamos tu pedido* con `sendOrderEmail(id, "cancelled")` (decisión 6a, D-028); los pedidos con tarjeta o Flow no.
