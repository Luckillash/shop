---
title: "Lo que le toca al dueño en la fase 7"
description: "Decisiones y tareas del dueño durante la fase 7 (postcompra y operación): etiquetas de la administración, transportistas, reseñas, cuenta admin, anulación de transferencias pagadas, correo de pedido vencido, RUT y novedades. Cada una con la recomendación del agente, qué bloquea y su estado."
generated: "2026-10-25"
estado: "vigente"
related: ["_archivo/plan-fase-7.md", "_archivo/pendientes-del-dueno-fase-6.md", "_archivo/pendientes-antes-de-produccion.md", "02-arquitectura/decisiones.md", "08-estado/avance.md"]
---

# Lo que te toca a ti (fase 7)

La fase 7 avanza por subetapas ([plan](plan-fase-7.md)). La **7.0** (base: historial del pedido, motivo de anulación, estados y acceso de administración) quedó lista el 25-10-2026 y no necesitó nada de ti. La **7.1** (Mis pedidos y Detalle de pedido) quedó lista el mismo día: aprobaste sus textos propuestos (T2, 26-10-2026). La **7.2** (el invitado crea su cuenta desde la Confirmación) quedó lista el 26-10-2026: configuraste el SMTP propio y aprobaste sus textos (T3) y pegaste las plantillas de los correos de Supabase (T4). La **7.3** (correos de confirmación, despacho y anulación) quedó lista el 26-10-2026 con tus respuestas a las decisiones 2 y 6; aprobaste sus textos (T6) y volviste a pegar las plantillas de Supabase con el estilo nuevo (T7). Estas decisiones sí son tuyas; la columna *Bloquea* dice qué subetapa espera cada una. El 27-10-2026 respondiste la 3 (a, b y c), la 4, la 5, la 7a y la 7b: **la 7.4, la 7.5 y la 7.6 ya no esperan nada de ti**. Queda ⏳ solo la **7c**, que no bloquea ninguna subetapa (ver *Lo que dejan tus respuestas del 27-10-2026*, abajo). La **7.4** (administración de pedidos y alertas de pago) quedó lista el 27-10-2026 con tus decisiones 1, 4 y 5: te tocan T9 (quitarle el rol a la cuenta de prueba), T10 (sus textos propuestos) y T11 (mirar el cron del 27-10). La **7.5** (Direcciones, Favoritos y Datos personales) quedó lista el 27-10-2026 con tus decisiones 7a y 7b: te toca T12 (sus textos y propuestas). La **7.6** (reseñas) quedó lista el 28-10-2026 con tus decisiones 3a, 3b y 3c: te toca T14 (sus textos y propuestas) y T15 (el sitio respondía 402; ✅ lo redesplegaste el 28-10-2026). La **7.7** (*Los más vendidos*) quedó lista el 28-10-2026 con tu decisión de contar solo desde una fecha de inicio: te toca T17 (definir `BEST_SELLERS_SINCE` al lanzar y revisar sus propuestas). El 28-10-2026 pediste no quitarle todavía el rol a la cuenta de prueba (T9). La **7.8** (código HTTP real de `/cuenta/*` y limpieza de invitados) quedó lista el 28-10-2026 y **cierra la fase 7**: aprobaste el umbral (30 días), el tope (500) y dejarla detrás de `ANON_CLEANUP_ENABLED`; te toca T18 (autorizar el commit y, después, activar la limpieza).

| # | Decisión | Recomendación del agente | Bloquea | Estado |
|---|---|---|---|---|
| 1 | Etiqueta *Por preparar* para `paid` en la administración | Aprobarla. El cliente sigue viendo *En preparación* en `paid` y en `processing` | 7.4 (ya está en el código de la 7.0; cambiarla es una línea) | ✅ 26-10-2026: aprobada. En uso en la 7.4: badge, chip *Por preparar* y *Al confirmar, el pedido pasa a Por preparar* |
| 2 | Transportistas | Starken, Chilexpress, Blue Express, Correos de Chile y despacho propio. *Seguir el envío* enlaza a la página de seguimiento de cada uno; en despacho propio no hay enlace | 7.3, 7.4 y el botón *Seguir el envío* del Detalle de pedido | ✅ 26-10-2026: aprobada la lista. En la 7.3 (D-028) *Seguir el envío* abre la página de Starken, Chilexpress y Blue Express con el código; Correos de Chile no acepta el código en la URL, así que abre su página de seguimiento y el código se copia. El despacho propio aparece como *Despacha Almacén*, sin enlace |
| 3a | Solo opina quien compró el producto | Aprobarlo | 7.6 | ✅ 27-10-2026: sí, y solo con el pedido **entregado**. La política `reviews: compradores crean` hoy acepta `paid`, `processing`, `shipped` y `delivered`; la 7.6 la deja en `delivered` |
| 3b | La opinión se publica con el nombre de pila y la comuna de despacho (*Camila · Providencia*); en los retiros en tienda, sin comuna | Aprobarlo | 7.6 | ✅ 27-10-2026: aprobada. Nombre = primera palabra de `profiles.full_name`; comuna = `shipping_address` del pedido entregado con el producto |
| 3c | ¿Puede opinar un invitado? | **No**: no tiene nombre, su sesión se pierde y la limpieza de anónimos la borraría. Con la 7.2, crear la cuenta le toma un paso | 7.6 | ✅ 27-10-2026: no. La política de `reviews` exige `is_anonymous is not true` (hoy no lo revisa); al invitado, *Escribe tu opinión* le ofrece crear su cuenta, conserva sus pedidos y opina después |
| 4 | Qué cuenta se marca como `admin` | `prueba.fase5@almacen.cl` (para probar) y tu cuenta real (creada el 25-10-2026). **El agente no marca ninguna sin tu respuesta** | 7.4 (prueba de punta a punta) | ✅ 27-10-2026: ambas. `role = 'admin'` en `profiles` para `prueba.fase5@almacen.cl` y `lucassalazarc@outlook.com`. A la de prueba se le puede quitar el rol cuando termine la 7.4. Verificadas las dos el 27-10-2026 antes de empezar la 7.4; la 7.4 se probó solo con la de prueba (T9) |
| 5 | Anular un pedido pagado por transferencia (no hay pasarela que reembolse) | El modal dice *Devuélvele $X por transferencia* y el pedido pasa a *Reembolsado* cuando marcas *Ya devolví el dinero* | 7.4 | ✅ 27-10-2026: aprobada, y el correo *Anulamos tu pedido* de una transferencia pagada le pide al cliente responder con banco, tipo de cuenta, número y RUT. La tienda no guarda datos bancarios del cliente. ✅ Hecho en la 7.4 (D-029): probado con el 1045 (correo real y *Ya devolví el dinero* → *Reembolsado*) |
| 6 | Correo *Anulamos tu pedido* cuando el pedido vence | **(a)** Solo a las transferencias vencidas. (b) también a los pedidos abandonados con tarjeta o Flow (vencen a los 30 minutos; puede sonar a spam) | 7.3 | ✅ 26-10-2026: **(a)**. El cron envía *Anulamos tu pedido* solo a las transferencias vencidas |
| 7a | RUT en `profiles` (B22) | Sí: Datos personales ya lo muestra | 7.5 | ✅ 27-10-2026: sí, opcional. Columna `profiles.rut` validada; se edita en Datos personales y autocompleta el checkout. El checkout no lo guarda en el perfil por su cuenta. **En uso desde la 7.5** |
| 7b | *Recibir novedades* (B21) | Solo una marca en `profiles` | 7.5 (la 7.2 la dejó en `user_metadata.newsletter`, igual que Crear cuenta, sin columna nueva) | ✅ 27-10-2026: una **fecha** en `profiles` (`newsletter_opt_in_at`; vacía = no quiere), para saber desde cuándo aceptó. La 7.5 copia lo que hay en `user_metadata.newsletter` y Datos personales lo activa o desactiva. **En uso desde la 7.5** |
| 7c | Suscripción del footer (B21) | Dejarla deshabilitada hasta elegir un proveedor de newsletter | Nada | ⏳ |

## Tareas

| # | Tarea | Quién | Estado |
|---|---|---|---|
| T1 | Revisar la primera ejecución del cron `/api/cron/expirar-pedidos` (26-10 a las 06:00 de Chile): debe dar 200, no 401. Cierra la tarea 7 de los [pendientes del despliegue](pendientes-del-despliegue.md) | El agente, con el MCP de Vercel | ✅ 26-10-2026: corrió a las 09:00:47 UTC con `{ checked: 0, cancelled: 0, recovered: 0, skipped: 0 }` (200; el log solo sale con el secreto válido) |
| T2 | Revisar los textos propuestos de la 7.1 (abajo) | Tú | ✅ 26-10-2026: aprobados todos sin cambios (se descartaron *Falta pagar $X…*, *El pago no se completó a tiempo…*, el plazo del banco en el reembolso, poner la causa antes del monto, *en los últimos 6 meses* con filtro, el estado vacío sin la frase del invitado, *Listo en la tienda* y *Se atrasó un poco…*) |
| T3 | Revisar los textos propuestos de la 7.2 (abajo) | Tú | ✅ 26-10-2026: aprobados los cuatro sin cambios (se descartaron las alternativas *Confirma tu correo para terminar*, el enlace a *¿Olvidaste tu contraseña?*, *Ya tienes una cuenta* y las versiones con *Tu pedido está confirmado igual* y *crea tu cuenta desde Ingresar*) |
| T4 | Plantillas de los correos de Supabase Auth en español | Tú las pegaste en Supabase; el agente las generó (`supabase/templates/`) | ✅ 26-10-2026: cuerpos y asuntos verificados con correos reales (Crear cuenta, Contraseña nueva y Change email address, cada enlace abierto en otro navegador). Magic link, Invite user y Reauthentication no se probaron: la tienda no los envía |
| T5 | SMTP propio en Supabase Auth | Tú | ✅ 26-10-2026: Resend (`smtp.resend.com:465`, remitente *Almacén* en `mail.audazia.dev`). Verificado: el correo llega a un buzón externo y el límite de envíos de Auth pasó de 2 por hora a 30. Antes, el SMTP por defecto respondía 429 a cualquier dirección fuera del equipo |
| T6 | Revisar los textos propuestos de la 7.3 (abajo) | Tú | ✅ 26-10-2026: aprobados todos sin cambios (se descartaron el botón *Ver el pedido* o quitar la línea para el invitado en el despacho, la frase *Si no estás…* genérica o solo para Starken, *Nosotros llevamos tu pedido*, *Ya puedes retirar tu pedido*, *en Webpay Plus*, avisar por correo cuando el reembolso esté hecho o mandar el correo solo después del reembolso, *El pago no se completó, así que no se cobró nada* o solo el título, y la nota obligatoria al anular). El *escríbenos* en vez de *respóndenos* sigue atado a T8 |
| T7 | Volver a pegar los cuerpos de las 6 plantillas de Supabase Auth (`supabase/templates/`): la 7.3 les dio el estilo nuevo de los correos (logo en Georgia, márgenes del diseño). Los asuntos no cambian. Después conviene un *¿Olvidaste tu contraseña?* de prueba | Tú | ✅ 26-10-2026 (21:02 de Chile): pegadas por ti. Verificado con un *¿Olvidaste tu contraseña?* real a `almacen.invitado72@mailinator.com`: llega *Crea una contraseña nueva* con el estilo nuevo y el enlace `token_hash` a `audazia.dev`. Las otras 5 no se enviaron (mismo cambio de estilo) |
| T8 | (Opcional) Un buzón real para las respuestas de los correos (por ejemplo `hola@` en tu dominio). Con él, los correos pueden decir *respóndenos con el comprobante* y *responde este correo*, como el diseño; hoy dicen *escríbenos a hola@almacen.cl*, que es el correo de ejemplo de la tienda (bloque 4 de los pendientes de producción). **Desde la decisión 5 (27-10-2026) importa más:** el cliente con una transferencia anulada manda sus datos bancarios a ese correo, así que antes de producción tiene que ser un buzón real que tú leas (o el correo de contacto real del bloque 4) | Tú | ⏳ |
| T9 | Quitarle el rol `admin` a `prueba.fase5@almacen.cl` cuando termine la prueba de la 7.4 (decisión 4). Si no, se va igual al borrar los usuarios de prueba antes de producción (bloque 6 de los pendientes de producción) | El agente, con tu aviso | ⏳ La 7.4 terminó el 27-10-2026: dime si se lo quito. Para la prueba le cambié la contraseña con la API de administración, y también a `almacen.registro72@mailinator.com` (el cliente con que se comprobó el 404); las contraseñas no se anotan aquí |
| T10 | Revisar los textos propuestos de la 7.4 (abajo) | Tú | ⏳ |
| T11 | Revisar en Vercel → *Cron Jobs* (o los logs del dashboard) si `/api/cron/expirar-pedidos` corrió el 27-10 a las 09:00 UTC. Con el MCP de Vercel solo aparece la ejecución del 26-10 (200); del 27-10 no hay ningún log en el proyecto, y la ruta solo escribe el log con el secreto válido, así que no se sabe si corrió con 401, si no corrió o si se perdió el log. Elegiste seguir con la 7.4 (27-10-2026) | Tú | ⏳ Revisado otra vez antes de la 7.5 (27-10-2026, 22:37 UTC): sigue sin aparecer; elegiste seguir. Antes de la 7.6 (28-10-2026, 03:30 UTC): el del 27-10 sigue sin aparecer (ni logs entre 08:55 y 09:10 UTC ni eventos en la BD) y el del 28-10 todavía no corría; elegiste seguir. Antes de la 7.8 (28-10-2026, 04:53 UTC): el del 28-10 todavía no corría (09:00 UTC; en Hobby puede ser hasta las 09:59) y el del 29-10 es mañana; elegiste seguir y revisarlo al final. **Pendiente:** confirmar con el MCP de Vercel que el 28-10 y el 29-10 hay un `[cron] expirar-pedidos` con 200 (con el deploy de la 7.8, además un `[cron] limpiar-anonimos`). Ver T15 |
| T12 | Revisar los textos y las propuestas de la 7.5 (abajo) | Tú | ⏳ |
| T13 | Contraseñas de las cuentas de prueba de la 7.5: `almacen.registro72@mailinator.com` (cambiada con la API y después desde Datos personales) y `almacen.invitado72@mailinator.com` (con la API). Te las di en el chat; no se anotan aquí | — | ℹ️ |
| T14 | Revisar los textos y las propuestas de la 7.6 (abajo) | Tú | ⏳ |
| T15 | **`audazia.dev` responde 402 `DEPLOYMENT_DISABLED`** (revisado el 28-10-2026 a las 04:06 UTC): Vercel tiene el proyecto `shop` como `live: false` aunque el último deploy está `READY`. Suele ser el proyecto pausado o un límite del plan Hobby. Puede explicar que el cron del 27-10 no apareciera (T11). Revísalo en Vercel → *Usage* y el proyecto; el agente no lo toca | Tú | ✅ 28-10-2026: redesplegaste el sitio (deploy `dpl_DeRxtC8unXH4EqirnF8FaQyorEsp`, commit `33c67a1` *7.4 - 7.5 - 7.6*). Verificado a las 04:22 UTC: rutas con el código esperado, Ficha con las opiniones nuevas, modal y elegibilidad funcionando con sesión, páginas de la 7.5, 390 px sin desborde, sin errores en los logs salvo Redis (esperado). El cron se confirma en la próxima ejecución (09:00 UTC) |
| T16 | Contraseñas de las cuentas de prueba de la 7.6: se cambiaron otra vez con la API de administración las de `almacen.registro72.com` y `almacen.invitado72.com`. Te las di en el chat; no se anotan aquí | — | ℹ️ |
| T17 | ***Los más vendidos* (7.7):** (1) al lanzar, define `BEST_SELLERS_SINCE` en Vercel → *Settings → Environment Variables* → Production con la fecha de lanzamiento (por ejemplo `2026-11-15T00:00:00-03:00`) y redespliega; hasta entonces el Inicio muestra *Destacados*. (2) Revisa las propuestas de la 7.7 (abajo) | Tú | ⏳ |
| T18 | **Limpieza de invitados (7.8):** (1) ~~dime si hago el commit de la 7.8~~ ✅ lo subiste el 28-10-2026 (`b24396d`, desplegado y verificado). Al desplegar **no borra nada**: sin `ANON_CLEANUP_ENABLED`, el cron solo registra cuántos borraría (`[cron] limpiar-anonimos { checked, deleted: 0, dryRun: true }`). (2) Cuando veas un par de esos logs y te parezca bien, define `ANON_CLEANUP_ENABLED=true` en Vercel → *Settings → Environment Variables* → Production y redespliega. Desde ahí borra cada día los invitados sin pedidos con 30 días sin actividad (hasta 500). Al 28-10-2026 no hay ninguno con más de 30 días (el más antiguo es del 25-10-2026) | Tú | ⏳ Falta el paso (2) |
| T19 | Contraseña de prueba de la 7.8: se cambió otra vez con la API de administración la de `almacen.registro72@mailinator.com` (para probar *ingresar y volver*). Te la di en el chat; no se anota aquí | — | ℹ️ |

## Lo que dejan tus respuestas del 27-10-2026

| Decisión | Ya hecho | Lo hace | Qué falta |
|---|---|---|---|
| 4 · Cuentas admin | ✅ `profiles.role = 'admin'` para `prueba.fase5@almacen.cl` y `lucassalazarc@outlook.com` (verificado con el `UPDATE … returning` y otra vez antes de la 7.4). Las demás cuentas siguen `customer` | — | Quitar el rol a la de prueba (T9): la 7.4 ya terminó |
| 5 · Anular una transferencia pagada | ✅ 7.4 (27-10-2026, D-029) | 7.4 | Modal *Devuélvele $X por transferencia*; *Ya devolví el dinero* → `refunded`. Si se marca *Avisar al cliente*, el correo de anulación de una transferencia pagada y sin devolver le pide banco, tipo de cuenta, número y RUT, y le dice a qué correo escribir. La tienda no guarda datos bancarios. **Los correos no tienen `reply_to`** (`src/lib/email`), y el contacto de `STORE` (`hola@almacen.cl`) es de ejemplo: el texto dice *escríbenos a …* hasta T8 |
| 7a · RUT en `profiles` | ✅ 7.5 (27-10-2026, D-030, M10) | 7.5 | `profiles.rut` opcional (check de formato + dígito verificador en la app), editable en Datos personales; el checkout lo precarga y no lo escribe (probado con el 1048) |
| 3a · Solo opina quien recibió el producto | ✅ 7.6 (28-10-2026, D-031, M11) | 7.6 | La política `reviews: compradores crean` exige un pedido `delivered` con el producto. *Escribir una opinión* está siempre en la Ficha; al tocarlo, quien no tiene el producto entregado ve *Puedes opinar cuando recibas este producto* |
| 3b · Firma *Camila · Providencia* | ✅ 7.6 (28-10-2026, D-031, M11) | 7.6 | El trigger `set_review_author` copia en `reviews` el nombre (`first_name` o la primera palabra de `full_name`) y la comuna del pedido entregado más reciente con el producto (sin comuna en el retiro). Si no hay nombre, el modal lo pide y lo guarda en Datos personales |
| 3c · El invitado no opina | ✅ 7.6 (28-10-2026, D-031, M11) | 7.6 | La política exige `is_anonymous is not true`. Al invitado, el modal le ofrece crear su cuenta (con el formulario de la 7.2) |
| 7b · *Recibir novedades* | ✅ 7.5 (27-10-2026, D-030, M10) | 7.5 | `profiles.newsletter_opt_in_at` (la fecha la pone la BD). Copiadas las 2 cuentas con `user_metadata.newsletter = true` (con la fecha de creación); Crear cuenta (vía `handle_new_user`), la conversión del invitado y *Correos de la tienda* escriben la columna. No se envía nada hasta la 7c; cada envío futuro deberá traer cómo darse de baja |
| 7c · Suscripción del footer | — | — | ⏳ Tu respuesta. Recomendación: dejarla deshabilitada hasta elegir un proveedor de newsletter |

## Lo que cambió en la 7.0 y conviene que sepas

- **Desde ahora, cada pedido guarda su historial** (cuándo se creó, pagó, preparó, envió, entregó o anuló, y quién lo hizo). Los pedidos de prueba 1001–1036 no lo tienen: en la administración se verá armado con sus fechas.
- **Los pedidos que anula el cron quedan con el motivo *vencido*.** Servirá para el correo *Anulamos tu pedido* (decisión 6; ✅ en la 7.3 solo a las transferencias).
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
- *Seguir el envío* no aparece hasta que decidas los transportistas (decisión 2; ✅ aparece desde la 7.3). El seguimiento ya muestra *Despacha Starken · Código de seguimiento …* si el pedido tiene transportista y código.
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

## Textos propuestos en la 7.3 (sin diseño) · T6 ✅ aprobados (26-10-2026)

Los correos siguen los artboards `CorreoConfirmacion`, `CorreoDespacho` y `CorreoAnulacion` (D-028). Estos textos no están en el canvas o cambian algo de él: los propuse yo. Cada uno es una línea en `src/lib/email/templates.ts`.

| Correo | Caso | Texto propuesto |
|---|---|---|
| Confirmación | Pagado con cupón | Fila *Descuento −$1.249* antes del despacho (el artboard no la tiene y el total no cuadraría) |
| Confirmación | Retiro en tienda | *…Ahora lo preparamos y te avisamos cuando esté listo para retirar.* · bloque con *Disponible desde el …* y el horario y la dirección del local · fila *Retiro: Gratis* |
| Confirmación | Medio de pago | *con tarjeta de débito vía Webpay Plus* (el texto que ya usa la app; el artboard dice *en Webpay Plus*) |
| Despacho | Invitado (no tiene Mis pedidos) | *Puedes ver el detalle en la página del pedido.* (el enlace va a la Confirmación) |
| Despacho | Despacho propio | *Hola, Camila. Tu pedido N.º 1040 salió con nuestro despacho. Llega el …* · código sin *Seguir el envío* |
| Despacho | Retiro en tienda (la Confirmación promete *Recibirás un correo cuando puedas retirarlo*) | Asunto *Tu pedido N.º … está listo para retirar* · *Hola, Camila. Tu pedido N.º … ya está en la tienda Local Tajamar. Retira con tu RUT y número de pedido.* · dirección y horario |
| Despacho | Frase del artboard *Si no vas a estar, Starken deja un aviso y lo intenta de nuevo al día hábil siguiente* | **Se quitó**: depende de la política de cada transportista y no la verifiqué. Si la quieres, dime el texto por transportista |
| Anulación | Vencido con tarjeta o Flow (hoy no se envía, decisión 6a) | *El pago no se completó antes del …, así que liberamos los productos y anulamos el pedido.* · vista previa *Venció el plazo para pagar* |
| Anulación | Por la tienda sin nota | *Tuvimos que anular tu pedido. Lo sentimos.* (con nota, la nota es el motivo, como en Mis pedidos) |
| Anulación | Pagado, reembolso todavía no hecho | *Te vamos a devolver $X* · *Lo devolvemos por el mismo medio con el que pagaste.* |
| Anulación | Reembolso en Flow / por transferencia | *El reembolso ya está hecho en Flow. Según tu banco, puede tardar unos días hábiles en verse en tu cuenta.* / *Te lo devolvimos por transferencia bancaria.* (decisión 5 ✅ 27-10-2026: mientras el reembolso esté pendiente, el correo de una transferencia pagada además le pide al cliente sus datos bancarios; la 7.4 agrega ese texto) |
| Anulación | Sin cobro y sin transferencia (por ejemplo, el cliente anula antes de pagar) | *No hicimos ningún cargo* · *No tienes nada más que hacer.* |
| Anulación | Transferencia vencida y el pie | *Si ya transferiste, escríbenos a hola@almacen.cl con el comprobante…* y *Si tienes dudas, escríbenos a hola@almacen.cl.* en vez de *respóndenos* / *responde este correo* (T8) |

**Decisiones que tomé y conviene que sepas (D-028):**

- *Ver el pedido* lleva a Mis pedidos si el cliente tiene cuenta y a la Confirmación si compró como invitado. El correo de transferencia y el de pago devuelto siguen llevando a la página del pedido, porque ahí están los datos para transferir.
- Cada correo enviado queda en el historial del pedido (lo verás en la administración, 7.4).
- Mailinator no muestra los correos con «pedido» en el asunto (todos los nuestros lo llevan): los revisé en maildrop.cc. A tus clientes les llegan normal; es un filtro de esa bandeja pública.

## Textos propuestos en la 7.4 (sin diseño) · T10 ⏳

La administración sigue los artboards `AdminHeader`, `AdminPedidos`, `AdminPedido`, `AdminAnularPedido`, `AdminAlertas` y `AdminPedidoMovil` (D-029). Estos textos no están en el canvas o cambian algo de él: los propuse yo. Están en `src/lib/admin/` (lista, alertas, validaciones y avisos), en las páginas de `src/app/admin/` y uno en `src/lib/email/templates.ts`.

| Dónde | Caso | Texto propuesto |
|---|---|---|
| **Correo** *Anulamos tu pedido* | Transferencia pagada y todavía sin devolver (decisión 5) | *Te vamos a devolver $13.980* · *Te lo devolvemos por transferencia. Escríbenos a hola@almacen.cl con tu banco, el tipo de cuenta, el número de cuenta y tu RUT.* (*escríbenos*, no *respóndenos*: T8) |
| Anular pedido | Opciones del motivo (lo que lee el cliente) | *No hay stock de un producto* → «Nos quedamos sin stock de un producto del pedido.» · *No se puede despachar a esa dirección* → «No podemos despachar a la dirección del pedido.» · *Lo pidió el cliente* → «Anulamos el pedido como nos pediste.» · *Otro motivo* (lo escribes tú, de tú, hasta 200 caracteres) · *Sin motivo* → el cliente lee «Tuvimos que anular tu pedido. Lo sentimos.» |
| Anular pedido | Ayuda bajo el motivo | *Lo verá el cliente en el correo de anulación y en Mis pedidos.* · con *Sin motivo*: *El cliente leerá «Tuvimos que anular tu pedido. Lo sentimos.»* · con *Otro motivo*: *Escríbelo para el cliente, de tú.* |
| Anular pedido | Aviso *Esto no se puede deshacer* según el dinero | Pasarela: *Devolveremos $X en Webpay Plus y los productos volverán al stock. El reembolso puede tardar unos días hábiles en verse en la tarjeta.* (artboard; con Flow, *en la cuenta*) · Transferencia: *Devuélvele $X por transferencia. Los productos volverán al stock. Cuando hagas la transferencia, marca Ya devolví el dinero en el pedido.* · Sin pago: *Los productos volverán al stock. No hay nada que devolver: el pedido no está pagado.* Botón: *Anular y reembolsar* solo con pasarela; si no, *Anular pedido* |
| Pedido | Transferencia con la reserva vencida (el cron es diario) | *La reserva venció el …: si la transferencia llegó antes, puedes confirmarla igual.* |
| Pedido | Tarjeta o Flow pendiente | **Esperando el pago** · *El cliente está pagando con Flow. Si no paga antes del …, el pedido se anula solo y los productos vuelven al stock.* (sin acción) |
| Pedido | Anulado con el pago sin devolver (1042, reembolso fallido) | **Devuelve el pago** · *El pedido está anulado, pero el pago de $16.480 en Flow no se devolvió.* · botón *Reembolsar $16.480 en Flow* |
| Pedido | Transferencia anulada sin devolver | **Devuélvele $13.980 por transferencia** · *Pídele al cliente su banco, el tipo de cuenta, el número de cuenta y su RUT: si le avisaste por correo, te los envía a hola@almacen.cl. Cuando hagas la transferencia, márcalo aquí.* · botón *Ya devolví el dinero* |
| Pedido | Retiro en tienda | **Avisa que está listo para retirar** · *Cuando esté empacado en el Local Tajamar, márcalo y le avisamos al cliente por correo que puede retirarlo.* · *Marcar como listo para retirar* → **Confirma el retiro** · *Marcar como retirado* |
| Pedido | Entregado / anulado | **Nada pendiente** + *Entregado el …* (o *Retirado*) · anulado: *Pedido anulado el …* con el motivo, *Los productos volvieron al inventario y el reembolso de $X en Webpay Plus se completó.* (o *No hubo cobro.*) y *Le avisamos al cliente por correo.* si se envió |
| Pedido | Cliente | *Con cuenta* / *Compró como invitado* · *Primer pedido* / *1 pedido anterior* / *N pedidos anteriores* (por el correo) |
| Pedido | Intentos de pago | *Pendiente*, *Pagado*, *No se completó* (el artboard dice *Rechazado*, pero también son vencidos o reemplazados), *Reembolsado* y *Por devolver* |
| Pedido | Historial | *Transferencia confirmada · N.º de operación …*, *Correo de pedido confirmado*, *Correo de despacho* (*de listo para retirar*), *Correo de anulación*, *Pago de $X devuelto en Flow*, *Devolución por transferencia de $X*, *Alerta resuelta: …*, *Anulado por la tienda · «nota»*; quién: *Cliente*, *Administración* o *Sistema* |
| Avisos | Después de cada acción | *Listo: confirmamos el pago y el pedido quedó por preparar. Le enviamos al cliente el correo de pedido confirmado.* · *Listo: el pedido quedó en preparación.* · *Listo: el pedido quedó en camino. Le enviamos al cliente el correo con el seguimiento.* · *Listo: le avisamos al cliente por correo que puede retirarlo.* · *Listo: el pedido quedó entregado.* (*retirado*) · *Listo: anulamos el pedido y devolvimos $X en Webpay Plus.* · *Anulamos el pedido, pero el reembolso en Flow falló y quedó una alerta de pago. Vuelve a intentarlo desde aquí.* · *Anulamos el pedido. Devuélvele $X por transferencia y después marca Ya devolví el dinero.* · *Listo: el pedido quedó reembolsado.* · *Alerta resuelta.* |
| Avisos | Errores | *Tu sesión de administración terminó. Vuelve a ingresar para seguir.* · *El pedido cambió mientras lo mirabas. Recarga la página para ver cómo quedó.* · *No pudimos guardar el cambio. Vuelve a intentarlo en unos minutos.* · *El reembolso en Flow falló y quedó una alerta de pago con la respuesta de Flow. Vuelve a intentarlo más tarde, o hazlo a mano en su panel y marca la alerta como resuelta.* · campos: *Escribe solo letras y números, sin símbolos.*, *Elige el transportista.*, *Escribe el código de seguimiento.*, *Escribe el motivo que va a leer el cliente.* |
| Pedidos | Lista | Filtro *Necesitan una acción* con los pagos por devolver (botón *Devolver el pago*) · aviso de alertas: *1 reembolso fallido y 2 pagos después de anular.* · sin resultados: *No hay pedidos en este filtro.* / *No hay pedidos con «…» en todos.* · notas: *Vence el …* / *Venció el …*, *Pagado el …*, *Anulado por la tienda · falta devolver $X*, *Venció · pago devuelto*, *Lo anuló el cliente*, *Devuelto el …* |
| Alertas | Reembolso fallido (cambia el artboard) | *El reembolso en Flow respondió con un error. El cliente todavía tiene el cargo.* · Qué hacer: *Vuelve a intentar el reembolso desde el pedido. Si falla otra vez, hazlo a mano en el panel de Flow y avísale al cliente por correo. Después marca la alerta como resuelta.* · *Respuesta de Flow: …* |
| Alertas | Monto distinto (`amount_mismatch`, sin artboard) | **El pago no coincide con el pedido** · *Flow confirmó un monto o una orden distintos a los del intento. No se marcó como pagado y se intentó devolver.* · Qué hacer: *Revisa el pago en el panel de Flow y confirma que se devolvió. Si el cliente escribe, que vuelva a pagar desde el pedido.* |
| Alertas | Sin alertas | *No hay alertas sin resolver. Todo está en orden.* / *Todavía no hay alertas resueltas.* |

**Decisiones que tomé y conviene que sepas (D-029):**

- Un pedido anulado con el pago sin devolver (como el 1042) se reembolsa desde su página: *Reembolsar $X en Flow*. Así también se reintenta un reembolso que falló. La alerta no se cierra sola: la cierras tú.
- Si Webpay no responde a tiempo al reembolso, la tienda consulta a Transbank antes de darlo por fallido: el 1029 se devolvió aunque la respuesta llegó tarde (trampa 83).
- Flow sandbox rechazó el reembolso del 1042 por falta de fondos en el comercio de prueba (trampa 84): queda anulado, con el pago sin devolver y la alerta abierta, como estaba.
- Con una transferencia anulada, el pedido queda *Anulado* hasta que marcas *Ya devolví el dinero*; recién ahí pasa a *Reembolsado*. No se envía otro correo al marcarlo (si lo quieres, es el correo de anulación con *Te lo devolvimos por transferencia bancaria.*, que ya existe).
- La lista de pedidos en el móvil no tiene diseño: la tabla se desplaza a lo ancho.
- Había un `next start -p 3321` abierto desde antes de la sesión de la 7.4; en la 7.5 lo detuve con tu permiso para compilar (27-10-2026) y no lo volví a abrir.



## Textos y propuestas de la 7.5 (sin diseño) · T12 ⏳

Lo que no está en los artboards de Direcciones, Favoritos y Datos personales (D-030). Si no dices nada, quedan así.

**Direcciones**
- Estado vacío: *Todavía no tienes direcciones guardadas. Agrega una y la completamos por ti en el checkout.* (y el formulario debajo).
- Avisos: *Guardamos la dirección.* · *Guardamos los cambios de la dirección.* · *Listo: es tu dirección principal.* · *Eliminamos la dirección.* · *Puedes guardar hasta 10 direcciones. Elimina una para agregar otra.* · *No encontramos esa dirección. Recarga la página y vuelve a intentarlo.*
- Confirmar al eliminar, en la misma tarjeta: *¿Eliminar Casa? Tus pedidos no cambian.* + *Sí, eliminar* / *Cancelar*.
- Si eliminas la principal, la más reciente de las que quedan pasa a ser la principal.
- Tope de 10 direcciones por cliente.
- Una dirección sin nombre (las que se guardaron en el checkout) se titula con la comuna (*Providencia*).
- La primera dirección es la principal y la principal no se puede desmarcar: nota *Tu primera dirección es la principal.* / *Para cambiarla, elige otra como principal.*
- Error de comuna: *Elige la comuna.* (el del checkout dice *…para calcular la fecha de entrega*).

**Favoritos**
- Sin la frase del artboard *Te avisamos por aquí si alguno baja de precio o se agota*: ese aviso no existe. Si lo quieres, es una tarea aparte (y necesita un proveedor de correo, como la 7c).
- Al quitar uno: *Quitamos <producto> de tus favoritos.* + *Deshacer*.
- Un invitado o alguien sin sesión que toca el corazón va a Ingresar con el aviso *Ingresa o crea tu cuenta para guardar tus favoritos. Lo que elegiste se guarda al ingresar.*, y el producto **se guarda solo al ingresar** (propuesta). Si en vez de ingresar crea una cuenta nueva, el producto se pierde (tiene que confirmar el correo antes).

**Datos personales**
- Nombre y apellido van en columnas nuevas (`first_name`, `last_name`); el saludo sigue diciendo *Hola, <nombre>*. Las cuentas que nunca guardaron Datos personales ven su nombre completo partido en la primera palabra (nombre) y el resto (apellido) hasta que lo corrijan.
- Solo el nombre es obligatorio; apellido, teléfono y RUT son opcionales.
- *Correos de la tienda* se guarda al marcar o desmarcar: *Listo: te vamos a escribir con novedades y ofertas.* / *Listo: ya no te vamos a escribir con novedades.*
- Después de cambiar la contraseña: *Cambiamos tu contraseña. Cerramos tu sesión en los demás dispositivos.* Las otras sesiones caen al renovar su token (hasta 1 hora). Si activas *Secure password change* en Supabase y la sesión es antigua: *Por seguridad, vuelve a ingresar con tu contraseña actual y cámbiala de nuevo.*
- **Recomendación de seguridad (opcional):** hoy se puede cambiar la contraseña sin escribir la actual (así es el artboard). Activar *Secure password change* en Supabase → Authentication → Providers → Email obliga a haber ingresado hace poco; la app ya tiene el aviso para ese caso.
- La nota para eliminar la cuenta se muestra también en móvil. El correo de contacto sigue siendo `hola@almacen.cl` (de ejemplo, T8).

**Checkout**
- Sin dirección guardada, el checkout precarga también el nombre, el apellido y el teléfono de Datos personales (además del RUT).
- El checkout sigue precargando una sola dirección (la principal o la última); elegir entre varias no está en el diseño.

## Textos y propuestas de la 7.6 (sin diseño) · T14 ⏳

Lo que no está en los artboards `EscribirResena` y `Ficha` (D-031). Si no dices nada, quedan así.

**Quién ve qué al tocar *Escribir una opinión***
- Sin sesión: va a Ingresar y vuelve a las opiniones de la Ficha.
- Invitado: *Para opinar, crea tu cuenta* · *Las opiniones se publican con tu nombre. Al crear tu cuenta conservas tus pedidos; cuando recibas el producto, vuelve a esta ficha para opinar.* Debajo, el formulario de la 7.2 con el título *Crea tu cuenta* y *Solo falta una contraseña. El pedido N.º 1043 queda en tu cuenta.* Si el invitado no tiene pedidos: *Volver al producto* y *Ingresar o crear cuenta*.
- Cuenta sin el producto entregado (o que no lo compró): *Puedes opinar cuando recibas este producto.* · *Las opiniones son de quienes ya compraron y recibieron el producto. Si tu pedido va en camino, vuelve cuando llegue.* + *Volver al producto*. El botón no se oculta: para ocultarlo habría que consultar la sesión en cada Ficha.
- Mientras pregunta: *Revisando tu compra*. Si falla: *No pudimos revisar tu compra. Vuelve a intentarlo.* + *Volver a intentarlo*.

**Editar la propia** (el artboard dice *Puedes editarla cuando quieras desde ahí*)
- Quien ya opinó abre el mismo modal: *Edita tu opinión*, con lo suyo precargado y *Guardar cambios* (*Publicando* mientras guarda). Aviso: *Guardamos los cambios de tu opinión* · *Ya aparece así en la ficha de <producto>.* No hay *Eliminar* (no está en el diseño).
- Una por persona y producto: si de todas formas llega una segunda, *Ya publicaste una opinión de este producto. Puedes editarla desde su ficha.*

**Firma**
- Nombre (como el saludo) y comuna del pedido entregado más reciente con el producto; sin comuna si fue retiro en tienda. La pista dice la firma real: *Mínimo 20 caracteres. Se publica con tu nombre y comuna: Rocío · Providencia.* o *Se publica con tu nombre: María.*
- La firma queda la del momento de publicar: si después cambias tu nombre o recibes otro pedido, no cambia (tampoco al editar la opinión).
- Si la cuenta no tiene nombre, el modal pide *Tu nombre* (*Lo guardamos en tus datos personales para firmar tu opinión.*) y lo guarda.

**Errores**
- *Elige de 1 a 5 estrellas.* · *Escribe al menos 20 caracteres.* · *Tu opinión puede tener hasta 2000 caracteres.* · *Usa hasta 80 caracteres en el título.* · *Escribe tu nombre.* · *Publicaste varias opiniones seguidas. Espera unos minutos y vuelve a intentarlo.* (10 por hora) · *Tu sesión se cerró. Ingresa de nuevo para publicar tu opinión.* · *No pudimos publicar tu opinión. Vuelve a intentarlo.*
- Ninguna estrella viene marcada (el artboard muestra 4 como ejemplo).

**Ficha**
- Sin opiniones: *Todavía no hay opiniones de este producto. Las publican quienes ya lo recibieron.* y el botón, sin promedio.
- Con opiniones: promedio grande, estrellas, *Basado en 1 opinión* / *Basado en N opiniones*; cada tarjeta con *Compra verificada* y *Nombre · Comuna · 28 de octubre de 2026*.
- Se muestran las 10 más recientes, también en móvil (no hay *Ver las N opiniones* todavía).
- En móvil, el modal ocupa el ancho con 16 px de margen y se desplaza por dentro (no hay artboard móvil).

## Propuestas de la 7.7 (sin diseño) · T17 ⏳

Tu decisión del 28-10-2026: solo cuentan los pedidos pagados desde `BEST_SELLERS_SINCE` (opción b). Lo demás son criterios del agente (D-032) que puedes cambiar:

- **Qué cuenta:** pedidos `paid`, `processing`, `shipped` y `delivered`. Un pedido anulado o reembolsado deja de contar.
- **Ventana:** además de la fecha de inicio, solo los últimos 90 días.
- **Solo productos con stock:** un más vendido agotado no aparece en el Inicio.
- **Con 0 a 3 vendidos:** se muestra *Destacados* entero; no se mezclan vendidos y destacados bajo el título *Los más vendidos*.
- **Empate:** primero el de la venta más reciente.
- **Actualización:** el ranking se pone al día solo, a más tardar en una hora. Un pago no lo cambia al instante.
- **Sin orden *Más vendidos* en el Listado** por ahora (no es barato; queda anotado).

## Propuestas de la 7.8 (sin diseño) · T18 ⏳

La 7.8 no agrega textos a la interfaz. Lo que decidí yo (D-033) y puedes cambiar:

- **`volver` lleva también la query:** si entras sin sesión a `/cuenta/pedidos?pagina=2` (o a una URL de `/admin` con filtros), después de ingresar vuelves a esa misma URL. Antes, la administración volvía sin la query.
- **El invitado va a Ingresar**, igual que sin sesión (como en el Detalle). Ingresar no le muestra un aviso especial; si quieres uno (por ejemplo *Para ver tu cuenta, ingresa o crea una*), sería un texto nuevo.
- **30 días sin actividad, no desde que se creó:** un invitado que vuelve con su carro abierto renueva la sesión y no se borra. Se cuenta la creación, el último ingreso o el último refresco de su sesión.
- **Qué nunca se borra:** cuentas con correo (también el invitado que pidió crear su cuenta y no confirmó), admins y cualquiera con pedidos, cupones usados o registros en el historial.
- **Mismo cron:** vencer pedidos y limpiar invitados corren por separado en la misma ejecución diaria; si uno falla, el otro sigue, y la respuesta es 500 para que se note en Vercel.
