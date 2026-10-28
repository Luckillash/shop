---
title: "Pendientes antes de producción"
description: "Lista única de todo lo que falta para publicar la tienda Almacén: desarrollo (fases 6 y 7), datos y decisiones del dueño, configuración de Supabase y de la infraestructura, legal y verificación final. Consolida el checklist de producción, el avance, la hoja de ruta, las decisiones y las brechas abiertas."
generated: "2026-10-24"
estado: "vigente"
related: ["07-referencia/checklist-produccion.md", "08-estado/avance.md", "06-implementacion/hoja-de-ruta.md", "07-referencia/brechas-diseno-vs-datos.md", "_archivo/pendientes-del-dueno-fase-5.md", "_archivo/pendientes-del-dueno-fase-6.md", "_archivo/pendientes-del-despliegue.md"]
---

# Pendientes antes de producción

Estado al **27 de octubre de 2026** (decisiones 3, 4, 5 y 7a de la fase 7 respondidas): las fases 0 a 6 están terminadas, y de la fase 7 la 7.0 (base) y la 7.1 (Mis pedidos y Detalle de pedido), el 25-10-2026, y la 7.2 (el invitado crea su cuenta) y la 7.3 (correos de confirmación, despacho y anulación), el 26-10-2026. **Ya se puede cobrar en integración y sandbox** (Webpay Plus, Flow y transferencia, con reintentos, vencimiento y reembolso de pagos tardíos). Para cobrar de verdad faltan las credenciales de producción, el despliegue y los datos reales (bloques 4 a 8).

Las tareas del dueño que dejó la fase 6, con sus pasos, están en [pendientes-del-dueno-fase-6.md](pendientes-del-dueno-fase-6.md).

**Desplegada el 25-10-2026 en https://audazia.dev** (Vercel, plan Hobby), con los pagos todavía en integración/sandbox. Lo que quedó de ese despliegue, con sus pasos, está en [pendientes-del-despliegue.md](pendientes-del-despliegue.md). Lo que queda de las fases 5 y 6 antes de la fase 7 está en [pendientes-antes-de-la-fase-7.md](pendientes-antes-de-la-fase-7.md), y el prompt para empezarla en [prompt-inicio-fase-7.md](prompt-inicio-fase-7.md).

**Quién:** 👤 tú (datos, decisiones, cuentas o paneles) · 🤖 el agente (código y base de datos) · 👥 los dos.
**Bloquea:** 🔴 sin esto no se puede publicar · 🟠 importante, publicar sin esto es un riesgo · 🟢 mejora, puede ir después.

## Resumen

| Bloque | 🔴 | 🟠 | 🟢 |
|---|---|---|---|
| [1. Desarrollo: pagos (fase 6)](#1-desarrollo-pagos-fase-6) | 0 (✅ 8) | 0 (✅ 2) | 0 (✅ 1) |
| [2. Desarrollo: postcompra y operación (fase 7)](#2-desarrollo-postcompra-y-operación-fase-7) | 1 (✅ 1) | 2 (✅ 5) | 7 (✅ 3) |
| [3. Desarrollo: pendientes sueltos](#3-desarrollo-pendientes-sueltos) | 1 | 4 | 5 (✅ 1) |
| [4. Datos y decisiones del negocio](#4-datos-y-decisiones-del-negocio) | 4 (✅ 2) | 2 (✅ 1) | 1 |
| [5. Proveedores y cuentas](#5-proveedores-y-cuentas) | 3 (✅ 1) | 0 (✅ 1) | 1 |
| [6. Supabase](#6-supabase) | 3 (✅ 2) | 3 (✅ 2) | 0 |
| [7. Infraestructura y despliegue](#7-infraestructura-y-despliegue) | 5 (✅ 2) | 4 | 1 |
| [8. Verificación final](#8-verificación-final) | 7 | 2 | 0 |

**Ruta mínima para publicar:** ~~fase 6 completa (bloque 1)~~ ✅ → páginas legales y de ayuda (3) → datos reales (4) → proveedores en producción (5) → Supabase y servidor de producción (6 y 7) → verificación con una compra real (8).

---

## 1. Desarrollo: pagos (fase 6)

Guías: [pagos-webpay-plus.md](../06-implementacion/pagos-webpay-plus.md), [pagos-flow.md](../06-implementacion/pagos-flow.md), [pago-transferencia.md](../06-implementacion/pago-transferencia.md), [estados-y-mensajes.md](../04-diseno/estados-y-mensajes.md).

- [x] 🔴 🤖 ✅ 25-10-2026 · **Webpay Plus:** `create` → formulario POST con `token_ws` → retorno por GET y POST (`/api/pagos/webpay/retorno`) → `commit` → resultado. Aprobado solo si `response_code === 0 && status === "AUTHORIZED"`. Con `TBK_TOKEN`, sin `commit`.
- [x] 🔴 🤖 ✅ 25-10-2026 (sin túnel: `urlConfirmation` simulada en local) · **Flow:** `payment/create` (con `timeout`) → `urlConfirmation` (responde 200 en menos de 15 s) → `getStatus` → retorno. Pagado = `status 2`.
- [x] 🔴 🤖 ✅ 25-10-2026 (datos bancarios ficticios) · **Transferencia:** registrar el pago `pending`, página *Transferencia pendiente* con los datos bancarios, el monto exacto y el límite de 48 h.
- [x] 🔴 🤖 ✅ 25-10-2026 (Vercel Cron cada 10 min, D-021) · **Cron de vencimiento** (`/api/cron/expirar-pedidos`, protegido con `CRON_SECRET`) que anule con `cancel_order` los pedidos `pending` vencidos (`expires_at`) + índice **M4**.
- [x] 🔴 🤖 ✅ 25-10-2026 · Pantallas **Confirmación**, **Pago rechazado** (Webpay), **Flow no completado** y **Transferencia pendiente**, con los textos del diseño. Incluye el pago abortado en Webpay (B14).
- [x] 🔴 🤖 ✅ 25-10-2026 · **Reintentar pago** sobre el mismo pedido con un `buy_order` nuevo (`<order_number>-<n>`, D-013), o cambiar de medio.
- [x] 🔴 🤖 ✅ 25-10-2026 · Vaciar el carro del navegador **solo** con el pago aprobado o la transferencia registrada. Hoy no se vacía al crear el pedido (a propósito).
- [x] 🔴 🤖 ✅ 25-10-2026 · Verificar el monto y la orden de cada respuesta de la pasarela contra `orders.total` antes de marcar `paid` (trampa 36).
- [x] 🟠 🤖 ✅ 25-10-2026 (fail-open + lock en la BD) · **Locks en Redis** para que una recarga del retorno no repita el `commit` (D-005, trampa 29).
- [x] 🟠 🤖 ✅ 25-10-2026 · **Pago aprobado sobre un pedido ya anulado** (vencido): reembolso automático + alerta (B13, D-020).
- [x] 🟢 🤖 ✅ 25-10-2026 · Durante *Pagando*: *Te estamos llevando a Webpay Plus…* y *Volver al carro* sin enlace (hoy dice *Estamos creando tu pedido…*).

## 2. Desarrollo: postcompra y operación (fase 7)

- [x] 🔴 🤖 ✅ 27-10-2026 (7.4, D-029) · **Administración mínima** en `/admin`: confirmar transferencias con el N.º de operación, preparar, enviar con transportista y código (con correo), entregar, anular con o sin reembolso (también una transferencia pagada: *Ya devolví el dinero*), reembolsar un pedido ya anulado y resolver las alertas de pago; cada cambio queda en el historial con el admin. Pendiente del dueño: textos propuestos (T10) y quitarle el rol a la cuenta de prueba (T9). Antes decía: **Administración mínima** para confirmar transferencias (`settle_payment`), revisar las alertas de `payment_alerts` y cambiar el estado de los pedidos (`processing` → `shipped` con código de seguimiento → `delivered`). Sin esto, todo se hace a mano en Supabase. Es la 7.4 (el diseño existe desde el 25-10-2026: artboards `Admin*`). Cuentas admin ✅ 27-10-2026 (decisión 4): `prueba.fase5@almacen.cl` y `lucassalazarc@outlook.com`. Anular una transferencia pagada ✅ decidido (decisión 5): el admin devuelve el dinero a mano y marca *Ya devolví el dinero*; el correo le pide al cliente sus datos bancarios.
- [ ] 🔴 👥 **Correos transaccionales:** ✅ 26-10-2026 (7.3, D-028): confirmación, despacho y anulación según los artboards (y transferencia y pago devuelto con el mismo estilo), con el enlace según la cuenta y registrados en `order_events`; el cron avisa las transferencias vencidas (decisión 6a). Probados con envíos reales desde `mail.audazia.dev`. Falta: que *Marcar como enviado* y la anulación de la administración los disparen (7.4); ~~que revises los textos propuestos~~ (✅ aprobados sin cambios, T6 de la [fase 7](pendientes-del-dueno-fase-7.md)); ~~volver a pegar las plantillas de Supabase Auth con el estilo nuevo~~ (✅ T7); un buzón real para las respuestas (`reply_to`) si quieres el *respóndenos* del diseño (T8; desde la decisión 5 es donde el cliente manda sus datos bancarios para el reembolso de una transferencia, así que el correo de contacto del bloque 4 tiene que ser uno que leas), y la llave de Resend de producción (bloque 5).
- [x] 🟠 🤖 ✅ 25-10-2026 (7.1, D-026) · **Mis pedidos** y **Detalle de pedido** (`/cuenta/pedidos`, `/cuenta/pedidos/[orderNumber]`). Textos propuestos aprobados por el dueño (26-10-2026, T2 de [fase 7](pendientes-del-dueno-fase-7.md)).
- [x] 🟠 👥 ✅ 26-10-2026 (7.3, D-028) · **Transportistas** (decisión 2 de la [fase 7](pendientes-del-dueno-fase-7.md), aprobada): Starken, Chilexpress, Blue Express, Correos de Chile y despacho propio. *Seguir el envío* aparece en el Detalle de pedido y en el correo de despacho (`CARRIER_TRACKING` en `src/lib/orders/customer-view.ts`). Correos de Chile abre su página de seguimiento sin el código (no lo acepta en la URL).
- [x] 🟠 🤖 **¿Olvidaste tu contraseña?** ✅ Hecho el 24-10-2026 (`/ingresar/recuperar` → correo → `/ingresar/nueva-contrasena`).
- [x] 🟠 🤖 ✅ 26-10-2026 (7.2, D-027) · **Convertir al invitado en cuenta** desde la Confirmación (`updateUser` sobre la misma sesión, con confirmación de correo), conservando sus pedidos, dirección y carro. *Ver estado del pedido* (B38) con cuenta. Textos propuestos aprobados por el dueño (26-10-2026, T3 de [fase 7](pendientes-del-dueno-fase-7.md)).
- [x] 🟠 🤖 ✅ 27-10-2026 (7.5, D-030) · **Direcciones**, **Favoritos** y **Datos personales** en `/cuenta`, en el menú de la cuenta. El corazón de la Ficha y de las tarjetas guarda en `wishlist_items` sin volver dinámico el catálogo; un invitado va a Ingresar y el producto se guarda al ingresar (B23). Cambio de contraseña (cierra las demás sesiones). Pendiente del dueño: textos y propuestas (T12). Recomendado: activar *Secure password change* en Supabase Auth (T12).
- [ ] 🟠 👤 Revisar los textos y las propuestas de la 7.5 (T12 de la [fase 7](pendientes-del-dueno-fase-7.md)): estado vacío y avisos de Direcciones, tope de 10 direcciones, confirmar al eliminar, nueva principal al eliminar la principal, favorito pendiente que se guarda al ingresar, *Deshacer* en Favoritos, sin *Te avisamos si baja de precio*, precarga del nombre y el teléfono en el checkout.
- [ ] 🟢 🤖 **Cerrar sesión en los demás dispositivos** al cambiar la contraseña: hoy las otras sesiones caen al renovar su token (hasta 1 hora, trampa 86). Si se quiere al instante, verificar con `getUser()` en las rutas sensibles.
- [ ] 🟢 🤖 **Favorito pendiente al crear una cuenta nueva:** con la confirmación de correo activada se pierde (solo se guarda al ingresar). Se podría llevar en el enlace de confirmación (D-030).
- [ ] 🟢 🤖 Redirección optimista de `/cuenta/*` a `/ingresar` en el proxy (7.8). Desde la 7.1 el proxy ya lo hace para el Detalle de pedido (con el 404 de los pedidos ajenos, D-026); el resto lo hace cada página. Incluye las páginas de la 7.5 (`/cuenta/direcciones`, `/cuenta/favoritos`, `/cuenta/datos`), que sin sesión responden 200 y redirigen desde el navegador.
- [x] 🟢 🤖 ✅ 28-10-2026 (7.6, D-031, M11) · **Reseñas:** *Escribe tu opinión* en la Ficha; solo con el pedido **entregado** y una cuenta (no invitado); firma *Nombre · Comuna* puesta por la BD; la propia se edita.
- [ ] 🟠 👤 Revisar los textos y las propuestas de la 7.6 (T14 de la [fase 7](pendientes-del-dueno-fase-7.md)).
- [ ] 🟢 🤖 **Moderar opiniones:** hoy ocultar una es un `update reviews set is_published = false` en Supabase, y después invalidar `reviews:<productId>` y `products` (por ejemplo con `invalidate_by_tags` de Vercel). Sin pantalla de administración (fuera de alcance de la fase 7). Con Redis en producción, el límite de 10 opiniones por hora por usuario empieza a valer (hoy fail-open).
- [ ] 🟢 🤖 *Los más vendidos* en el Inicio cuando haya ventas (B34; hoy *Destacados*).
- [x] 🟢 🤖 ✅ 25-10-2026 · Badges y línea de estado de `cancelled` y `refunded` en Mis pedidos (B24, 7.0 y 7.1) y fecha de entrega estimada (B25, calculada sin columna en la 7.0).
- [ ] 🟢 🤖 Limpieza periódica de usuarios anónimos sin pedidos.
- [ ] 🟢 🤖 Newsletter: ✅ *Recibir novedades* guarda la fecha en `profiles.newsletter_opt_in_at` desde la 7.5 (decisión 7b, B21; Crear cuenta, conversión del invitado y *Correos de la tienda*), sin envíos. Falta la suscripción del footer (decisión 7c) y, cuando se envíen novedades, un proveedor y el enlace para darse de baja en cada correo.
- [x] 🟢 🤖 ✅ 27-10-2026 (7.5, D-030) · RUT en `profiles` (B22, decisión 7a): opcional, validado, se edita en Datos personales y el checkout lo precarga sin guardarlo.

## 3. Desarrollo: pendientes sueltos

- [ ] 🔴 🤖 **Páginas de ayuda y legales** (`/ayuda/terminos`, `/ayuda/privacidad`, `/ayuda/despacho`, `/ayuda/contacto`). El header, el footer y el checkout (*Acepto los términos…*) ya enlazan a ellas y hoy dan **404**. El texto legal lo pones tú (bloque 4). Cuando exista `/ayuda/contacto`, *Necesito ayuda con este pedido* (Detalle de pedido) puede enlazar ahí: hoy abre un correo a la tienda con el número del pedido en el asunto (D-026).
- [ ] 🟠 🤖 `error.tsx` por grupo de rutas, con un `Notice` útil (hoy sale la página de error por defecto de Next).
- [ ] 🟠 🤖 **Tests E2E** (Playwright) del flujo de compra y de los pagos. Hoy hay 231 tests unitarios (26-10-2026, 7.3) y las pruebas de punta a punta (también las de pago y de la cuenta) se hicieron con scripts de CDP (ojo con la trampa 63: una pestaña por vista).
- [ ] 🟠 🤖 `next/image` con las fotos reales (`remotePatterns` hacia Storage, D-015). Hoy `<img>`, porque los placeholders son SVG.
- [ ] 🟠 🤖 `npm audit`: 5 vulnerabilidades "high" heredadas de la plantilla (no se aplicó `--force`).
- [x] 🟢 🤖 Fecha de entrega concreta en la Ficha con la comuna guardada (B35). ✅ Hecho el 25-10-2026.
- [ ] 🟢 🤖 Filtros **Tipo** y **Color** del Listado (M5, B17, B20, B33). Requieren que definas los tipos de producto.
- [ ] 🟢 🤖 Feriados de **2028** en `src/lib/chile/business-days.ts` (antes de diciembre de 2027; después, cada año).
- [ ] 🟢 🤖 Feriados regionales (Arica 7 de junio, Chillán 20 de agosto) si se quieren considerar en las fechas de entrega.
- [ ] 🟢 🤖 Revisión de accesibilidad: teclado, foco, contraste en claro y oscuro, lectores de pantalla en el precio, el pago rechazado y los errores.
- [ ] 🟢 🤖 Metadata y Open Graph por página (revisar las que faltan).

## 4. Datos y decisiones del negocio

- [x] 🔴 👤 ✅ 25-10-2026 · **Retiro en tienda:** datos reales (Local Tajamar, Tajamar 223, Departamento 302, Las Condes; L–V 10:00–18:00 y sábados 10:00–14:00) en `src/lib/store.ts` y en `place_order`.
- [x] 🔴 👤 **Datos bancarios** para la transferencia: ✅ los reales en `BANK_*` de `.env.local` (25-10-2026) y en Vercel (Production y Preview, desde el primer despliegue; verificado el 26-10-2026).
- [ ] 🔴 👤 **Razón social, RUT y correo de contacto reales** (hoy *Almacén SpA · 76.543.210-3 · hola@almacen.cl* son de ejemplo, en `src/lib/store.ts`).
- [ ] 🔴 👤 **Términos y condiciones** y **política de privacidad** (texto). Idealmente revisados por un abogado (Ley del Consumidor, protección de datos).
- [ ] 🔴 👤 **Catálogo real:** productos, precios, stock y **fotos 4:5**. Hoy es el seed de ejemplo con imágenes placeholder.
- [ ] 🔴 👤 **Cupones reales.** Desactivar o borrar BIENVENIDA10 y DESCUENTO5000 si no los vas a usar.
- [ ] 🟠 👤 Textos de la página *Despacho y plazos* y del contacto (`/ayuda/despacho`, `/ayuda/contacto`).
- [ ] 🟠 👤 Tipos de producto para los filtros del Listado (bloque 3).
- [x] 🟠 👤 ✅ 25-10-2026 (aprobados sin cambios) · Confirmar los **textos propuestos sin diseño** de la fase 6: pago abortado, tiempo agotado y sin conexión en Webpay, *Estamos confirmando tu pago*, *Este pedido venció*, *Te devolvimos el pago* y *No encontramos ese pago* (B14, B37; tarea 2 de [fase 6](pendientes-del-dueno-fase-6.md#2-confirmar-los-textos-propuestos-sin-diseño-)).
- [ ] 🟢 👤 Confirmar las reglas que propuso el agente: express en todas las comunas de la RM (incluidas las rurales), retiro desde el día hábil siguiente.

## 5. Proveedores y cuentas

- [ ] 🔴 👤 **Transbank (Webpay Plus):** contrato, código de comercio de producción y **proceso de validación** aprobado por Transbank (piden evidencias de la integración). Después, llave secreta de producción y una **compra real de prueba**.
- [ ] 🔴 👤 **Flow:** cuenta de producción, medios de pago contratados, `apiKey` y `secretKey` de producción.
- [x] 🔴 👤 ✅ 25-10-2026 · **Resend** (D-022): cuenta, `RESEND_API_KEY` en local y el dominio `mail.audazia.dev` verificado (SPF, DKIM y DMARC). Falta la llave de producción en Vercel (bloque 7). ✅ 26-10-2026: también es el SMTP de Supabase Auth (el SMTP por defecto solo enviaba al equipo del proyecto y respondía 429; trampa 78).
- [ ] 🔴 👤 **Boleta y factura electrónica:** proveedor autorizado por el SII (D-012). Hoy el pedido guarda el tipo de documento y los datos de la factura, pero no se emite nada. *Descargar boleta* del Detalle de pedido queda oculto hasta entonces (D-026).
- [x] 🟠 👤 ✅ 25-10-2026 · **Dominio:** `audazia.dev` (DNS en Vercel), con `www` → 308 a `audazia.dev`.
- [ ] 🟢 👤 Integración con **Starken** para el seguimiento (hoy solo se guarda un código de seguimiento a mano).

## 6. Supabase

- [ ] 🔴 👤 **Borrar los usuarios de prueba** (*Authentication → Users*): todos salvo tu cuenta real (`lucassalazarc@outlook.com`). Al 26-10-2026 son 47: `prueba.fase5@almacen.cl` (admin desde el 27-10-2026 para probar la 7.4; al borrarla se va el rol; su contraseña y la de `almacen.registro72` se cambiaron el 27-10-2026 para la prueba), 5 de mailinator (`almacen.invitado72`, `almacen.registro72`, `almacen.invitado73`, `almacen.asuntos72` y `almacen.asuntos74`) y 41 anónimos. La 7.5 (27-10-2026) agregó `almacen.registro75@mailinator.com` (Crear cuenta sin confirmar) y un anónimo (prueba del corazón como invitado), y cambió otra vez las contraseñas de `almacen.registro72` e `almacen.invitado72`. Los pedidos de prueba son los 1001–1048 (no hay 1037; bloque 8).
- [x] 🔴 👤 **Site URL y Redirect URLs** con `https://audazia.dev` ✅ (25-10-2026; se mantienen `localhost:3000` y `localhost:3310` en las Redirect URLs). **Confirmación de correo y *¿Olvidaste tu contraseña?* probadas con un correo real** ✅ (25-10-2026, tarea 12 de [despliegue](pendientes-del-despliegue.md)): la cuenta quedó confirmada en `auth.users`. Tarea 2 de [despliegue](pendientes-del-despliegue.md).
- [ ] 🔴 👤 Activar **Leaked password protection** en Supabase Auth (aviso de los advisors).
- [ ] 🟠 👤 Activar **Secure password change** en Supabase Auth (*Authentication → Providers → Email*): hoy Datos personales cambia la contraseña sin pedir la actual (como el artboard). Con la opción activa, una sesión antigua debe volver a ingresar; la app ya muestra ese aviso (D-030, T12 de la [fase 7](pendientes-del-dueno-fase-7.md)).
- [x] 🔴 👥 ✅ 27-10-2026 (decisión 4) · **Al menos un admin:** `lucassalazarc@outlook.com` tiene `profiles.role = 'admin'` (y, hasta T9, la cuenta de prueba).
- [ ] 🔴 👤 **Respaldos** (según el plan de Supabase) y revisar el plan en general (límites de Auth, base de datos y almacenamiento).
- [ ] 🟠 👤 **Captcha** (Turnstile o hCaptcha) para crear cuentas y sesiones anónimas.
- [x] 🟠 👥 **Templates de los correos de Supabase Auth** (*Authentication → Email Templates*): *Confirm signup*, *Reset password*, *Magic link*, *Change email address*, *Invite user* y *Reauthentication*, en español, con la voz y el estilo de los correos de Resend (D-022) y los enlaces a `/auth/confirm` con `token_hash` (como el de *Reset password*). Hoy salen los de Supabase por defecto, en inglés. El agente genera el HTML y los asuntos; tú los pegas en el panel. Conviene hacerlo junto con el SMTP propio (Resend), antes de la conversión de invitado en cuenta de la fase 7. El de *Change email address* es el que recibe el invitado al crear su cuenta (7.2). ✅ 26-10-2026: generadas en `supabase/templates/`, pegadas y probadas con correos reales, con sus asuntos (T4 de la [fase 7](pendientes-del-dueno-fase-7.md)). La 7.3 les cambió el estilo para que coincidan con los correos de pedidos: el dueño volvió a pegar los cuerpos el 26-10-2026 (T7, verificado con *Crea una contraseña nueva*).
- [x] 🟠 👤 ✅ 26-10-2026 (T4 de la [fase 7](pendientes-del-dueno-fase-7.md), probada abriendo el enlace en otro navegador) · **Plantilla del correo *Reset password*** (Authentication → Email Templates): `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&volver=/ingresar/nueva-contrasena`. Con la plantilla por defecto el enlace solo funciona en el mismo navegador donde se pidió. La recuperación ya funcionó con un correo real (25-10-2026); después de cambiar la plantilla, probar abriendo el enlace en otro navegador.
- [ ] 🟠 🤖 `get_advisors` (seguridad y rendimiento) revisado justo antes de publicar. Hoy solo quedan avisos aceptados y documentados.

## 7. Infraestructura y despliegue

- [x] 🔴 👥 ✅ 25-10-2026 · **Hosting:** Vercel, proyecto `shop` vinculado a `Luckillash/shop` (cada push a `main` despliega). Plan **Hobby** (ver el cron).
- [ ] 🔴 👤 **El sitio está deshabilitado:** el 28-10-2026 (04:06 UTC) `audazia.dev` responde 402 `DEPLOYMENT_DISABLED` y el proyecto figura `live: false` (T15 de la [fase 7](pendientes-del-dueno-fase-7.md)). Revisar el uso del plan Hobby o si el proyecto quedó pausado.
- [ ] 🔴 👥 **Variables de entorno de producción** (ver [variables-de-entorno.md](../07-referencia/variables-de-entorno.md)): ✅ cargadas en Vercel el 25-10-2026 (19, con `NEXT_PUBLIC_SITE_URL=https://audazia.dev` y un `CRON_SECRET` nuevo). Faltan `REDIS_URL`, las credenciales de producción de Webpay y Flow y la llave `almacen-produccion` de Resend (hoy la local). Tareas 1, 3 y 4 de [despliegue](pendientes-del-despliegue.md).
- [ ] 🔴 👥 **Redis en producción** (por ejemplo Upstash o Redis Cloud). Sin Redis, el rate limiting del login, el cupón, los invitados, los pedidos y los reintentos **deja pasar todo** (fail-open, D-005). Los locks de pago siguen protegidos por el lock de la BD.
- [x] 🔴 👥 **HTTPS** en todo el sitio ✅ (certificado de Vercel, 25-10-2026) y `urlConfirmation` de Flow alcanzable desde internet, **probada con una compra en sandbox** ✅ (25-10-2026, pedido 1036 pagado solo por el aviso del servidor, tarea 8 de [despliegue](pendientes-del-despliegue.md)). Repetirla con las credenciales de producción.
- [ ] 🔴 👥 **Cron** de vencimiento: la cuenta sigue en **Hobby** (no Pro, como se había anotado), así que `vercel.json` quedó **diario** (`0 9 * * *`) desde el 25-10-2026. `CRON_SECRET` ✅ cargado. Primera ejecución ✅ (corrió el 26-10-2026 a las 09:00:47 UTC con `{ checked: 0, cancelled: 0, recovered: 0, skipped: 0 }` (200)). Falta pasar a Pro (el dueño lo planea) y volver a `*/10 * * * *`. Tareas 6 y 7 de [despliegue](pendientes-del-despliegue.md). ⚠️ La ejecución del 27-10-2026 (09:00 UTC) no aparece en los logs de Vercel (revisado dos veces; T11 de la [fase 7](pendientes-del-dueno-fase-7.md)): confirmar en *Cron Jobs* que corre todos los días.
- [ ] 🔴 🤖 Que el proxy o la plataforma **sobrescriba `x-forwarded-for`**: el rate limiting usa esa IP (`clientIp` toma la primera), y si el cliente la puede inventar, puede saltarse el límite. En Vercel la plataforma lo sobrescribe: falta comprobarlo enviando un `x-forwarded-for` inventado a `audazia.dev` cuando haya Redis.
- [ ] 🟠 👥 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` fija si hay más de una instancia (guía de Server Actions de Next).
- [ ] 🟠 👥 Monitoreo: `/api/health` (Redis) en un servicio de uptime y alertas de errores. Hoy responde 503 en producción porque no hay Redis.
- [ ] 🟠 👥 **Base de datos compartida:** desarrollo y `audazia.dev` usan el mismo proyecto de Supabase. Decidir si producción tiene un proyecto propio (tarea 5 de [despliegue](pendientes-del-despliegue.md)).
- [ ] 🟠 🤖 **Región de las funciones** (`iad1`) frente a la de Supabase (tarea 9 de [despliegue](pendientes-del-despliegue.md)).
- [ ] 🟢 🤖 `NEXT_PUBLIC_SITE_URL` de Preview apunta a producción (tarea 10 de [despliegue](pendientes-del-despliegue.md)).

## 8. Verificación final

- [ ] 🔴 🤖 `npm run build` (borrando `.next`), `npm run lint` y `npm run test:run` sin errores.
- [ ] 🔴 👥 **Compra real con Webpay** en producción (Transbank pide una de $50) y anularla o reembolsarla.
- [ ] 🔴 👥 **Compra real con Flow** y una **transferencia** confirmada a mano.
- [ ] 🔴 🤖 Casos de pago en producción: aprobado, rechazado, abortado, timeout, recarga del retorno y pago tardío sobre un pedido vencido (✅ en integración/sandbox el 25-10-2026).
- [ ] 🔴 👥 Compra como **invitado** y con **cuenta**, en escritorio y en un celular real.
- [ ] 🔴 🤖 **Borrar los datos de prueba** al subir a producción (decisión del dueño, 25-10-2026: se dejan hasta entonces): pedidos **1001–1048** (no hay 1037; el 1048 de la 7.5 ya está anulado). Primero `cancel_order` a los **pagados** (1020–1022, 1027, 1028, 1036 y 1038) para devolver el stock; el **enviado** 1040 y los **entregados** 1043, 1044 y 1047 no los acepta `cancel_order`, así que su stock se corrige a mano o al cargar el catálogo real. El 1042 sigue anulado con el pago de Flow sandbox sin reembolsar (el sandbox no tenía fondos, 27-10-2026) y su alerta `refund_failed` abierta; 1029 y 1045 quedaron reembolsados y 1046 anulado en la prueba de la 7.4. Después, borrarlos de `orders` (cascada a `payments` y `payment_alerts`). Pasos en la tarea 6 de [fase 6](pendientes-del-dueno-fase-6.md#6-decidir-qué-hacer-con-los-datos-de-prueba--25-10-2026).
- [ ] 🔴 🤖 Seed de prueba **no** cargado en la base de producción (o borrado), y caché de Next invalidada después de cargar el catálogo real (trampa 47).
- [ ] 🟠 👥 Revisión visual de todas las pantallas en claro y oscuro, a 1280 px y 390 px.
- [ ] 🟠 👤 Revisar los correos que recibe el cliente (confirmación, transferencia, despacho, anulación, confirmación de cuenta). Para verlos sin buzón propio, maildrop.cc: mailinator descarta los asuntos con «pedido» (trampa 80).

---

## Ya resuelto (para no repetirlo)

Fase 7, 25-10-2026: 7.0 (historial del pedido, motivo de anulación, estados, `requireAdmin`, M8) · 7.1 (Mis pedidos y Detalle de pedido, B24 cerrada, 404 real de los pedidos ajenos) · 26-10-2026: 7.2 (invitado → cuenta, *Ver estado del pedido*, SMTP propio y plantillas de Supabase Auth) · 7.3 (correos de confirmación, despacho y anulación, transportistas y aviso de transferencias vencidas).

Fase 6, 25-10-2026: Webpay Plus, Flow y transferencia · reintentos y cambio de medio · cron de vencimiento + M4 · locks · B13 con reembolso automático · pantallas de resultado · Resend en el código (con llave en local desde el mismo día).

Fase 5, 24-10-2026: inicios anónimos activados · Redirect URLs agregadas (falta la prueba real) · express solo en la RM · feriados 2026–2027 verificados · pedidos de prueba anulados · M1 y M2 registradas en el historial de migraciones · despacho, IVA, redondeo y vencimiento en `place_order`.

## Dónde se mantiene esta lista

La lista viva es [07-referencia/checklist-produccion.md](../07-referencia/checklist-produccion.md) y el estado general está en [08-estado/avance.md](../08-estado/avance.md). Este archivo es una foto consolidada al 26-10-2026: cuando cierres algo, avísale al agente para que actualice el checklist y el avance.
