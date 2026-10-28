---
title: "Plan de la fase 7: postcompra y operación"
description: "Propuesta de subetapas de la fase 7 (Mis pedidos, invitado → cuenta, correos, administración, cuenta, reseñas, Los más vendidos), con su orden, dependencias, los criterios que aplica el agente y las decisiones del dueño. En curso: 7.0 a 7.6 listas."
generated: "2026-10-25"
estado: "en curso"
related: ["06-implementacion/hoja-de-ruta.md", "04-diseno/templates.md", "08-estado/avance.md", "_archivo/pendientes-antes-de-la-fase-7.md", "_archivo/prompt-inicio-fase-7.md", "02-arquitectura/decisiones.md", "07-referencia/brechas-diseno-vs-datos.md"]
---

# Plan de la fase 7: postcompra y operación

Propuesta del 25-10-2026. El dueño pidió empezar por la 7.0 el mismo día; las decisiones de abajo están también en [pendientes del dueño](pendientes-del-dueno-fase-7.md). Al 27-10-2026 solo queda ⏳ la 7c.

**Avance:** 7.0 ✅ (25-10-2026). La migración se llamó **M8** (M7 ya era `search_products`). 7.1 ✅ (25-10-2026): Mis pedidos y Detalle de pedido (D-026). 7.2 ✅ (26-10-2026): invitado → cuenta y *Ver estado del pedido* (D-027). 7.3 ✅ (26-10-2026): correos de confirmación, despacho y anulación (D-028), con las decisiones 2 y 6 respondidas. 7.4 ✅ (27-10-2026): administración de pedidos y alertas de pago (D-029, migración M9). 7.5 ✅ (27-10-2026): Direcciones, Favoritos y Datos personales (D-030, migración M10). 7.6 ✅ (28-10-2026): reseñas (D-031, migración M11).

## Pendiente previo: el cron ✅ (26-10-2026)

**Cerrado:** la primera ejecución fue el 26-10 a las 09:00:47 UTC, con 200 y `{ checked: 0, cancelled: 0, recovered: 0, skipped: 0 }`.

Historial: no se pudo cerrar antes porque el cron aún no había corrido. La revisión fue a las 01:26 UTC del 26-10 (22:26 del 25-10 en Chile). La primera ejecución de `0 9 * * *` es el 26-10 a las 09:00 UTC, o sea a las 06:00 de Chile. En los logs de producción de las 24 horas anteriores no aparece `/api/cron/expirar-pedidos`; sí aparecen `/checkout`, `/ingresar` y la confirmación de Flow. Se volvió a revisar a las 01:52 UTC del 26-10, antes de la 7.1: seguía sin correr (aún no le tocaba). El dueño eligió seguir con la 7.1; se revisa en la próxima sesión, después de las 06:00, y ahí se cierra la tarea 7 de los [pendientes del despliegue](pendientes-del-despliegue.md).

## Subetapas

Cada subetapa termina con tests de Vitest, `npm run lint` y `npm run build` sin errores, una prueba de punta a punta en local (Edge por CDP, a 1280 y 390 px) y la documentación al día: [avance](../08-estado/avance.md), [registro de cambios](../08-estado/registro-de-cambios.md), brechas, decisiones y `pendientes-del-dueno-fase-7.md`. Los pedidos de prueba nuevos van desde el **1037** y se anotan en el avance.

| # | Subetapa | Depende de | Contenido |
|---|---|---|---|
| **7.0** ✅ | Base | — | **Migración M8** (en el plan decía M7), idempotente y aplicada con `apply_migration`: tabla `order_events` para el historial (cuándo, qué, quién, datos), solo la lee el admin; `orders.cancel_reason` (tipo `vencio`/`tienda`/`cliente` más un texto que ve el cliente). Módulo `order-status.ts` con las etiquetas del cliente y de la administración y la tabla de transiciones permitidas. `requireAdmin()`. Fecha estimada de entrega (B25): se calcula desde `placed_at` o `paid_at` con los plazos por zona, sin columna nueva, y así coincide con la que vio el cliente |
| **7.1** ✅ | Mis pedidos y Detalle de pedido | 7.0 | ✅ 25-10-2026 (D-026; textos propuestos aprobados por el dueño el 26-10-2026, T2). Layout de `/cuenta` con su menú; `/cuenta` lleva a `/cuenta/pedidos`. Los 6 estados con su `Badge` y su línea (B24). Detalle con línea de tiempo, seguimiento, *Volver a comprar* y *Necesito ayuda*. *Descargar boleta* queda oculto hasta definir D-012 |
| **7.2** ✅ | Invitado → cuenta | 7.1 | ✅ 26-10-2026 (D-027): con la confirmación de correo activada el aviso es *Revisa tu correo para terminar* (aprobado por el dueño); correo con cuenta → *Ingresar*; *Ver estado del pedido* solo con cuenta; SMTP propio con Resend (dueño). Plan original: `ConfirmacionCrearCuenta` con `updateUser` sobre la sesión anónima, conservando el `user_id` y por lo tanto sus pedidos. *Ver estado del pedido* (B38). ⚠️ Con la confirmación de correo activa, Supabase puede exigir confirmar el correo antes de que la cuenta deje de ser anónima. Si es así, el aviso tendría que decir algo como *Te enviamos un correo para confirmar* y no *Listo, creamos tu cuenta*; se le propondrá ese texto al dueño. Si el correo ya tiene una cuenta, no se fusionan los pedidos (sería un riesgo de privacidad): se le pide ingresar |
| **7.3** ✅ | Correos | 7.0 | ✅ 26-10-2026 (D-028): `layout` del artboard con `viewport` (también en transferencia, pago devuelto y las plantillas de Supabase Auth), `orderShippedEmail` y `orderCancelledEmail` con sus 3 motivos, `sendOrderEmail` con registro en `order_events`, enlace según la cuenta, transportistas (decisión 2) y aviso de transferencias vencidas en el cron (decisión 6a). Plan original: ajustar el `layout` de `src/lib/email/templates.ts` a `CorreoConfirmacion`; correos `CorreoDespacho` y `CorreoAnulacion` con sus 3 motivos. Cada correo se prueba con un envío real desde `mail.audazia.dev` |
| **7.4** ✅ | Administración | 7.0, 7.3 y la cuenta admin | ✅ 27-10-2026 (D-029, M9): `/admin` con AdminHeader, AdminPedidos, AdminPedido (también móvil), AdminAnularPedido y AdminAlertas; una función SQL por acción con el admin como actor del historial; reembolso de pedidos ya anulados (1042) y reintento de reembolsos fallidos; decisión 5 con *Ya devolví el dinero*. Textos propuestos en T10. Plan original: `/admin` sin el header de la tienda (`AdminHeader`); acceso validado en el layout **y** en cada Server Action. Incluye `AdminPedidos` (chips con conteo, búsqueda por N.º o correo, *Ver más*), `AdminPedido` con sus 5 estados y el historial, confirmar transferencia con `settle_payment(…, 'paid', …)` y el N.º de operación, *Empezar a preparar*, *Marcar como enviado* (transportista y código, con correo), *Marcar como entregado*, `AdminAnularPedido` (`cancel_order` + reembolso con el código de la fase 6 + correo opcional), `AdminAlertas` (resolver) y `AdminPedidoMovil`. Las transiciones se validan en la acción |
| **7.5** ✅ | Direcciones, Favoritos y Datos personales | 7.1 | ✅ 27-10-2026 (D-030, M10): las tres páginas en el menú; corazón conectado sin volver dinámico el catálogo (invitado → Ingresar y se guarda al ingresar); `first_name`/`last_name`, `rut` y `newsletter_opt_in_at` en `profiles` con grant por columna; textos propuestos en T12. Plan original: CRUD de `addresses` con predeterminada; favoritos con estado vacío (un invitado debe ingresar, B23) y el corazón de la Ficha y de `ProductCard` conectado; datos personales (con `profiles.rut` opcional, decisión 7a ✅), cambio de contraseña y novedades (`profiles.newsletter_opt_in_at`, decisión 7b ✅) |
| **7.6** ✅ | Reseñas (B36) | 7.1 | ✅ 28-10-2026 (D-031, M11): modal *Escribe tu opinión* con la elegibilidad al abrirlo (sin sesión → Ingresar; invitado → crear su cuenta; sin pedido entregado → explicación), la propia se edita, el modal pide el nombre si falta, firma *Nombre · Comuna* puesta por el trigger `set_review_author`, política con `delivered` y sin anónimos, grant por columna, `updateTag` del producto y `revalidateTag('products', 'max')`. Textos propuestos en T14. Plan original: Modal `EscribirResena` en la Ficha. La elegibilidad se consulta al abrirlo, para que la Ficha siga siendo estática. Migración: el nombre y la comuna se copian en `reviews` con un trigger, para que el cliente no pueda inventarlos y `anon` no tenga que leer `profiles`; también se ajusta la política según la decisión 3 (✅ 27-10-2026: solo `delivered` y sin anónimos; firma *Nombre · Comuna*). Las opiniones reales reemplazan los placeholders y se invalida el tag del producto |
| **7.7** | *Los más vendidos* (B34) | — | Función `security definer` que devuelve solo los ids, cacheada con el tag `products`; si hay menos de 4, se muestran *Destacados* |
| **7.8** | Opcionales 🟢 | 7.1, 7.4 | Redirección optimista de `/cuenta/*` (también Direcciones, Favoritos y Datos personales de la 7.5) y `/admin/*` en el proxy; limpieza de usuarios anónimos sin pedidos de más de 30 días, aprovechando el cron diario |

### Lo que deja la 7.1 para las siguientes subetapas

| Subetapa | Pendiente | Dónde |
|---|---|---|
| Antes de la 7.2 ✅ | ~~Revisar la primera ejecución del cron (26-10 después de las 06:00 de Chile) y cerrar la tarea 7 del despliegue~~ Corrió el 26-10 a las 09:00:47 UTC (200) | T1 de [pendientes del dueño](pendientes-del-dueno-fase-7.md) |
| 7.2 ✅ | ~~Un invitado que entra a `/cuenta/*` va a Ingresar (D-026). Cuando convierta su sesión en cuenta, sus pedidos deben aparecer en Mis pedidos sin cambios~~ Probado el 26-10-2026 con el 1038: mismo `user_id`, pedido, dirección y carro | `src/app/(tienda)/cuenta/` |
| 7.3 ✅ | ~~El correo de despacho debe usar la misma fecha y el mismo texto que el seguimiento (`estimatedDelivery`, `orderStatusLine`) y enlazar a `/cuenta/pedidos/<n>` si el cliente tiene cuenta~~ Hecho (D-028) | `src/lib/orders/customer-view.ts` |
| 7.4 | ~~Con la decisión 2, agregar la URL de seguimiento de cada transportista en `CARRIER_TRACKING`~~ ✅ en la 7.3. *Marcar como enviado* debe guardar `carrier` con el `name` de `CARRIERS` (el despacho propio es `Almacén`). Si se quiere fecha en el paso *Preparado*, habría que exponer la del evento `processing` al cliente (hoy solo la lee el admin) | `src/lib/orders/customer-view.ts` |
| 7.4 | Al anular desde la administración, `cancel_note` es el texto que ve el cliente en Mis pedidos: el modal debe decirlo | `orderStatusLine` |
| 7.5 ✅ | ~~Agregar Direcciones, Favoritos y Datos personales al menú de la cuenta (`LINKS`) cuando existan sus páginas~~ Hecho (D-030) | `src/components/account/account-menu-links.tsx` |
| 7.8 | La redirección optimista del proxy ya cubre el Detalle de pedido (redirect y 404 reales); falta el resto de `/cuenta/*` y `/admin/*` | `src/lib/supabase/proxy.ts` |
| Dueño | ~~Textos propuestos sin diseño de la 7.1~~ ✅ aprobados sin cambios (26-10-2026) | T2 de [pendientes del dueño](pendientes-del-dueno-fase-7.md) |

### Lo que deja la 7.2 para las siguientes subetapas

| Subetapa | Pendiente | Dónde |
|---|---|---|
| 7.3 | ✅ Generadas, pegadas y probadas el 26-10-2026 (`supabase/templates/`, T4) · Plantillas de los correos de Supabase Auth en español y con el estilo de la tienda (hoy *Confirm your new email address*, en inglés). La de *Change email address* conviene con `token_hash` (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&volver=/cuenta/pedidos`) para que el enlace funcione en otro navegador | Supabase → Authentication → Emails (T4 de [pendientes del dueño](pendientes-del-dueno-fase-7.md)) |
| 7.5 ✅ | ~~*Recibir novedades* está en `user_metadata.newsletter`~~ Migrado a `profiles.newsletter_opt_in_at` (M10). (Crear cuenta y la conversión): con la decisión 7b, migrarlo a `profiles`. Datos personales puede leer el nombre que dejó la conversión (`profiles.full_name` = destinatario del pedido) | `src/lib/auth/actions.ts` |
| 7.6 ✅ | Con la 3c, un invitado convertido ya no es anónimo y puede opinar como cualquier cuenta | Política de `reviews` |
| Dueño | ~~Textos propuestos sin diseño de la 7.2~~ ✅ aprobados sin cambios (26-10-2026) | T3 de [pendientes del dueño](pendientes-del-dueno-fase-7.md) |

### Lo que deja la 7.3 para las siguientes subetapas

| Subetapa | Pendiente | Dónde |
|---|---|---|
| 7.4 | *Marcar como enviado*: guardar `carrier` (`CARRIERS`) y `tracking_number`, cambiar a `shipped` y llamar `after(() => sendOrderEmail(id, "shipped", { actor: "admin", actorId }))`. En el retiro en tienda, `shipped` es *Listo para retirar* y el correo ya cambia solo | `src/lib/email/order-emails.ts` |
| 7.4 | `AdminAnularPedido`: `cancel_order(id, "tienda", nota)` y, si se marca *Avisar al cliente*, `sendOrderEmail(id, "cancelled", { actor: "admin", … })` **después** del reembolso, para que diga *Te devolvimos $X* y no *Te vamos a devolver*. La nota es el motivo del correo y de Mis pedidos; es opcional (sin ella: *Tuvimos que anular tu pedido. Lo sentimos.*, aprobado por el dueño) | `orderCancelledEmail` |
| 7.4 | Confirmar una transferencia: después de `settle_payment(…, "paid", …)`, `sendOrderEmail(id, "confirmed")` (el medio sale como *transferencia bancaria*) | `service.ts` |
| 7.4 | El historial de `AdminPedido` puede mostrar los correos: eventos `kind = "email"` con `data.template` (`confirmed`, `shipped`, `cancelled`, `transfer`, `late_refund`) y `data.subject` | `order_events` |
| 7.4 | Pedido **1042** de prueba: anulado por la tienda con el pago de Flow sandbox **sin reembolsar** (`payments.status = paid`). Decisión del dueño (26-10-2026): se deja así para probar el reembolso desde la administración. Ya está `cancelled` y `cancel_order` no acepta pedidos anulados, así que `AdminAnularPedido` no lo toma: la 7.4 tiene que poder reembolsar un pedido ya anulado (por ejemplo, desde su alerta), o la anulación se prueba con un pedido nuevo | Supabase |
| Dueño | ~~Textos propuestos de la 7.3 (T6)~~ ✅ aprobados sin cambios (26-10-2026); ~~volver a pegar las plantillas de Supabase Auth (T7)~~ ✅ y, opcional, un buzón para respuestas (T8) | [pendientes del dueño](pendientes-del-dueno-fase-7.md) |

### Lo que deja la 7.4 para las siguientes subetapas

| Subetapa | Pendiente | Dónde |
|---|---|---|
| Dueño | Revisar los textos propuestos de la 7.4 (T10): motivos de anulación escritos para el cliente, *Esperando el pago*, *Devuelve el pago*, el correo de una transferencia anulada que pide los datos bancarios y los avisos *Listo: …* | [pendientes del dueño](pendientes-del-dueno-fase-7.md) |
| Dueño | Quitarle el rol `admin` a `prueba.fase5@almacen.cl` (T9, con tu aviso). Su contraseña se cambió para la prueba | `profiles.role` |
| Dueño | Revisar en Vercel si el cron corrió el 27-10 a las 09:00 UTC: no aparece en los logs (el del 26-10 sí) | Vercel → Cron Jobs |
| Antes de producción | T8: el correo de una transferencia anulada le pide al cliente que escriba sus datos bancarios a `STORE.contactEmail` (hoy `hola@almacen.cl`, de ejemplo): tiene que ser un buzón real | `src/lib/store.ts` |
| 7.8 | El proxy ya da el código HTTP de `/admin/*` en la carga directa (redirect y 404), como en el Detalle de pedido; falta el resto de `/cuenta/*` | `src/lib/supabase/proxy.ts` |
| Más adelante | Una alerta `refund_failed` no se cierra sola cuando el reintento sale bien (la cierra el admin). La lista trae todos los pedidos y cuenta en la app: con miles de pedidos, contar en la BD. Lista de pedidos en móvil y administración del catálogo: sin diseño | D-029 |
| Pruebas | El reembolso en Flow sandbox no se pudo completar (sin fondos en el comercio de prueba, trampa 84): el 1042 sigue anulado con el pago sin devolver y su alerta `refund_failed` abierta. Se reintenta desde su pedido si Flow repone fondos | Supabase |

### Lo que deja la 7.5 para las siguientes subetapas

| Subetapa | Pendiente | Dónde |
|---|---|---|
| Dueño | Revisar los textos y las propuestas de la 7.5 (T12): estado vacío y avisos de Direcciones, tope de 10, confirmar al eliminar, favorito pendiente que se guarda al ingresar, *Deshacer*, sin *Te avisamos si baja de precio*, precarga del nombre y el teléfono en el checkout. Recomendado: *Secure password change* en Supabase Auth | [pendientes del dueño](pendientes-del-dueno-fase-7.md) |
| 7.6 ✅ | El trigger de la firma (3b) puede usar `profiles.first_name` (o la primera palabra de `full_name` si está vacío, como `greetingName`). Si no hay nombre, el modal lo pide: se puede guardar en `first_name`/`full_name` con el grant por columna de M10 | Supabase, `src/lib/account/profile.ts` |
| 7.6 ✅ | `reviews` no tiene grant por columna: si la 7.6 copia nombre y comuna con un trigger, conviene el mismo patrón que M10 para que el cliente no los escriba | Supabase |
| 7.8 | El código HTTP real de `/cuenta/direcciones`, `/cuenta/favoritos` y `/cuenta/datos` (redirect en la carga directa sin sesión) sigue pendiente con el resto de `/cuenta/*` | `src/lib/supabase/proxy.ts` |
| 7.8 | La limpieza de anónimos borra también sus `wishlist_items` (no tienen: el invitado no guarda favoritos) | cron |
| Antes de producción | Activar *Secure password change* en Supabase Auth (el cambio de contraseña no pide la actual) | Supabase → Authentication |
| Más adelante | Al cambiar la contraseña, las otras sesiones caen al renovar su token (≤ 1 h, trampa 86); para cortarlas al instante habría que verificar con `getUser()` | `src/lib/account/actions.ts` |
| 7c | Cuando haya proveedor de newsletter: leer `profiles.newsletter_opt_in_at is not null`; cada envío con su enlace para darse de baja (que vacíe la columna) | Supabase |
| Más adelante | El checkout precarga una sola dirección (la principal o la última); elegir entre varias no tiene diseño. El favorito pendiente se pierde si el cliente crea una cuenta nueva (confirmación de correo) | D-030 |

### Lo que deja la 7.6 para las siguientes subetapas

| Subetapa | Pendiente | Dónde |
|---|---|---|
| Dueño | Revisar los textos y las propuestas de la 7.6 (T14): invitado, sin pedido entregado, editar la propia, *Tu nombre*, firma fija, sin opiniones, sin *Ver las N opiniones* en móvil | [pendientes del dueño](pendientes-del-dueno-fase-7.md) |
| Dueño | `audazia.dev` responde **402 `DEPLOYMENT_DISABLED`** (28-10-2026, 04:06 UTC; el proyecto figura `live: false` con el último deploy `READY`). Puede explicar que el cron del 27-10 no aparezca (T11). Revisarlo en Vercel (uso del plan Hobby o proyecto pausado) | Vercel (T15) |
| 7.7 | `getReviews` ya lee `product_catalog` (promedio y total). *Los más vendidos* puede seguir la misma idea: una función que devuelva solo los ids, con el tag `products` | `src/lib/catalog/queries.ts` |
| 7.8 | La limpieza de anónimos no toca `reviews`: un anónimo no puede opinar (M11) | cron |
| Más adelante | Ocultar o borrar una opinión: hoy se hace en Supabase (`is_published = false`, el admin con `service_role`), e invalidar `reviews:<productId>` y `products`. *Ver todas las opiniones* (paginación) cuando haya más de 10 por producto. Responder una opinión no está en el diseño | D-031 |

### Lo que dejan las decisiones del dueño del 27-10-2026

| Subetapa | Pendiente | Dónde |
|---|---|---|
| 7.4 ✅ | Cuentas admin listas (decisión 4 ✅): `prueba.fase5@almacen.cl` y `lucassalazarc@outlook.com` (verificado el 27-10-2026 antes de empezar). Al terminar, quitarle el rol a la de prueba (T9, pendiente de tu aviso) | `profiles.role` |
| 7.4 ✅ | Transferencia pagada (decisión 5 ✅, hecho en la 7.4): modal *Devuélvele $X por transferencia*, *Ya devolví el dinero* → `refunded`; con *Avisar al cliente*, `orderCancelledEmail` le pide banco, tipo de cuenta, número y RUT y dice a qué correo escribir. Sin datos bancarios en la BD. Los correos no tienen `reply_to` y `STORE.contactEmail` es de ejemplo: *escríbenos a …* hasta T8 | `src/lib/email/templates.ts`, `order-emails.ts` |
| 7.5 ✅ | `profiles.rut` opcional y validado (decisión 7a ✅); Datos personales lo edita y el checkout lo precarga sin escribirlo | `src/app/(checkout)/checkout/page.tsx` |
| 7.5 ✅ | `profiles.newsletter_opt_in_at` (decisión 7b ✅): migración que copia `user_metadata.newsletter = true` con la fecha de creación de la cuenta; Crear cuenta y la conversión del invitado escriben la columna; *Correos de la tienda* en Datos personales la activa (fecha actual) o la vacía | `src/lib/auth/actions.ts` |
| 7.6 ✅ | Hecho en la 7.6 (M11). Política `reviews: compradores crean`: `status = 'delivered'` (3a) y `is_anonymous is not true` (3c); trigger con el nombre de pila y la comuna del pedido entregado más reciente (3b); si no hay `full_name`, el modal lo pide | Supabase |

**Orden propuesto:** 7.0 → 7.1 → 7.2 → 7.3 → 7.4 → 7.5 → 7.6 → 7.7 → 7.8. La cuenta admin (decisión 4) quedó definida el 27-10-2026, así que la 7.4 no espera nada.

**Fuera de alcance:** boleta o factura electrónica mientras no haya proveedor (D-012), administración del catálogo (productos, stock, cupones) y la lista de pedidos en móvil (sin diseño).

## Criterios que aplica el agente (van a `decisiones.md`)

- **`cancelled` o `refunded`:** un pedido anulado sin cobro queda `cancelled` (*Anulado*). Uno anulado por la tienda con el reembolso completado queda `refunded` (*Reembolsado*). Si el reembolso falla, queda `cancelled` con una alerta `refund_failed`. El 1030 queda como está: *Anulado · pago devuelto*.
- **Historial de los pedidos anteriores:** los que ya existen no tienen eventos, así que su historial se arma con las fechas del pedido y los intentos de pago.
- **Reseñas:** se publican al instante, como en el diseño. Para ocultar una, mientras no haya administración del catálogo, se hace en Supabase.

## Decisiones del dueño

| # | Decisión | Recomendación del agente | Respuesta |
|---|---|---|---|
| 1 | Etiqueta *Por preparar* para `paid` en la administración | Aprobarla. El cliente sigue viendo *En preparación* en `paid` y en `processing` | ✅ 26-10-2026: aprobada (ya estaba en el código de la 7.0) |
| 2 | Transportistas | Aprobar Starken, Chilexpress, Blue Express, Correos de Chile y despacho propio. *Seguir el envío* enlaza a la página de seguimiento de cada uno; en despacho propio no hay enlace | ✅ 26-10-2026: aprobada (aplicada en la 7.3) |
| 3a | Solo opina quien compró el producto | Aprobarlo | ✅ 27-10-2026: sí, solo con el pedido entregado (`status = 'delivered'` en la política de `reviews`) |
| 3b | La opinión se publica con el nombre de pila y la comuna de despacho (*Camila · Providencia*); en los retiros en tienda, sin comuna | Aprobarlo | ✅ 27-10-2026: aprobada |
| 3c | ¿Puede opinar un invitado? | **No**: no tiene nombre, su sesión se pierde y la limpieza de anónimos la borraría. Con la 7.2, crear la cuenta le toma un paso. Exige `is_anonymous is not true` en la política | ✅ 27-10-2026: no; al invitado se le ofrece crear su cuenta |
| 4 | Qué cuenta se marca como `admin` en `profiles` | `prueba.fase5@almacen.cl` (para probar) y la cuenta real del dueño (creada el 25-10-2026) | ✅ 27-10-2026: ambas (`prueba.fase5@almacen.cl` y `lucassalazarc@outlook.com`) |
| 5 | Anular un pedido pagado por transferencia (no hay pasarela que reembolse) | El modal dice *Devuélvele $X por transferencia* y el pedido pasa a *Reembolsado* cuando el admin marca *Ya devolví el dinero* | ✅ 27-10-2026: aprobada; el correo de anulación le pide al cliente sus datos bancarios por respuesta (no se guardan) |
| 6 | Correo *Anulamos tu pedido* cuando el pedido vence | **(a)** Solo a las transferencias vencidas. La otra opción, **(b)**, también lo envía a los pedidos abandonados con tarjeta o Flow, que vencen a los 30 minutos y suelen ser alguien que no siguió con la compra; puede sonar a spam | ✅ 26-10-2026: **(a)** (aplicada en la 7.3) |
| 7a | RUT en `profiles` (B22) | **Sí**: Datos personales ya lo muestra | ✅ 27-10-2026: sí, opcional; se edita en Datos personales, autocompleta el checkout y el checkout no lo guarda solo |
| 7b | *Recibir novedades* (B21) | Solo una marca en `profiles` | ✅ 27-10-2026: una fecha, `profiles.newsletter_opt_in_at` (vacía = no), para saber desde cuándo aceptó |
| 7c | Suscripción del footer (B21) | Dejarla deshabilitada hasta elegir un proveedor de newsletter | ⏳ |
