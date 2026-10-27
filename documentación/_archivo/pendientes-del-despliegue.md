---
title: "Pendientes del primer despliegue en Vercel"
description: "Qué quedó hecho y qué falta tras publicar la tienda en audazia.dev (25-10-2026): Supabase Auth con el dominio real, Redis, llave de Resend de producción, pagos todavía en integración/sandbox sobre un sitio público, cron diario por el plan Hobby, prueba de urlConfirmation de Flow, región de las funciones y base de datos compartida con el desarrollo. Cada tarea con quién la hace, los pasos y cómo comprobarla."
generated: "2026-10-25"
estado: "vigente"
related: ["_archivo/pendientes-antes-de-produccion.md", "_archivo/pendientes-del-dueno-fase-6.md", "07-referencia/checklist-produccion.md", "07-referencia/variables-de-entorno.md", "02-arquitectura/decisiones.md", "08-estado/avance.md"]
---

# Pendientes del primer despliegue

El 25-10-2026 la tienda quedó publicada en **https://audazia.dev**. Este archivo junta lo que quedó pendiente de ese despliegue. La lista general sigue en [pendientes-antes-de-produccion.md](pendientes-antes-de-produccion.md).

**Quién:** 👤 tú (cuentas, paneles o decisiones) · 🤖 el agente · 👥 los dos.
**Prioridad:** 🔴 sin esto no se puede abrir la tienda al público · 🟠 importante · 🟢 mejora.

## Qué quedó hecho

| Qué | Cómo quedó |
|---|---|
| Proyecto | `shop` (`prj_B1J18wYtEqSEEY8dwFGpAziwU62q`), equipo `lucas-projects-d43692ba`, plan **Hobby** |
| Git | Vinculado a `Luckillash/shop`, rama de producción `main`: cada push a `main` despliega |
| Dominios | `audazia.dev` (producción, HTTPS de Vercel) y `www.audazia.dev` → 308 a `audazia.dev` |
| Primer despliegue | `dpl_4JNAArWFKKNiZ4cWJdupzYwedcCS`, commit `e7a0578`, región `iad1` |
| Comprobado | Inicio, Ficha y Carro en 200 (la Ficha lee Supabase). `/api/cron/expirar-pedidos` en 401 sin el secreto. `/api/health` en 503 porque no hay Redis (esperado) |
| Variables (Production y Preview) | 19, copiadas de `.env.local` salvo: `NEXT_PUBLIC_SITE_URL=https://audazia.dev`, `CRON_SECRET` nuevo (distinto del local) y **sin** `REDIS_URL`. Las secretas (`SUPABASE_SECRET_KEY`, `WEBPAY_API_KEY`, `FLOW_SECRET_KEY`, `CRON_SECRET`, `RESEND_API_KEY`) como *sensitive*: no se pueden volver a leer desde Vercel |
| Cron | Diario (`0 9 * * *`, 06:00 de Chile), porque el plan es Hobby (D-021) |

## Resumen

| # | Tarea | Quién | Prioridad | Bloquea |
|---|---|---|---|---|
| 1 | Pagos en integración/sandbox sobre un sitio público | 👥 | 🔴 | Que alguien "compre" con la tarjeta de prueba |
| 2 | ~~*Site URL* y *Redirect URLs* de Supabase Auth con `https://audazia.dev`~~ ✅ (25-10-2026). La prueba es la tarea 12 | 👤 | ✅ | — |
| 3 | Redis de producción (`REDIS_URL`) | 👥 | 🔴 | Rate limiting y locks de Redis |
| 4 | Llave `almacen-produccion` de Resend | 👥 | 🔴 | Separar la llave local de la de producción |
| 5 | Base de datos compartida entre desarrollo y producción | 👥 | 🔴 | Datos de prueba visibles en el sitio público |
| 6 | Pasar a Pro y volver al cron cada 10 min | 👥 | 🟠 | Pedidos abandonados retienen stock hasta ~24 h |
| 7 | ~~Revisar la primera ejecución del cron~~ ✅ (26-10-2026, 09:00:47 UTC) | 🤖 | ✅ | — |
| 8 | ~~Probar `urlConfirmation` de Flow con el sitio desplegado~~ ✅ (25-10-2026, pedido 1036) | 🤖 | ✅ | — |
| 9 | Región de las funciones (`iad1`) frente a la de Supabase | 🤖 | 🟠 | Latencia de cada consulta |
| 10 | `NEXT_PUBLIC_SITE_URL` de Preview apunta a producción | 🤖 | 🟢 | Los retornos de pago de un preview caen en producción |
| 11 | Monitoreo (`/api/health` y errores) | 👥 | 🟢 | Enterarse de una caída |
| 12 | ~~Probar la confirmación de cuenta y *¿Olvidaste tu contraseña?* con un correo real en `audazia.dev`~~ ✅ (25-10-2026) | 👥 | ✅ | — |

---

## 1. Pagos en integración/sandbox sobre un sitio público 🔴

**Por qué:** `WEBPAY_ENV=integration` y `FLOW_API_URL=https://sandbox.flow.cl/api`. Los pagos no mueven dinero real, pero el sitio es público: cualquiera que use la tarjeta de prueba (4051 8856 0044 6623) deja un pedido **pagado** que descuenta stock.

**Pasos:**

1. Mientras no haya credenciales de producción, no anuncies el sitio. Si quieres cerrarlo, activa la protección de Vercel también en producción (*Settings → Deployment Protection*) o pide al agente una página de "próximamente".
2. 👤 Transbank: validación aprobada → llave secreta de producción. Flow: `apiKey` y `secretKey` de producción.
3. 🤖 Cambiar en Vercel `WEBPAY_ENV=production`, `WEBPAY_COMMERCE_CODE`, `WEBPAY_API_KEY`, `FLOW_API_URL=https://www.flow.cl/api`, `FLOW_API_KEY` y `FLOW_SECRET_KEY`, y volver a desplegar.

**Cómo comprobarlo:** compra real de $50 con Webpay y una con Flow (bloque 8 de la lista general).

## 2. *Site URL* y *Redirect URLs* de Supabase Auth ✅ (25-10-2026)

> **Estado (25-10-2026):** ✅ lo cambiaste a mano en el dashboard.
>
> | Qué | Cómo quedó |
> |---|---|
> | *Site URL* | `https://audazia.dev` (antes `http://localhost:3000`) |
> | *Redirect URLs* | `http://localhost:3000/auth/confirm` · `http://localhost:3000/**` · `https://audazia.dev/**` · `http://localhost:3310/**` (el puerto de `next start`) |
>
> **Prueba con un correo real:** ✅ hecha el 25-10-2026 (tarea 12). El desarrollo local sigue funcionando: `src/lib/auth/actions.ts` pasa `emailRedirectTo`/`redirectTo` con el `origin` de la petición, y `localhost:3000` y `localhost:3310` están en la lista. Solo la plantilla *Reset password*, si usa `{{ .SiteURL }}`, lleva siempre a `audazia.dev`.

**Por qué:** hoy apuntan a `localhost`. Los enlaces de los correos de Supabase (confirmar cuenta y recuperar contraseña) llevarían a tu equipo en vez de a la tienda.

**Pasos (👤, Supabase → Authentication → URL Configuration):**

1. *Site URL*: `https://audazia.dev`.
2. *Redirect URLs*: agregar `https://audazia.dev/**` (deja también las de `localhost` para el desarrollo).
3. La plantilla *Reset password* usa `{{ .SiteURL }}` (bloque 6 de la lista general): después de este cambio ya apunta al dominio real.

**Cómo comprobarlo:** crear una cuenta desde `https://audazia.dev/ingresar` con un correo real, abrir el enlace y quedar con la sesión iniciada. Lo mismo con *¿Olvidaste tu contraseña?*.

## 3. Redis de producción 🔴

**Por qué:** no se cargó `REDIS_URL`, así que el código usa `redis://localhost:6379`, que en Vercel no existe. Consecuencias:

- El rate limiting (login, cupón, sesión anónima, pedidos y reintentos de pago) **deja pasar todo** (fail-open, D-005).
- Los locks de pago caen al lock de la base de datos (`claim_payment`): siguen protegidos.
- Cada intento de conexión espera hasta el límite de 500 ms antes de seguir, así que las rutas con rate limiting son más lentas.
- `/api/health` responde 503 (`ECONNREFUSED 127.0.0.1:6379`).

**Pasos:**

1. 👤 Crear un Redis desde el Marketplace de Vercel (*Storage* → Redis, por ejemplo Upstash) y conectarlo al proyecto `shop`, o en Redis Cloud. Conviene la región más cercana a las funciones (tarea 9).
2. 🤖 Comprobar que la variable se llama `REDIS_URL` (la integración puede crear otros nombres) y volver a desplegar.

**Cómo comprobarlo:** `https://audazia.dev/api/health` responde `{"redis":"PONG"}` con 200, y el cupón inexistente número 11 en 10 minutos queda bloqueado.

## 4. Llave `almacen-produccion` de Resend 🔴

**Por qué:** en Vercel quedó la llave `almacen-local` (D-022). Funciona, pero comparte la llave entre tu equipo y producción: si la revocas o se filtra en local, cae en los dos.

**Pasos:**

1. 👤 En Resend → *API Keys*, crear `almacen-produccion` con *Sending access* solo para `mail.audazia.dev`. Cárgala tú en Vercel (*Settings → Environment Variables*, `RESEND_API_KEY`, Production) para que no pase por el chat.
2. 🤖 Volver a desplegar y hacer un pedido con transferencia para comprobar que llega el correo.
3. Remitente: por ahora se queda *Almacén* (decisión del dueño, 26-10-2026; lo cambiará más adelante). Si cambia, actualizar `EMAIL_FROM` en Vercel y el nombre del remitente del SMTP de Supabase Auth.
4. Mirar si los correos siguen llegando a spam en Outlook. Cuando los reportes DMARC estén limpios, subir a `p=quarantine`.

## 5. Base de datos compartida entre desarrollo y producción 🔴

**Por qué:** hay un solo proyecto de Supabase (`nswchmyzgcutyehhuche`), y tanto `localhost` como `audazia.dev` lo usan. En el sitio público se ven el catálogo de ejemplo, los cupones de prueba (BIENVENIDA10, DESCUENTO5000) y el stock que dejaron los pedidos de prueba 1001–1043. Lo que pruebes en local afecta a producción.

**Opciones:**

| Opción | Efecto |
|---|---|
| a) Un proyecto de Supabase nuevo para producción | Aplicar las migraciones, cargar el catálogo real y cambiar las variables `*SUPABASE*` en Vercel. El de ahora queda para el desarrollo |
| b) Seguir con uno solo | Antes de abrir, hacer la limpieza de la tarea 6 de [fase 6](pendientes-del-dueno-fase-6.md#6-decidir-qué-hacer-con-los-datos-de-prueba--25-10-2026) y dejar de probar contra él (o usar las ramas de Supabase) |

**Decisión:** pendiente (👤).

## 6. Pasar a Pro y volver al cron cada 10 min 🟠

**Por qué:** la cuenta sigue en **Hobby**, aunque se había anotado Pro el 25-10-2026 (D-021). Hobby solo permite crons diarios, así que `vercel.json` quedó con `0 9 * * *`. Un pedido abandonado de Webpay o Flow retiene el stock hasta que el cron lo anula, unas 24 horas en vez de 30 minutos. La transferencia (48 h) casi no cambia. Además, Hobby no admite uso comercial según los términos de Vercel.

**Decisión (26-10-2026):** la cuenta sigue en Hobby y el dueño planea pasarla a Pro. Mientras tanto, el cron queda diario y no se configura `pg_cron`.

**Pasos:**

1. 👤 Pasar la cuenta a Pro (*Settings → Billing*). Tienes la prueba disponible.
2. 🤖 Volver a `"schedule": "*/10 * * * *"` en `vercel.json`, el comentario de `src/app/api/cron/expirar-pedidos/route.ts` y D-021, y hacer push a `main`.

**Alternativa sin Pro:** `pg_cron` + `pg_net` en Supabase llamando a `https://audazia.dev/api/cron/expirar-pedidos` con el secreto cada 10 min (opción b de la tarea 3 de la fase 6). Necesita que el agente genere un `CRON_SECRET` nuevo, porque el actual está como *sensitive* y no se puede leer.

## 7. Revisar la primera ejecución del cron ✅ (26-10-2026)

**Cuándo:** después del **26-10-2026 a las 09:00 UTC** (06:00 de Chile). En Hobby la hora no es exacta: puede correr dentro de esa hora.

**Cómo comprobarlo (🤖):** *Settings → Cron Jobs* muestra `/api/cron/expirar-pedidos` y la ejecución responde 200 (no 401). En los logs aparece `[cron] expirar-pedidos` con `{ checked, cancelled, recovered, skipped }`.

**Revisión del 26-10 a las 01:52 UTC (22:52 del 25-10 en Chile):** todavía no le tocaba; no hay ejecuciones de `/api/cron/expirar-pedidos` en los logs de producción de los 2 días anteriores. El dueño eligió seguir con la 7.1 y revisarlo en la próxima sesión, después de las 06:00 (T1 de la [fase 7](pendientes-del-dueno-fase-7.md)).

**✅ Revisión del 26-10 a las 21:41 UTC (MCP de Vercel):** corrió a las **09:00:47 UTC** (06:00 de Chile), en producción (`dpl_5gwAZ1EY8rtaAYKhKLmFzS8L3Ny7`, `iad1`), con el log `[cron] expirar-pedidos { checked: 0, cancelled: 0, recovered: 0, skipped: 0 }`. Ese log solo se escribe después de validar `CRON_SECRET` y justo antes de responder 200, así que no hubo 401. No había pedidos vencidos que anular.

**Si hay que dispararlo a mano:** el valor de `CRON_SECRET` no se puede leer desde Vercel. El agente genera uno nuevo, lo carga y lo usa en el `curl`.

## 8. Probar `urlConfirmation` de Flow con el sitio desplegado ✅ (25-10-2026)

> **Resultado (25-10-2026):** ✅ compra en Flow sandbox desde `https://audazia.dev` (pedido **1036**, $18.990), con la pestaña cerrada al aprobarse el pago. Flow envió el POST a `/api/pagos/flow/confirmacion` a las 00:29:23 UTC (petición `wt6jl-1792974562240-e3480420aafd`, despliegue `dpl_7i3NUYBRvUy6brAJCyEyHeTNhwc1`), el intento `1036-1` pasó a `paid` 0,8 s después y el pedido a `paid`, con el stock descontado (movimiento `sale` −1) y el correo de confirmación del pago llegó al cliente (remitente `pedidos@mail.audazia.dev`). No hubo ningún GET a `/api/pagos/flow/retorno`: el pago quedó registrado solo por el aviso del servidor. Sin Redis, el lock cayó a `claim_payment` como estaba previsto (tarea 3). Antes de la compra se comprobó que la ruta responde `200 ok` con un token desconocido y `400` sin token.

**Por qué:** es la tarea 5 de la [fase 6](pendientes-del-dueno-fase-6.md#5-probar-la-confirmación-de-flow-con-un-túnel-o-con-el-sitio-desplegado-). En local solo se simuló (D-024). Ya hay una URL pública, así que no hace falta túnel.

**Pasos (🤖):** compra en Flow sandbox desde `https://audazia.dev`, cerrar el navegador después de pagar, y revisar en los logs de Vercel que llegó el POST a `urlConfirmation` y que el pedido quedó `paid` sin que el cliente volviera. Deja un pedido de prueba más que hay que borrar (tarea 5).

## 9. Región de las funciones frente a la de Supabase 🟠

**Por qué:** las funciones corren en `iad1` (Washington). Si la base de datos de Supabase está en otra región (por ejemplo São Paulo, como Resend), cada consulta cruza el continente, y una página hace varias.

**Pasos (🤖):** mirar la región del proyecto de Supabase y, si no coincide, cambiar *Settings → Functions → Function Region* (por ejemplo `gru1` para São Paulo) y volver a desplegar. Comparar el tiempo de respuesta de la Ficha antes y después.

## 10. `NEXT_PUBLIC_SITE_URL` de Preview apunta a producción 🟢

**Por qué:** la variable se cargó con `https://audazia.dev` también en Preview. En un despliegue de preview, los `return_url` de Webpay y `urlReturn`/`urlConfirmation` de Flow y los enlaces de los correos apuntan a producción, no al preview.

**Pasos (🤖):** si se van a probar pagos en previews, sacar la variable de Preview y que el código use `VERCEL_URL` o la URL del branch cuando falte. Si no, dejarla así.

## 11. Monitoreo 🟢

**Pasos (👥):** cuando haya Redis (tarea 3), poner `https://audazia.dev/api/health` en un servicio de uptime. Revisar *Observability* de Vercel (errores de las funciones) después de las primeras compras.

## 12. Probar la confirmación de cuenta y la recuperación de contraseña con un correo real ✅ (25-10-2026)

> **Resultado (25-10-2026):** ✅ hecho por el dueño en `https://audazia.dev/ingresar`: la cuenta se creó, el enlace de confirmación funcionó y *¿Olvidaste tu contraseña?* también. Comprobado por el agente en `auth.users`: cuenta `8c328ed4-69ce-46f8-a259-9fe8f7dd2c95` (proveedor `email`), creada a las 00:45:44 UTC del 26-10 (21:45 de Chile), confirmada a las 00:49:13 UTC y con el último inicio de sesión a las 00:50:28 UTC. Es la primera cuenta creada desde `/ingresar` con un correo real. La plantilla *Reset password* con `token_hash` (paso 5) ✅ quedó el 26-10-2026 (T4 de la [fase 7](pendientes-del-dueno-fase-7.md)): el enlace funciona también en otro navegador.

**Por qué:** la tarea 2 dejó las URL de Supabase Auth con el dominio real, pero nunca se probó el flujo completo: no hay ninguna cuenta creada desde `/ingresar` con un correo real (bloque 6 de la lista general). Si algo falla (URL fuera de la lista, plantilla con el enlace mal armado, correo en spam), el cliente no puede crear cuenta ni recuperar la contraseña.

**Pasos (👥: tú pones el correo y abres los enlaces; el agente puede llevar el navegador):**

1. En `https://audazia.dev/ingresar`, crear una cuenta con un correo real tuyo.
2. Abrir el correo de confirmación de Supabase: el enlace debe llevar a `https://audazia.dev/auth/confirm…` y dejar la sesión iniciada en `/cuenta`.
3. Cerrar sesión, ir a *¿Olvidaste tu contraseña?* (`/ingresar/recuperar`) con el mismo correo.
4. Abrir el correo: el enlace debe llevar a `/ingresar/nueva-contrasena` en `audazia.dev`, permitir cambiar la contraseña e iniciar sesión con la nueva.
5. Revisar la plantilla *Reset password* (Authentication → Email Templates) si el enlace solo funciona en el mismo navegador donde se pidió (bloque 6 de la lista general).

**Cómo comprobarlo:** las dos veces se termina con la sesión iniciada en `audazia.dev`, sin pasar por `localhost`. Anotar si los correos llegaron a spam (el SMTP por defecto de Supabase tiene un límite muy bajo; ver el SMTP propio en la lista general).

**Después:** esa cuenta sirve como la del admin (bloque 6 de la lista general), o se borra junto con los usuarios de prueba.

---

## Cuando termines

Avísale al agente qué hiciste (por ejemplo: *"Ya cambié las URL de Supabase; creé el Redis en Upstash; voy con un proyecto de Supabase nuevo"*). El agente vuelve a desplegar, comprueba cada punto y actualiza [pendientes antes de producción](pendientes-antes-de-produccion.md), el [checklist de producción](../07-referencia/checklist-produccion.md), el [avance](../08-estado/avance.md) y el [registro de cambios](../08-estado/registro-de-cambios.md).
