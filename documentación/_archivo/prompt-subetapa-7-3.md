---
title: "Prompt para continuar con la subetapa 7.3"
description: "Prompt para pegar en un chat nuevo y hacer la subetapa 7.3 de la fase 7 (correos: ajustar el de confirmación a CorreoConfirmacion y crear CorreoDespacho y CorreoAnulacion con sus 3 motivos): qué leer, lo que dejaron la 7.0 a la 7.2, el alcance con sus artboards, las decisiones del dueño que lo afectan (2 y 6), el contexto fuera del código y cómo trabajar."
generated: "2026-10-26"
estado: "vigente"
related: ["_archivo/plan-fase-7.md", "_archivo/pendientes-del-dueno-fase-7.md", "_archivo/prompt-subetapa-7-2.md", "08-estado/avance.md", "04-diseno/templates.md", "02-arquitectura/decisiones.md"]
---

# Prompt para continuar con la subetapa 7.3

Copia el bloque en un chat nuevo. Si algo cambió desde el 26-10-2026 (decisiones 2 o 6 respondidas, pedidos de prueba nuevos, cambios en Resend), actualízalo antes de pegarlo.

````markdown
# Fase 7 de Shop (tienda Almacén) · subetapa 7.3: correos

Trabajas en `C:\Users\lucas\OneDrive\Escritorio\MCPS\shop`: Next.js 16 + React 19 + TypeScript + Zustand + Redis + Supabase, publicado en https://audazia.dev (Vercel Hobby). Las fases 0 a 6 están terminadas; de la fase 7 quedaron listas la **7.0** (base) y la **7.1** (Mis pedidos y Detalle de pedido) el 25-10-2026, y la **7.2** (el invitado crea su cuenta) el 26-10-2026. El plan está aprobado para avanzar por subetapas: haz la **7.3** y detente al terminarla.

## Lee primero, en este orden
1. `AGENTS.md`: esta versión de Next tiene cambios incompatibles. Antes de escribir código, lee la guía que corresponda en `node_modules/next/dist/docs/` (sobre todo `after()`, que usa el envío de correos).
2. `documentación/README.md`: invariantes y la tabla "¿Qué archivo leo?".
3. `documentación/_archivo/plan-fase-7.md`: la fila de la 7.3, las secciones *Lo que deja la 7.1…* y *Lo que deja la 7.2…*, y las decisiones del dueño (siguen ⏳).
4. `documentación/08-estado/avance.md` y las entradas del 25 y 26-10-2026 en `08-estado/registro-de-cambios.md`.
5. `documentación/07-referencia/trampas-conocidas.md` antes de tocar código, sobre todo 34, 58, 62, 63, 74, 75, 78 y 79.
6. `02-arquitectura/decisiones.md` (D-020, D-022, D-025, D-026 y D-027), `04-diseno/templates.md` (sección *Correos*), `05-dominio/ciclo-de-vida-del-pedido.md` (*Cómo se muestra*) y `_archivo/pendientes-del-dueno-fase-7.md` (decisiones 2 y 6).

## Lo que dejaron la 7.0 a la 7.2 (úsalo, no lo dupliques)
- **Correos de la fase 6** (D-022): `src/lib/email/templates.ts` (`layout`, `orderConfirmedEmail`, `transferInstructionsEmail`, `lateRefundEmail`; puros, con tests en `templates.test.ts`) y `send.ts` (Resend por REST dentro de `after()`; sin `RESEND_API_KEY` se omite con un aviso). Se llaman desde `src/lib/payments/service.ts`. Remitente `Almacén <pedidos@mail.audazia.dev>`.
- **Estados y fechas** (7.0, D-025): `src/lib/orders/order-status.ts` (`estimatedDelivery` B25, motivos de anulación `vencio` · `tienda` · `cliente`, `cancel_note`). `cancel_order(p_order_id, p_reason, p_note)`; el cron anula con `vencio` (`src/lib/payments/expire.ts`). `order_events` guarda el historial; los correos se registran con `kind = 'email'` desde el backend (D-025).
- **Textos del cliente** (7.1, aprobados por el dueño el 26-10-2026): `src/lib/orders/customer-view.ts` (`orderStatusLine`, `trackingTimeline`, `carrierTrackingUrl` sin transportistas todavía). El correo de despacho debe usar **la misma fecha y el mismo texto** que el seguimiento.
- **Cuenta** (7.1 y 7.2): con cuenta, el pedido se ve en `/cuenta/pedidos/<n>` (D-026); un invitado ve su pedido en `/pedido/<id>` (Confirmación). Un invitado que creó su cuenta (D-027) conserva su `user_id`; `auth.users.is_anonymous` dice si el dueño del pedido tiene cuenta.
- **Plantillas de Supabase Auth** en `supabase/templates/` (en español, con el mismo `layout` + `viewport`), ya pegadas y probadas: no son parte de la 7.3, pero si cambias el estilo de los correos, mantenlas iguales.

## Alcance de la 7.3 (según el plan)
- **`CorreoConfirmacion`:** ajustar el `layout` y el correo de confirmación al artboard (N.º, *Gracias, tu pedido está confirmado*, monto y medio, fecha de entrega en `promo`, productos, despacho y total, *Ver el pedido*). Agrega `<meta name="viewport">` al `layout` (las plantillas de Auth ya lo tienen; sin él, en móvil el correo se ve al ancho de escritorio).
- **`CorreoDespacho`:** *Tu pedido va en camino*, transportista y fecha, código de seguimiento y *Seguir el envío*, dirección, productos y total. *Seguir el envío* depende de la **decisión 2** (transportistas, ⏳): sin ella, no inventes URL; muestra el transportista y el código como el Detalle (*Despacha Starken · Código de seguimiento …*). Lo dispara *Marcar como enviado* de la 7.4: en la 7.3 deja la función lista y probada.
- **`CorreoAnulacion`** con sus 3 motivos (tweak `motivo` del artboard): *Anulamos tu pedido N.º …*, el motivo, el bloque de dinero (*No hicimos ningún cargo* o *Te devolvimos $…*), productos y *Volver a la tienda*. Si hay `cancel_note`, es el texto que ve el cliente (igual que en Mis pedidos). Cuándo se envía por vencimiento es la **decisión 6** (⏳; recomendación: solo transferencias vencidas): no la asumas, pregúntame o deja el envío del cron desactivado y anótalo. El de `tienda` lo dispara la 7.4.
- **Enlace *Ver el pedido*:** a `/cuenta/pedidos/<n>` si el dueño del pedido tiene cuenta (no anónimo) y a `/pedido/<id>` si es invitado. Decide de dónde sale el dato sin exponer nada y anótalo.
- **Registro:** cada correo enviado agrega un evento `kind = 'email'` en `order_events` (D-025).
- Para leer el canvas: https://claude.ai/artifact/E7sfHjPteptX18QCaikCri con la herramienta `Artifact` (`action: "read"`, `paths: ["project/CorreoConfirmacion.dc.html", "project/CorreoDespacho.dc.html", "project/CorreoAnulacion.dc.html"]`), no con WebFetch. Los correos van con estilos en línea (no los componentes de `src/components/ui/`). Los datos de los artboards son de ejemplo.

## Contexto que no está en el código
- **La base de Supabase es la misma para desarrollo y `audazia.dev`.** Migraciones con `apply_migration`, idempotentes; no borres datos de prueba.
- Pedidos de prueba 1001–1039 (**no hay 1037**, trampa 79); **el próximo es el 1040** (anota en el avance los que crees). Con Flow sandbox se paga desde el simulador (trampa 71); con Webpay, las tarjetas las escribo yo. Después de probar, anula con `cancel_order` lo que quede pendiente (trampa 74).
- **Correos de prueba:** `@mailinator.com` (bandeja pública, trampa 78), nunca `@example.com` (trampa 34) ni de personas reales. Resend envía de verdad desde `mail.audazia.dev` con la llave local; los correos nuevos suelen llegar a spam en Outlook. Para cada correo, haz un envío real y revisa cómo se ve en mailinator (escritorio y móvil).
- La cuenta `almacen.invitado72@mailinator.com` (ex invitado, pedidos 1038 pagado y 1039 anulado) sirve para probar el enlace con cuenta. Si no tienes su contraseña, cámbiala con *¿Olvidaste tu contraseña?*: la bandeja de mailinator es pública.
- El pie de los correos usa `STORE` (`Almacén SpA · RUT 76.543.210-3 · hola@almacen.cl`): son los datos ficticios del diseño hasta que el dueño dé los reales.
- **Todavía no hay ningún admin**: no marques ninguna cuenta como `admin` sin mi respuesta (decisión 4).
- Producción sin Redis (rate limiting fail-open); cron diario `0 9 * * *` (Hobby). Supabase Auth ya usa SMTP propio (Resend).
- MCP de Supabase, Vercel, Flow, Transbank, GitHub y Chrome. Cada push a `main` despliega: commit o push solo cuando yo lo pida.

## Pendiente antes de empezar
1. Mira si ya respondí alguna decisión del plan en `_archivo/pendientes-del-dueno-fase-7.md`, sobre todo la **2** (transportistas) y la **6** (correo de pedido vencido); si cambié algo, aplícalo primero.
2. Revisa con el MCP de Vercel que las ejecuciones del cron sigan dando 200 (log `[cron] expirar-pedidos`). Si alguna falló, avísame antes de seguir.

## Cómo quiero que trabajes
- Pregunta solo lo que de verdad me toca decidir; en lo demás usa el criterio de la documentación y anótalo en `decisiones.md`. Las decisiones del plan siguen pendientes: no las asumas salvo la 1, que ya está en el código.
- Textos: de tú, sentence case, sin exclamaciones, fechas concretas (sin *mañana*), CLP con `formatCLP`. Lo que no esté en el artboard es una propuesta: anótala para que la revise.
- Tests con Vitest (cada correo, sus 3 motivos y el enlace con y sin cuenta; puros y junto al archivo), `npm run lint` y `npm run build` sin errores, y un envío real de cada correo desde `mail.audazia.dev` a mailinator, revisado a 1280 y 390 px. Si tocas pantallas, prueba de punta a punta en local con Edge por CDP (una pestaña nueva por vista, trampa 63).
- Al terminar, actualiza `08-estado/avance.md`, `08-estado/registro-de-cambios.md`, las brechas y decisiones que correspondan (D-022, D-025 o una nueva), `04-diseno/templates.md` si cambia algo del diseño, el plan (marca la 7.3 y agrega *Lo que deja la 7.3…*), `_archivo/pendientes-antes-de-produccion.md` (bloque 2: correos transaccionales) y `_archivo/pendientes-del-dueno-fase-7.md` con lo que me toque a mí (textos propuestos y las decisiones 2 y 6).
- Responde en español.
````
