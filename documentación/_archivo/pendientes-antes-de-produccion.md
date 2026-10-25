---
title: "Pendientes antes de producción"
description: "Lista única de todo lo que falta para publicar la tienda Almacén: desarrollo (fases 6 y 7), datos y decisiones del dueño, configuración de Supabase y de la infraestructura, legal y verificación final. Consolida el checklist de producción, el avance, la hoja de ruta, las decisiones y las brechas abiertas."
generated: "2026-10-24"
estado: "vigente"
related: ["07-referencia/checklist-produccion.md", "08-estado/avance.md", "06-implementacion/hoja-de-ruta.md", "07-referencia/brechas-diseno-vs-datos.md", "_archivo/pendientes-del-dueno-fase-5.md", "_archivo/pendientes-del-dueno-fase-6.md"]
---

# Pendientes antes de producción

Estado al **25 de octubre de 2026**: las fases 0 a 6 están terminadas. **Ya se puede cobrar en integración y sandbox** (Webpay Plus, Flow y transferencia, con reintentos, vencimiento y reembolso de pagos tardíos). Para cobrar de verdad faltan las credenciales de producción, el despliegue y los datos reales (bloques 4 a 8).

Las tareas del dueño que dejó la fase 6, con sus pasos, están en [pendientes-del-dueno-fase-6.md](pendientes-del-dueno-fase-6.md).

**Quién:** 👤 tú (datos, decisiones, cuentas o paneles) · 🤖 el agente (código y base de datos) · 👥 los dos.
**Bloquea:** 🔴 sin esto no se puede publicar · 🟠 importante, publicar sin esto es un riesgo · 🟢 mejora, puede ir después.

## Resumen

| Bloque | 🔴 | 🟠 | 🟢 |
|---|---|---|---|
| [1. Desarrollo: pagos (fase 6)](#1-desarrollo-pagos-fase-6) | 0 (✅ 8) | 0 (✅ 2) | 0 (✅ 1) |
| [2. Desarrollo: postcompra y operación (fase 7)](#2-desarrollo-postcompra-y-operación-fase-7) | 2 | 4 | 6 |
| [3. Desarrollo: pendientes sueltos](#3-desarrollo-pendientes-sueltos) | 1 | 4 | 5 |
| [4. Datos y decisiones del negocio](#4-datos-y-decisiones-del-negocio) | 5 (✅ 1) | 2 (✅ 1) | 1 |
| [5. Proveedores y cuentas](#5-proveedores-y-cuentas) | 3 (✅ 1) | 1 | 1 |
| [6. Supabase](#6-supabase) | 5 | 3 | 0 |
| [7. Infraestructura y despliegue](#7-infraestructura-y-despliegue) | 6 | 2 | 0 |
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

- [ ] 🔴 🤖 **Administración mínima** para confirmar transferencias (`settle_payment`), revisar las alertas de `payment_alerts` y cambiar el estado de los pedidos (`processing` → `shipped` con código de seguimiento → `delivered`). Sin diseño: hay que definirlo. Sin esto, todo se hace a mano en Supabase.
- [ ] 🔴 👥 **Correos transaccionales:** confirmación, datos de transferencia y pago devuelto ✅ en el código con Resend (D-022); Resend ya envía en local desde `mail.audazia.dev` (25-10-2026). Falta el de despacho.
- [ ] 🟠 🤖 **Mis pedidos** y **Detalle de pedido** (`/cuenta/pedidos`). Hoy `/cuenta` es provisoria (correo y *Cerrar sesión*).
- [x] 🟠 🤖 **¿Olvidaste tu contraseña?** ✅ Hecho el 24-10-2026 (`/ingresar/recuperar` → correo → `/ingresar/nueva-contrasena`).
- [ ] 🟠 🤖 **Convertir al invitado en cuenta** desde la Confirmación (`updateUser`), conservando sus pedidos (D-008; fase 7 por decisión del dueño, D-024). Junto con *Ver estado del pedido* (B38).
- [ ] 🟠 🤖 Páginas de cuenta sin diseño: **Direcciones**, **Favoritos** (el header y el Carro vacío ya enlazan a `/cuenta/favoritos`, que da 404) y **Datos personales**.
- [ ] 🟠 🤖 Redirección optimista de `/cuenta/*` a `/ingresar` en el proxy (hoy la hace cada página).
- [ ] 🟢 🤖 **Reseñas:** formulario para publicar (B36). Decidir si un invitado puede reseñar (hoy las políticas lo permitirían; ver [seguridad-rls.md](../03-base-de-datos/seguridad-rls.md#usuarios-anónimos-fase-5-d-008)).
- [ ] 🟢 🤖 *Los más vendidos* en el Inicio cuando haya ventas (B34; hoy *Destacados*).
- [ ] 🟢 🤖 Badges de los estados `cancelled` y `refunded` en Mis pedidos (B24) y fecha de entrega estimada guardada (B25).
- [ ] 🟢 🤖 Limpieza periódica de usuarios anónimos sin pedidos.
- [ ] 🟢 🤖 Newsletter: *Recibir novedades* y la suscripción del footer no guardan nada (B21).
- [ ] 🟢 🤖 RUT en `profiles` para autocompletar el checkout (B22).

## 3. Desarrollo: pendientes sueltos

- [ ] 🔴 🤖 **Páginas de ayuda y legales** (`/ayuda/terminos`, `/ayuda/privacidad`, `/ayuda/despacho`, `/ayuda/contacto`). El header, el footer y el checkout (*Acepto los términos…*) ya enlazan a ellas y hoy dan **404**. El texto legal lo pones tú (bloque 4).
- [ ] 🟠 🤖 `error.tsx` por grupo de rutas, con un `Notice` útil (hoy sale la página de error por defecto de Next).
- [ ] 🟠 🤖 **Tests E2E** (Playwright) del flujo de compra y de los pagos. Hoy hay 169 tests unitarios y las pruebas de punta a punta (también las de pago) se hicieron con scripts de CDP.
- [ ] 🟠 🤖 `next/image` con las fotos reales (`remotePatterns` hacia Storage, D-015). Hoy `<img>`, porque los placeholders son SVG.
- [ ] 🟠 🤖 `npm audit`: 5 vulnerabilidades "high" heredadas de la plantilla (no se aplicó `--force`).
- [x] 🟢 🤖 Fecha de entrega concreta en la Ficha con la comuna guardada (B35). ✅ Hecho el 25-10-2026.
- [ ] 🟢 🤖 Filtros **Tipo** y **Color** del Listado (M5, B17, B20, B33). Requieren que definas los tipos de producto.
- [ ] 🟢 🤖 Feriados de **2028** en `src/lib/chile/business-days.ts` (antes de diciembre de 2027; después, cada año).
- [ ] 🟢 🤖 Feriados regionales (Arica 7 de junio, Chillán 20 de agosto) si se quieren considerar en las fechas de entrega.
- [ ] 🟢 🤖 Revisión de accesibilidad: teclado, foco, contraste en claro y oscuro, lectores de pantalla en el precio, el pago rechazado y los errores.
- [ ] 🟢 🤖 Metadata y Open Graph por página (revisar las que faltan).

## 4. Datos y decisiones del negocio

- [ ] 🔴 👤 **Retiro en tienda:** dirección, horario e indicaciones reales. Hoy son **ficticios** (Av. Manuel Montt 1530, Local 4, Providencia). El agente los cambia en `src/lib/store.ts` y en `place_order`.
- [x] 🔴 👤 **Datos bancarios** para la transferencia: ✅ los reales en `BANK_*` de `.env.local` (25-10-2026). Falta cargarlos en Vercel al desplegar.
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
- [x] 🔴 👤 ✅ 25-10-2026 · **Resend** (D-022): cuenta, `RESEND_API_KEY` en local y el dominio `mail.audazia.dev` verificado (SPF, DKIM y DMARC). Falta la llave de producción en Vercel (bloque 7). También sirve para los correos de Supabase Auth: el SMTP por defecto de Supabase tiene un límite muy bajo.
- [ ] 🔴 👤 **Boleta y factura electrónica:** proveedor autorizado por el SII (D-012). Hoy el pedido guarda el tipo de documento y los datos de la factura, pero no se emite nada.
- [ ] 🟠 👤 **Dominio** (por ejemplo, `almacen.cl`) y su DNS.
- [ ] 🟢 👤 Integración con **Starken** para el seguimiento (hoy solo se guarda un código de seguimiento a mano).

## 6. Supabase

- [ ] 🔴 👤 **Borrar los usuarios de prueba** (*Authentication → Users*): `prueba.fase5@almacen.cl` y los anónimos de las pruebas (fases 5 y 6). Los pedidos de prueba 1001–1035 están pagados en integración/sandbox, anulados o reembolsados.
- [ ] 🔴 👤 **Site URL y Redirect URLs** con el dominio real (hoy apuntan a `localhost`), y **probar la confirmación de correo** con un correo real (no hay ninguna cuenta creada desde `/ingresar`).
- [ ] 🔴 👤 Activar **Leaked password protection** en Supabase Auth (aviso de los advisors).
- [ ] 🔴 👥 **Al menos un admin:** crea tu cuenta en la tienda y el agente la marca como `admin` en `profiles`.
- [ ] 🔴 👤 **Respaldos** (según el plan de Supabase) y revisar el plan en general (límites de Auth, base de datos y almacenamiento).
- [ ] 🟠 👤 **Captcha** (Turnstile o hCaptcha) para crear cuentas y sesiones anónimas.
- [ ] 🟠 👤 **Plantilla del correo *Reset password*** (Authentication → Email Templates): `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&volver=/ingresar/nueva-contrasena`. Con la plantilla por defecto el enlace solo funciona en el mismo navegador donde se pidió. Probarla con un correo real.
- [ ] 🟠 🤖 `get_advisors` (seguridad y rendimiento) revisado justo antes de publicar. Hoy solo quedan avisos aceptados y documentados.

## 7. Infraestructura y despliegue

- [ ] 🔴 👥 **Hosting de Next.js** (por ejemplo Vercel, o un servidor propio con `next start`). No está decidido.
- [ ] 🔴 👥 **Variables de entorno de producción** (ver [variables-de-entorno.md](../07-referencia/variables-de-entorno.md)): Supabase, `SUPABASE_SECRET_KEY`, Webpay, Flow, `CRON_SECRET`, `REDIS_URL`, `NEXT_PUBLIC_SITE_URL`. Las secretas nunca con `NEXT_PUBLIC_`.
- [ ] 🔴 👥 **Redis en producción** (por ejemplo Upstash o Redis Cloud). Sin Redis, el rate limiting del login, el cupón, los invitados, los pedidos y los reintentos **deja pasar todo** (fail-open, D-005). Los locks de pago siguen protegidos por el lock de la BD.
- [ ] 🔴 👥 **HTTPS** en todo el sitio (Transbank lo exige) y `urlConfirmation` de Flow alcanzable desde internet, **probada con una compra en sandbox** (en local solo se simuló, D-024).
- [ ] 🔴 👥 **Cron** de vencimiento: `vercel.json` ya lo programa cada 10 min (D-021). Plan de Vercel ✅ **Pro** (25-10-2026). Falta `CRON_SECRET` de producción en las variables del proyecto y comprobar las ejecuciones tras el primer despliegue.
- [ ] 🔴 🤖 Que el proxy o la plataforma **sobrescriba `x-forwarded-for`**: el rate limiting usa esa IP, y si el cliente la puede inventar, puede saltarse el límite.
- [ ] 🟠 👥 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` fija si hay más de una instancia (guía de Server Actions de Next).
- [ ] 🟠 👥 Monitoreo: `/api/health` (Redis) en un servicio de uptime y alertas de errores.

## 8. Verificación final

- [ ] 🔴 🤖 `npm run build` (borrando `.next`), `npm run lint` y `npm run test:run` sin errores.
- [ ] 🔴 👥 **Compra real con Webpay** en producción (Transbank pide una de $50) y anularla o reembolsarla.
- [ ] 🔴 👥 **Compra real con Flow** y una **transferencia** confirmada a mano.
- [ ] 🔴 🤖 Casos de pago en producción: aprobado, rechazado, abortado, timeout, recarga del retorno y pago tardío sobre un pedido vencido (✅ en integración/sandbox el 25-10-2026).
- [ ] 🔴 👥 Compra como **invitado** y con **cuenta**, en escritorio y en un celular real.
- [ ] 🔴 🤖 **Borrar los datos de prueba** al subir a producción (decisión del dueño, 25-10-2026: se dejan hasta entonces): pedidos 1001–1035 y los de la fase 7. Primero `cancel_order` a los **pagados** (1020–1022 y 1027–1029) para devolver el stock, después borrarlos de `orders` (cascada a `payments` y `payment_alerts`). Pasos en la tarea 6 de [fase 6](pendientes-del-dueno-fase-6.md#6-decidir-qué-hacer-con-los-datos-de-prueba--25-10-2026).
- [ ] 🔴 🤖 Seed de prueba **no** cargado en la base de producción (o borrado), y caché de Next invalidada después de cargar el catálogo real (trampa 47).
- [ ] 🟠 👥 Revisión visual de todas las pantallas en claro y oscuro, a 1280 px y 390 px.
- [ ] 🟠 👤 Revisar los correos que recibe el cliente (confirmación, transferencia, despacho, confirmación de cuenta).

---

## Ya resuelto (para no repetirlo)

Fase 6, 25-10-2026: Webpay Plus, Flow y transferencia · reintentos y cambio de medio · cron de vencimiento + M4 · locks · B13 con reembolso automático · pantallas de resultado · Resend en el código (con llave en local desde el mismo día).

Fase 5, 24-10-2026: inicios anónimos activados · Redirect URLs agregadas (falta la prueba real) · express solo en la RM · feriados 2026–2027 verificados · pedidos de prueba anulados · M1 y M2 registradas en el historial de migraciones · despacho, IVA, redondeo y vencimiento en `place_order`.

## Dónde se mantiene esta lista

La lista viva es [07-referencia/checklist-produccion.md](../07-referencia/checklist-produccion.md) y el estado general está en [08-estado/avance.md](../08-estado/avance.md). Este archivo es una foto consolidada al 25-10-2026: cuando cierres algo, avísale al agente para que actualice el checklist y el avance.
