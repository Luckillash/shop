---
title: "Plan de la fase 7: postcompra y operación"
description: "Propuesta de subetapas de la fase 7 (Mis pedidos, invitado → cuenta, correos, administración, cuenta, reseñas, Los más vendidos), con su orden, dependencias, los criterios que aplica el agente y las decisiones pendientes del dueño. Esperando aprobación."
generated: "2026-10-25"
estado: "en curso"
related: ["06-implementacion/hoja-de-ruta.md", "04-diseno/templates.md", "08-estado/avance.md", "_archivo/pendientes-antes-de-la-fase-7.md", "_archivo/prompt-inicio-fase-7.md", "02-arquitectura/decisiones.md", "07-referencia/brechas-diseno-vs-datos.md"]
---

# Plan de la fase 7: postcompra y operación

Propuesta del 25-10-2026. El dueño pidió empezar por la 7.0 el mismo día; las decisiones de abajo siguen pendientes y están también en [pendientes del dueño](pendientes-del-dueno-fase-7.md).

**Avance:** 7.0 ✅ (25-10-2026). La migración se llamó **M8** (M7 ya era `search_products`).

## Pendiente previo: el cron

No se pudo cerrar todavía porque el cron aún no ha corrido. La revisión fue a las 01:26 UTC del 26-10 (22:26 del 25-10 en Chile). La primera ejecución de `0 9 * * *` es el 26-10 a las 09:00 UTC, o sea a las 06:00 de Chile. En los logs de producción de las 24 horas anteriores no aparece `/api/cron/expirar-pedidos`; sí aparecen `/checkout`, `/ingresar` y la confirmación de Flow. Se revisa después de las 06:00, antes de empezar la subetapa 7.1, y ahí se cierra la tarea 7 de los [pendientes del despliegue](pendientes-del-despliegue.md).

## Subetapas

Cada subetapa termina con tests de Vitest, `npm run lint` y `npm run build` sin errores, una prueba de punta a punta en local (Edge por CDP, a 1280 y 390 px) y la documentación al día: [avance](../08-estado/avance.md), [registro de cambios](../08-estado/registro-de-cambios.md), brechas, decisiones y `pendientes-del-dueno-fase-7.md`. Los pedidos de prueba nuevos van desde el **1037** y se anotan en el avance.

| # | Subetapa | Depende de | Contenido |
|---|---|---|---|
| **7.0** ✅ | Base | — | **Migración M8** (en el plan decía M7), idempotente y aplicada con `apply_migration`: tabla `order_events` para el historial (cuándo, qué, quién, datos), solo la lee el admin; `orders.cancel_reason` (tipo `vencio`/`tienda`/`cliente` más un texto que ve el cliente). Módulo `order-status.ts` con las etiquetas del cliente y de la administración y la tabla de transiciones permitidas. `requireAdmin()`. Fecha estimada de entrega (B25): se calcula desde `placed_at` o `paid_at` con los plazos por zona, sin columna nueva, y así coincide con la que vio el cliente |
| **7.1** | Mis pedidos y Detalle de pedido | 7.0 | Layout de `/cuenta` con su menú; `/cuenta` lleva a `/cuenta/pedidos`. Los 6 estados con su `Badge` y su línea (B24). Detalle con línea de tiempo, seguimiento, *Volver a comprar* y *Necesito ayuda*. *Descargar boleta* queda oculto hasta definir D-012 |
| **7.2** | Invitado → cuenta | 7.1 | `ConfirmacionCrearCuenta` con `updateUser` sobre la sesión anónima, conservando el `user_id` y por lo tanto sus pedidos. *Ver estado del pedido* (B38). ⚠️ Con la confirmación de correo activa, Supabase puede exigir confirmar el correo antes de que la cuenta deje de ser anónima. Si es así, el aviso tendría que decir algo como *Te enviamos un correo para confirmar* y no *Listo, creamos tu cuenta*; se le propondrá ese texto al dueño. Si el correo ya tiene una cuenta, no se fusionan los pedidos (sería un riesgo de privacidad): se le pide ingresar |
| **7.3** | Correos | 7.0 | Ajustar el `layout` de `src/lib/email/templates.ts` a `CorreoConfirmacion`; correos `CorreoDespacho` y `CorreoAnulacion` con sus 3 motivos. Cada correo se prueba con un envío real desde `mail.audazia.dev` |
| **7.4** | Administración | 7.0, 7.3 y la cuenta admin | `/admin` sin el header de la tienda (`AdminHeader`); acceso validado en el layout **y** en cada Server Action. Incluye `AdminPedidos` (chips con conteo, búsqueda por N.º o correo, *Ver más*), `AdminPedido` con sus 5 estados y el historial, confirmar transferencia con `settle_payment(…, 'paid', …)` y el N.º de operación, *Empezar a preparar*, *Marcar como enviado* (transportista y código, con correo), *Marcar como entregado*, `AdminAnularPedido` (`cancel_order` + reembolso con el código de la fase 6 + correo opcional), `AdminAlertas` (resolver) y `AdminPedidoMovil`. Las transiciones se validan en la acción |
| **7.5** | Direcciones, Favoritos y Datos personales | 7.1 | CRUD de `addresses` con predeterminada; favoritos con estado vacío (un invitado debe ingresar, B23) y el corazón de la Ficha y de `ProductCard` conectado; datos personales, cambio de contraseña y novedades |
| **7.6** | Reseñas (B36) | 7.1 | Modal `EscribirResena` en la Ficha. La elegibilidad se consulta al abrirlo, para que la Ficha siga siendo estática. Migración: el nombre y la comuna se copian en `reviews` con un trigger, para que el cliente no pueda inventarlos y `anon` no tenga que leer `profiles`; también se ajusta la política según la decisión 3. Las opiniones reales reemplazan los placeholders y se invalida el tag del producto |
| **7.7** | *Los más vendidos* (B34) | — | Función `security definer` que devuelve solo los ids, cacheada con el tag `products`; si hay menos de 4, se muestran *Destacados* |
| **7.8** | Opcionales 🟢 | 7.1, 7.4 | Redirección optimista de `/cuenta/*` y `/admin/*` en el proxy; limpieza de usuarios anónimos sin pedidos de más de 30 días, aprovechando el cron diario |

**Orden propuesto:** 7.0 → 7.1 → 7.2 → 7.3 → 7.4 → 7.5 → 7.6 → 7.7 → 7.8. Si la cuenta admin (decisión 4) se define al aprobar el plan, la 7.4 no se retrasa.

**Fuera de alcance:** boleta o factura electrónica mientras no haya proveedor (D-012), administración del catálogo (productos, stock, cupones) y la lista de pedidos en móvil (sin diseño).

## Criterios que aplica el agente (van a `decisiones.md`)

- **`cancelled` o `refunded`:** un pedido anulado sin cobro queda `cancelled` (*Anulado*). Uno anulado por la tienda con el reembolso completado queda `refunded` (*Reembolsado*). Si el reembolso falla, queda `cancelled` con una alerta `refund_failed`. El 1030 queda como está: *Anulado · pago devuelto*.
- **Historial de los pedidos anteriores:** los que ya existen no tienen eventos, así que su historial se arma con las fechas del pedido y los intentos de pago.
- **Reseñas:** se publican al instante, como en el diseño. Para ocultar una, mientras no haya administración del catálogo, se hace en Supabase.

## Decisiones del dueño

| # | Decisión | Recomendación del agente | Respuesta |
|---|---|---|---|
| 1 | Etiqueta *Por preparar* para `paid` en la administración | Aprobarla. El cliente sigue viendo *En preparación* en `paid` y en `processing` | ⏳ |
| 2 | Transportistas | Aprobar Starken, Chilexpress, Blue Express, Correos de Chile y despacho propio. *Seguir el envío* enlaza a la página de seguimiento de cada uno; en despacho propio no hay enlace | ⏳ |
| 3a | Solo opina quien compró el producto | Aprobarlo | ⏳ |
| 3b | La opinión se publica con el nombre de pila y la comuna de despacho (*Camila · Providencia*); en los retiros en tienda, sin comuna | Aprobarlo | ⏳ |
| 3c | ¿Puede opinar un invitado? | **No**: no tiene nombre, su sesión se pierde y la limpieza de anónimos la borraría. Con la 7.2, crear la cuenta le toma un paso. Exige `is_anonymous is not true` en la política | ⏳ |
| 4 | Qué cuenta se marca como `admin` en `profiles` | `prueba.fase5@almacen.cl` (para probar) y la cuenta real del dueño (creada el 25-10-2026) | ⏳ |
| 5 | Anular un pedido pagado por transferencia (no hay pasarela que reembolse) | El modal dice *Devuélvele $X por transferencia* y el pedido pasa a *Reembolsado* cuando el admin marca *Ya devolví el dinero* | ⏳ |
| 6 | Correo *Anulamos tu pedido* cuando el pedido vence | **(a)** Solo a las transferencias vencidas. La otra opción, **(b)**, también lo envía a los pedidos abandonados con tarjeta o Flow, que vencen a los 30 minutos y suelen ser alguien que no siguió con la compra; puede sonar a spam | ⏳ |
| 7a | RUT en `profiles` (B22) | **Sí**: Datos personales ya lo muestra | ⏳ |
| 7b | *Recibir novedades* (B21) | Solo una marca en `profiles` | ⏳ |
| 7c | Suscripción del footer (B21) | Dejarla deshabilitada hasta elegir un proveedor de newsletter | ⏳ |
