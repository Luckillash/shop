---
title: "Lo que le toca al dueño en la fase 7"
description: "Decisiones y tareas del dueño durante la fase 7 (postcompra y operación): etiquetas de la administración, transportistas, reseñas, cuenta admin, anulación de transferencias pagadas, correo de pedido vencido, RUT y novedades. Cada una con la recomendación del agente, qué bloquea y su estado."
generated: "2026-10-25"
estado: "vigente"
related: ["_archivo/plan-fase-7.md", "_archivo/pendientes-del-dueno-fase-6.md", "_archivo/pendientes-antes-de-produccion.md", "02-arquitectura/decisiones.md", "08-estado/avance.md"]
---

# Lo que te toca a ti (fase 7)

La fase 7 avanza por subetapas ([plan](plan-fase-7.md)). La **7.0** (base: historial del pedido, motivo de anulación, estados y acceso de administración) quedó lista el 25-10-2026 y no necesitó nada de ti. Estas decisiones sí son tuyas; ninguna bloquea la 7.1 salvo donde se indica.

| # | Decisión | Recomendación del agente | Bloquea | Estado |
|---|---|---|---|---|
| 1 | Etiqueta *Por preparar* para `paid` en la administración | Aprobarla. El cliente sigue viendo *En preparación* en `paid` y en `processing` | 7.4 (ya está en el código de la 7.0; cambiarla es una línea) | ⏳ |
| 2 | Transportistas | Starken, Chilexpress, Blue Express, Correos de Chile y despacho propio. *Seguir el envío* enlaza a la página de seguimiento de cada uno; en despacho propio no hay enlace | 7.3 y 7.4 | ⏳ |
| 3a | Solo opina quien compró el producto | Aprobarlo | 7.6 | ⏳ |
| 3b | La opinión se publica con el nombre de pila y la comuna de despacho (*Camila · Providencia*); en los retiros en tienda, sin comuna | Aprobarlo | 7.6 | ⏳ |
| 3c | ¿Puede opinar un invitado? | **No**: no tiene nombre, su sesión se pierde y la limpieza de anónimos la borraría. Con la 7.2, crear la cuenta le toma un paso | 7.6 | ⏳ |
| 4 | Qué cuenta se marca como `admin` | `prueba.fase5@almacen.cl` (para probar) y tu cuenta real (creada el 25-10-2026). **El agente no marca ninguna sin tu respuesta** | 7.4 (prueba de punta a punta) | ⏳ |
| 5 | Anular un pedido pagado por transferencia (no hay pasarela que reembolse) | El modal dice *Devuélvele $X por transferencia* y el pedido pasa a *Reembolsado* cuando marcas *Ya devolví el dinero* | 7.4 | ⏳ |
| 6 | Correo *Anulamos tu pedido* cuando el pedido vence | **(a)** Solo a las transferencias vencidas. (b) también a los pedidos abandonados con tarjeta o Flow (vencen a los 30 minutos; puede sonar a spam) | 7.3 | ⏳ |
| 7a | RUT en `profiles` (B22) | Sí: Datos personales ya lo muestra | 7.5 | ⏳ |
| 7b | *Recibir novedades* (B21) | Solo una marca en `profiles` | 7.2 y 7.5 | ⏳ |
| 7c | Suscripción del footer (B21) | Dejarla deshabilitada hasta elegir un proveedor de newsletter | Nada | ⏳ |

## Tareas

| # | Tarea | Quién | Estado |
|---|---|---|---|
| T1 | Revisar la primera ejecución del cron `/api/cron/expirar-pedidos` (26-10 a las 06:00 de Chile): debe dar 200, no 401. Cierra la tarea 7 de los [pendientes del despliegue](pendientes-del-despliegue.md) | El agente, con el MCP de Vercel, antes de la 7.1 | ⏳ |

## Lo que cambió en la 7.0 y conviene que sepas

- **Desde ahora, cada pedido guarda su historial** (cuándo se creó, pagó, preparó, envió, entregó o anuló, y quién lo hizo). Los pedidos de prueba 1001–1036 no lo tienen: en la administración se verá armado con sus fechas.
- **Los pedidos que anula el cron quedan con el motivo *vencido*.** Servirá para el correo *Anulamos tu pedido* (decisión 6).
- **La fecha de entrega se calcula igual en todas partes** (Confirmación, Mis pedidos, administración). Con el despacho express, la Confirmación ahora dice *Llega el martes 27 de octubre* en vez de *Llega mañana… si pagas antes de las 14:00*, que ya no tenía sentido después de pagar.
