---
title: "Prompt para continuar con la subetapa 7.4"
description: "Prompt para pegar en un chat nuevo y hacer la subetapa 7.4 de la fase 7 (administración: AdminHeader, AdminPedidos, AdminPedido con sus estados e historial, confirmar transferencia, preparar, enviar con correo, entregar, AdminAnularPedido con reembolso, AdminAlertas y AdminPedidoMovil): qué leer, lo que dejaron la 7.0 a la 7.3, el alcance con sus artboards, las decisiones del dueño que lo afectan (1, 4 y 5), el contexto fuera del código y cómo trabajar."
generated: "2026-10-26"
estado: "vigente"
related: ["_archivo/plan-fase-7.md", "_archivo/pendientes-del-dueno-fase-7.md", "_archivo/prompt-subetapa-7-3.md", "08-estado/avance.md", "04-diseno/templates.md", "02-arquitectura/decisiones.md"]
---

# Prompt para continuar con la subetapa 7.4

Copia el bloque en un chat nuevo. Si algo cambió desde el 26-10-2026 (decisiones 1, 4 o 5 respondidas, pedidos de prueba nuevos), actualízalo antes de pegarlo.

````markdown
# Fase 7 de Shop (tienda Almacén) · subetapa 7.4: administración

Trabajas en `C:\Users\lucas\OneDrive\Escritorio\MCPS\shop`: Next.js 16 + React 19 + TypeScript + Zustand + Redis + Supabase, publicado en https://audazia.dev (Vercel Hobby). Las fases 0 a 6 están terminadas; de la fase 7 quedaron listas la **7.0** (base) y la **7.1** (Mis pedidos y Detalle de pedido) el 25-10-2026, y la **7.2** (el invitado crea su cuenta) y la **7.3** (correos) el 26-10-2026. El plan está aprobado para avanzar por subetapas: haz la **7.4** y detente al terminarla.

## Lee primero, en este orden
1. `AGENTS.md`: esta versión de Next tiene cambios incompatibles. Antes de escribir código, lee la guía que corresponda en `node_modules/next/dist/docs/` (layouts y páginas con `<Suspense>`, Server Actions y su validación, `after()`, `redirect`/`notFound`, formularios con `useActionState`, `updateTag`/`revalidateTag`).
2. `documentación/README.md`: invariantes y la tabla "¿Qué archivo leo?".
3. `documentación/_archivo/plan-fase-7.md`: la fila de la 7.4, las secciones *Lo que deja la 7.1…*, *…la 7.2…* y *…la 7.3…*, y las decisiones del dueño.
4. `documentación/08-estado/avance.md` y las entradas del 25 y 26-10-2026 en `08-estado/registro-de-cambios.md`.
5. `documentación/07-referencia/trampas-conocidas.md` antes de tocar código, sobre todo 11, 19, 36, 58, 62, 63, 74, 75, 79, 80 y 81.
6. `02-arquitectura/decisiones.md` (D-020, D-022, D-023, D-025, D-026 y D-028), `02-arquitectura/autenticacion-y-autorizacion.md` (roles e `is_admin`), `03-base-de-datos/funciones-y-triggers.md` (`settle_payment`, `cancel_order`, `log_order_event`), `03-base-de-datos/seguridad-rls.md`, `04-diseno/templates.md` (sección *Administración*), `05-dominio/ciclo-de-vida-del-pedido.md` y `_archivo/pendientes-del-dueno-fase-7.md` (decisiones 1, 4 y 5).

## Lo que dejaron la 7.0 a la 7.3 (úsalo, no lo dupliques)
- **Acceso** (7.0, D-025): `requireAdmin(path)` en `src/lib/auth/session.ts` para el layout y las páginas (sin sesión → Ingresar; sin rol → 404, para no revelar que existe) y `getAdminUser()` en **cada** Server Action. No uses `forbidden()` (experimental). El rol sale de `profiles.role = 'admin'` (`is_admin()`).
- **Estados** (7.0): `src/lib/orders/order-status.ts`: `adminStatusBadge` (*Transferencia por confirmar*, *Por preparar* = decisión 1), `canTransition`/`isCancellable`, `adminNextStep` (la acción primary de *Siguiente paso*). La BD no restringe las transiciones: las valida la acción.
- **Historial** (7.0, D-025): `order_events` lo escribe el trigger `log_order_event` (cada cambio de estado, con actor). Las acciones que usan la llave secreta indican al admin con `set_config('shop.actor_id', <uuid>, true)` **en la misma transacción** (por eso conviene una función SQL por acción, no varias llamadas sueltas). Los pedidos 1001–1036 no tienen eventos: su historial se arma con las fechas del pedido y los intentos de pago.
- **Pagos** (fase 6): `src/lib/payments/service.ts` (`settle_payment` con el resultado del trigger, `refund()` de Webpay `/refunds` y Flow `refund/create` con alerta `refund_failed` si falla; hoy es privada), `payment_alerts` (`paid_after_cancel`, `double_payment`, `amount_mismatch`, `refund_failed`).
- **Correos** (7.3, D-028): `sendOrderEmail(orderId, kind, { actor: "admin", actorId })` en `src/lib/email/order-emails.ts` (lee el pedido, valida el estado, envía y registra `kind = 'email'`; nunca lanza). Llámalo dentro de `after()`. Confirmar transferencia → `"confirmed"`; *Marcar como enviado* → `"shipped"` (en el retiro en tienda, `shipped` es *Listo para retirar* y el correo cambia solo); anular con *Avisar al cliente* → `"cancelled"` **después** del reembolso, para que diga *Te devolvimos $X*.
- **Transportistas** (decisión 2 ✅, D-028): `CARRIERS` en `src/lib/orders/customer-view.ts`; *Marcar como enviado* guarda `carrier` con su `name` (el despacho propio es `Almacén`) y `label` es lo que ve el admin.
- **Textos del cliente** (7.1 y 7.3, aprobados): `cancel_note` es el motivo que lee el cliente en Mis pedidos y en el correo; es **opcional** (sin ella: *Tuvimos que anular tu pedido. Lo sentimos.*). El modal tiene que decirlo.

## Alcance de la 7.4 (según el plan y los artboards)
- **`/admin`** con su propio layout, sin el header ni el footer de la tienda: `AdminHeader` (*Almacén* + `Badge` *Administración*, *Pedidos*, *Alertas de pago* con el número sin resolver, *Ver la tienda*, *Cerrar sesión*). Acceso validado en el layout **y** en cada Server Action.
- **`AdminPedidos`:** fecha y cuántos necesitan una acción, búsqueda por N.º o correo, `Notice` de alertas abiertas, chips de estado con conteo, lista y *Ver más*.
- **`AdminPedido`** (tweak `estado`): *Siguiente paso* con una sola acción primary: *Confirmar pago recibido* (N.º de operación opcional; `settle_payment(…, 'paid', …)` sobre el intento de transferencia), *Empezar a preparar*, *Marcar como enviado* (transportista de `CARRIERS` y código), *Marcar como entregado*; el estado anulado; productos, cliente, dirección, pago e **historial** (`order_events`, incluidos los correos; para los pedidos antiguos, armado con las fechas).
- **`AdminAnularPedido`:** motivo (lo ve el cliente), *Avisar al cliente por correo*, aviso *Esto no se puede deshacer* con el monto. `cancel_order(id, 'tienda', nota)` + reembolso con el código de la fase 6 (`refunded` si se completa; si falla, queda `cancelled` con alerta `refund_failed`, D-025). Con transferencia pagada, la **decisión 5** (⏳).
- **`AdminAlertas`:** *Sin resolver* / *Resueltas*, una tarjeta por alerta con qué pasó y *Qué hacer*, y *Marcar como resuelta*.
- **`AdminPedidoMovil`:** confirmar una transferencia desde el móvil. La lista de pedidos en móvil no tiene diseño (fuera de alcance).
- Para leer el canvas: https://claude.ai/artifact/E7sfHjPteptX18QCaikCri con la herramienta `Artifact` (`action: "list", scope: "files"` para ver los nombres y después `action: "read"` con `paths` de los `project/Admin*.dc.html`), no con WebFetch. Usa los componentes de `src/components/ui/` y los tokens; los datos de los artboards son de ejemplo.

## Contexto que no está en el código
- **La base de Supabase es la misma para desarrollo y `audazia.dev`.** Migraciones con `apply_migration`, idempotentes; no borres datos de prueba. Revisa los advisors después de cada migración.
- **Todavía no hay ningún admin** (decisión 4 ⏳; recomendación: `prueba.fase5@almacen.cl` para probar y mi cuenta real). **No marques ninguna cuenta como `admin` sin mi respuesta**: pregúntamelo al empezar, porque sin una cuenta admin no hay prueba de punta a punta.
- Pedidos de prueba 1001–1043 (**no hay 1037**, trampa 79); **el próximo es el 1044** (anota en el avance los que crees). El **1042** está anulado por la tienda con el pago de Flow sandbox **sin reembolsar**: se deja así a propósito para probar el reembolso desde la administración (decisión del dueño, 26-10-2026). Ojo: ya está `cancelled` y `cancel_order` no acepta pedidos anulados, así que `AdminAnularPedido` no lo toma; hace falta reembolsar un pedido ya anulado (por ejemplo, desde su alerta) o probar la anulación con un pedido nuevo. El **1040** y el **1043** están `shipped` (sirven para *Marcar como entregado*). Con Flow sandbox se paga desde el simulador (trampa 71); con Webpay, las tarjetas las escribo yo. Después de probar, anula con `cancel_order` lo que quede pendiente (trampa 74).
- **Correos de prueba:** mailinator descarta los asuntos con «pedido» (trampa 80): para ver los correos de pedidos usa `@maildrop.cc` (su API GraphQL da el HTML), pero Flow rechaza `@maildrop.cc`: paga con un correo de mailinator y cambia `contact_email` del pedido de prueba antes del envío. Nunca `@example.com` (trampa 34) ni correos de personas reales.
- La cuenta `almacen.invitado72@mailinator.com` (pedidos 1038, 1039 y 1043) es un cliente normal; si necesitas su contraseña, cámbiala con *¿Olvidaste tu contraseña?*.
- El pie de los correos y el contacto usan `STORE` (`Almacén SpA · RUT 76.543.210-3 · hola@almacen.cl`): datos ficticios hasta que yo dé los reales.
- Si ya hay un `next dev` abierto, úsalo: Next no deja abrir otro del mismo proyecto (trampa 81).
- Producción sin Redis (rate limiting fail-open); cron diario `0 9 * * *` (Hobby). MCP de Supabase, Vercel, Flow, Transbank, GitHub y Chrome. Cada push a `main` despliega: commit o push solo cuando yo lo pida.

## Pendiente antes de empezar
1. Mira si ya respondí alguna decisión en `_archivo/pendientes-del-dueno-fase-7.md`, sobre todo la **1** (*Por preparar*), la **4** (cuenta admin) y la **5** (anular una transferencia pagada); si cambié algo, aplícalo primero. Si la 4 sigue ⏳, pregúntamela antes de escribir código.
2. Revisa con el MCP de Vercel que las ejecuciones del cron sigan dando 200 (log `[cron] expirar-pedidos`; ventana corta alrededor de las 09:00 UTC, porque las consultas largas se cortan). Si alguna falló, avísame antes de seguir.

## Cómo quiero que trabajes
- Pregunta solo lo que de verdad me toca decidir; en lo demás usa el criterio de la documentación y anótalo en `decisiones.md`. No asumas las decisiones pendientes salvo la 1, que ya está en el código.
- Seguridad: cada Server Action verifica `getAdminUser()`, valida la transición con `canTransition` y la entrada (montos y estados del servidor, nunca del formulario). Las escrituras con la llave secreta registran al admin en `order_events`.
- Textos: de tú (al admin también), sentence case, sin exclamaciones, fechas concretas, CLP con `formatCLP`. Lo que no esté en el artboard es una propuesta: anótala para que la revise.
- Tests con Vitest (lógica pura junto al archivo: filtros y conteos de la lista, historial armado, validaciones de cada acción), `npm run lint`, `npm run test:run` y `npm run build` sin errores. Prueba de punta a punta en local con Edge por CDP, a 1280 y 390 px, una pestaña nueva por vista (trampa 63): un cliente no ve `/admin` (404), confirmar una transferencia, preparar, enviar (con el correo real), entregar, anular con y sin reembolso, resolver una alerta.
- Al terminar, actualiza `08-estado/avance.md`, `08-estado/registro-de-cambios.md`, las brechas y decisiones que correspondan (una D-029 para la administración), `04-diseno/templates.md` si cambia algo del diseño, `02-arquitectura/rutas-y-paginas.md`, el plan (marca la 7.4 y agrega *Lo que deja la 7.4…*), `_archivo/pendientes-antes-de-produccion.md` (bloque 2: administración mínima) y `_archivo/pendientes-del-dueno-fase-7.md` con lo que me toque a mí (textos propuestos y decisiones 1, 4 y 5).
- Responde en español.
````
