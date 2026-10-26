---
title: "Lo que le toca al dueño en la fase 7"
description: "Decisiones y tareas del dueño durante la fase 7 (postcompra y operación): etiquetas de la administración, transportistas, reseñas, cuenta admin, anulación de transferencias pagadas, correo de pedido vencido, RUT y novedades. Cada una con la recomendación del agente, qué bloquea y su estado."
generated: "2026-10-25"
estado: "vigente"
related: ["_archivo/plan-fase-7.md", "_archivo/pendientes-del-dueno-fase-6.md", "_archivo/pendientes-antes-de-produccion.md", "02-arquitectura/decisiones.md", "08-estado/avance.md"]
---

# Lo que te toca a ti (fase 7)

La fase 7 avanza por subetapas ([plan](plan-fase-7.md)). La **7.0** (base: historial del pedido, motivo de anulación, estados y acceso de administración) quedó lista el 25-10-2026 y no necesitó nada de ti. La **7.1** (Mis pedidos y Detalle de pedido) quedó lista el mismo día: aprobaste sus textos propuestos (T2, 26-10-2026). La **7.2** (el invitado crea su cuenta desde la Confirmación) quedó lista el 26-10-2026: configuraste el SMTP propio y aprobaste sus textos (T3) y te toca, cuando puedas, las plantillas de los correos de Supabase (T4). Estas decisiones sí son tuyas; ninguna bloquea la 7.1 salvo donde se indica.

| # | Decisión | Recomendación del agente | Bloquea | Estado |
|---|---|---|---|---|
| 1 | Etiqueta *Por preparar* para `paid` en la administración | Aprobarla. El cliente sigue viendo *En preparación* en `paid` y en `processing` | 7.4 (ya está en el código de la 7.0; cambiarla es una línea) | ⏳ |
| 2 | Transportistas | Starken, Chilexpress, Blue Express, Correos de Chile y despacho propio. *Seguir el envío* enlaza a la página de seguimiento de cada uno; en despacho propio no hay enlace | 7.3, 7.4 y el botón *Seguir el envío* del Detalle de pedido (la 7.1 lo deja preparado y oculto) | ⏳ |
| 3a | Solo opina quien compró el producto | Aprobarlo | 7.6 | ⏳ |
| 3b | La opinión se publica con el nombre de pila y la comuna de despacho (*Camila · Providencia*); en los retiros en tienda, sin comuna | Aprobarlo | 7.6 | ⏳ |
| 3c | ¿Puede opinar un invitado? | **No**: no tiene nombre, su sesión se pierde y la limpieza de anónimos la borraría. Con la 7.2, crear la cuenta le toma un paso | 7.6 | ⏳ |
| 4 | Qué cuenta se marca como `admin` | `prueba.fase5@almacen.cl` (para probar) y tu cuenta real (creada el 25-10-2026). **El agente no marca ninguna sin tu respuesta** | 7.4 (prueba de punta a punta) | ⏳ |
| 5 | Anular un pedido pagado por transferencia (no hay pasarela que reembolse) | El modal dice *Devuélvele $X por transferencia* y el pedido pasa a *Reembolsado* cuando marcas *Ya devolví el dinero* | 7.4 | ⏳ |
| 6 | Correo *Anulamos tu pedido* cuando el pedido vence | **(a)** Solo a las transferencias vencidas. (b) también a los pedidos abandonados con tarjeta o Flow (vencen a los 30 minutos; puede sonar a spam) | 7.3 | ⏳ |
| 7a | RUT en `profiles` (B22) | Sí: Datos personales ya lo muestra | 7.5 | ⏳ |
| 7b | *Recibir novedades* (B21) | Solo una marca en `profiles` | 7.5 (la 7.2 la dejó en `user_metadata.newsletter`, igual que Crear cuenta, sin columna nueva) | ⏳ |
| 7c | Suscripción del footer (B21) | Dejarla deshabilitada hasta elegir un proveedor de newsletter | Nada | ⏳ |

## Tareas

| # | Tarea | Quién | Estado |
|---|---|---|---|
| T1 | Revisar la primera ejecución del cron `/api/cron/expirar-pedidos` (26-10 a las 06:00 de Chile): debe dar 200, no 401. Cierra la tarea 7 de los [pendientes del despliegue](pendientes-del-despliegue.md) | El agente, con el MCP de Vercel | ✅ 26-10-2026: corrió a las 09:00:47 UTC con `{ checked: 0, cancelled: 0, recovered: 0, skipped: 0 }` (200; el log solo sale con el secreto válido) |
| T2 | Revisar los textos propuestos de la 7.1 (abajo) | Tú | ✅ 26-10-2026: aprobados todos sin cambios (se descartaron *Falta pagar $X…*, *El pago no se completó a tiempo…*, el plazo del banco en el reembolso, poner la causa antes del monto, *en los últimos 6 meses* con filtro, el estado vacío sin la frase del invitado, *Listo en la tienda* y *Se atrasó un poco…*) |
| T3 | Revisar los textos propuestos de la 7.2 (abajo) | Tú | ✅ 26-10-2026: aprobados los cuatro sin cambios (se descartaron las alternativas *Confirma tu correo para terminar*, el enlace a *¿Olvidaste tu contraseña?*, *Ya tienes una cuenta* y las versiones con *Tu pedido está confirmado igual* y *crea tu cuenta desde Ingresar*) |
| T4 | Plantillas de los correos de Supabase Auth en español | Tú las pegaste en Supabase; el agente las generó (`supabase/templates/`) | ✅ 26-10-2026: cuerpos y asuntos verificados con correos reales (Crear cuenta, Contraseña nueva y Change email address, cada enlace abierto en otro navegador). Magic link, Invite user y Reauthentication no se probaron: la tienda no los envía |
| T5 | SMTP propio en Supabase Auth | Tú | ✅ 26-10-2026: Resend (`smtp.resend.com:465`, remitente *Almacén* en `mail.audazia.dev`). Verificado: el correo llega a un buzón externo y el límite de envíos de Auth pasó de 2 por hora a 30. Antes, el SMTP por defecto respondía 429 a cualquier dirección fuera del equipo |

## Lo que cambió en la 7.0 y conviene que sepas

- **Desde ahora, cada pedido guarda su historial** (cuándo se creó, pagó, preparó, envió, entregó o anuló, y quién lo hizo). Los pedidos de prueba 1001–1036 no lo tienen: en la administración se verá armado con sus fechas.
- **Los pedidos que anula el cron quedan con el motivo *vencido*.** Servirá para el correo *Anulamos tu pedido* (decisión 6).
- **La fecha de entrega se calcula igual en todas partes** (Confirmación, Mis pedidos, administración). Con el despacho express, la Confirmación ahora dice *Llega el martes 27 de octubre* en vez de *Llega mañana… si pagas antes de las 14:00*, que ya no tenía sentido después de pagar.

## Textos propuestos en la 7.1 (sin diseño) · T2 ✅ aprobados (26-10-2026)

Mis pedidos y Detalle de pedido quedaron listos el 25-10-2026 (D-026). Estos textos no están en el canvas: los propuse yo. Si quieres cambiar alguno, dime cuál y cómo; cada uno es una línea en `src/lib/orders/customer-view.ts` o en la página.

| Dónde | Caso | Texto propuesto |
|---|---|---|
| Línea del pedido (B24) | Pago pendiente con tarjeta o Flow | *Paga $21.970 hasta el lunes 26 de octubre a las 09:30* |
| Línea del pedido | Pendiente que ya venció, antes de que el cron lo anule (puede durar hasta un día con el cron diario) | *Venció el plazo para pagar. No hicimos ningún cargo* |
| Línea del pedido | Anulado porque venció, con tarjeta o Flow (con transferencia se usa el del diseño: *La transferencia no llegó a tiempo. No hicimos ningún cargo*) | *Venció el plazo para pagar. No hicimos ningún cargo* |
| Línea del pedido | Anulado por el cliente (`cliente`) | *Anulaste el pedido. No hicimos ningún cargo* |
| Línea del pedido | Anulado por la tienda (`tienda`) sin cobro / con cobro y el reembolso todavía pendiente. Si la tienda escribe una nota (`cancel_note`), se muestra la nota | *Anulamos el pedido. No hicimos ningún cargo* / *Anulamos el pedido. Te vamos a devolver $X* |
| Línea del pedido | Anulado con el pago devuelto porque llegó tarde (B13, pedido 1030). El plan decía *Anulado · pago devuelto*: el badge queda *Anulado* y la línea lo explica | *Te devolvimos $11.980 el domingo 25 de octubre: el pago llegó después del plazo* |
| Línea del pedido | En camino con la fecha estimada ya pasada | *Está en camino* |
| Línea del pedido | Entregado en un retiro en tienda | *Retirado el martes 27 de octubre* |
| Mis pedidos | Subtítulo (el diseño dice *6 pedidos en los últimos 6 meses*, pero no se filtra por fecha) | *30 pedidos* |
| Mis pedidos | Estado vacío | Título *Todavía no tienes pedidos* · *Cuando compres, aquí vas a ver el estado de cada pedido y cuándo llega. Si compraste como invitado, el detalle está en el correo que te enviamos.* · botón *Explorar la tienda* |
| Detalle | Seguimiento: paso *Preparado* en curso | *Lo estamos preparando* |
| Detalle | Seguimiento: fecha del paso *Entregado* antes de entregar | *Estimado: martes 27 de octubre* (el diseño dice *Mañana, viernes 23 de octubre*; sin el *mañana* relativo, D-025) |
| Detalle | Seguimiento del retiro en tienda: pasos 3 y 4 | *Listo para retirar* · *Retirado* |
| Detalle | Pago pendiente: botón hacia la pantalla de pago | *Pagar $21.970* · con transferencia, *Ver datos para transferir* |

**Decisiones que tomé y conviene que sepas (D-026):**

- El menú de la cuenta muestra solo *Mis pedidos* y *Cerrar sesión* hasta que Direcciones, Favoritos y Datos personales existan (7.5), para no enlazar a páginas que dan 404.
- *Seguir el envío* no aparece hasta que decidas los transportistas (decisión 2). El seguimiento ya muestra *Despacha Starken · Código de seguimiento …* si el pedido tiene transportista y código.
- *Necesito ayuda con este pedido* abre un correo a la tienda con *Pedido N.º …* en el asunto (las páginas de Ayuda aún no existen). *Descargar boleta* queda oculto (D-012).
- *Volver a comprar* lleva a la Ficha del producto, como en el diseño: ahí se elige la variante y se ven el precio y el stock de hoy.
- Un invitado que entra a `/cuenta/pedidos` va a Ingresar: sus pedidos los ve en la Confirmación y en el correo hasta la 7.2.

## Textos propuestos en la 7.2 (sin diseño) · T3 ✅ aprobados (26-10-2026)

La 7.2 quedó lista el 26-10-2026 (D-027). Como Supabase exige confirmar el correo, el invitado no queda con la cuenta lista al pulsar *Crear cuenta*, y el aviso del diseño (*Listo, creamos tu cuenta · Ingresaste como …*) no sería cierto. Estos textos los propuse yo; cada uno es una línea en `src/lib/auth/guest-account.ts`.

| Caso | Texto propuesto |
|---|---|
| Después de *Crear cuenta*, y al volver a la Confirmación mientras no confirme (reemplaza *Listo, creamos tu cuenta*) | **Revisa tu correo para terminar** · *Te enviamos un correo a … para confirmar tu cuenta. Cuando abras el enlace, vas a ver este pedido en Mis pedidos. Si no lo ves, revisa la carpeta de spam.* · botón *Reenviar el correo* → *Te enviamos el correo de nuevo.* |
| El correo del pedido ya tiene una cuenta (no se suman los pedidos, para no exponer datos si alguien escribió un correo ajeno) | **Ya hay una cuenta con …** · *Ingresa con ella para tus próximas compras. Este pedido no se suma a esa cuenta, pero tienes el detalle en tu correo.* · enlace *Ingresar* |
| Supabase no pudo enviar el correo | *No pudimos enviarte el correo para confirmar tu cuenta. Vuelve a intentarlo en unos minutos.* |
| Sesión vencida, pedido ajeno o sin pagar | *No pudimos crear tu cuenta desde este pedido. Recarga la página y vuelve a intentarlo.* |

**Decisiones que tomé y conviene que sepas (D-027):**

- *Ver estado del pedido* solo aparece con una cuenta (en la Confirmación y en Transferencia pendiente). Al invitado no se le muestra: lo mandaría a Ingresar.
- El nombre de la cuenta es el destinatario del pedido (*Hola, Rocío*), porque el invitado no escribe otro.
- *Recibir novedades* se guarda igual que en Crear cuenta (en los datos del usuario), sin columna nueva ni envíos, hasta tu decisión 7b.

