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
| 2 | *Site URL* y *Redirect URLs* de Supabase Auth con `https://audazia.dev` | 👤 | 🔴 | Confirmación de cuenta y recuperar contraseña |
| 3 | Redis de producción (`REDIS_URL`) | 👥 | 🔴 | Rate limiting y locks de Redis |
| 4 | Llave `almacen-produccion` de Resend | 👥 | 🔴 | Separar la llave local de la de producción |
| 5 | Base de datos compartida entre desarrollo y producción | 👥 | 🔴 | Datos de prueba visibles en el sitio público |
| 6 | Pasar a Pro y volver al cron cada 10 min | 👥 | 🟠 | Pedidos abandonados retienen stock hasta ~24 h |
| 7 | Revisar la primera ejecución del cron | 🤖 | 🟠 | Saber que `CRON_SECRET` funciona en producción |
| 8 | Probar `urlConfirmation` de Flow con el sitio desplegado | 🤖 | 🟠 | Confiar en Flow cuando el cliente cierra el navegador |
| 9 | Región de las funciones (`iad1`) frente a la de Supabase | 🤖 | 🟠 | Latencia de cada consulta |
| 10 | `NEXT_PUBLIC_SITE_URL` de Preview apunta a producción | 🤖 | 🟢 | Los retornos de pago de un preview caen en producción |
| 11 | Monitoreo (`/api/health` y errores) | 👥 | 🟢 | Enterarse de una caída |

---

## 1. Pagos en integración/sandbox sobre un sitio público 🔴

**Por qué:** `WEBPAY_ENV=integration` y `FLOW_API_URL=https://sandbox.flow.cl/api`. Los pagos no mueven dinero real, pero el sitio es público: cualquiera que use la tarjeta de prueba (4051 8856 0044 6623) deja un pedido **pagado** que descuenta stock.

**Pasos:**

1. Mientras no haya credenciales de producción, no anuncies el sitio. Si quieres cerrarlo, activa la protección de Vercel también en producción (*Settings → Deployment Protection*) o pide al agente una página de "próximamente".
2. 👤 Transbank: validación aprobada → llave secreta de producción. Flow: `apiKey` y `secretKey` de producción.
3. 🤖 Cambiar en Vercel `WEBPAY_ENV=production`, `WEBPAY_COMMERCE_CODE`, `WEBPAY_API_KEY`, `FLOW_API_URL=https://www.flow.cl/api`, `FLOW_API_KEY` y `FLOW_SECRET_KEY`, y volver a desplegar.

**Cómo comprobarlo:** compra real de $50 con Webpay y una con Flow (bloque 8 de la lista general).

## 2. *Site URL* y *Redirect URLs* de Supabase Auth 🔴

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
3. Mirar si los correos siguen llegando a spam en Outlook. Cuando los reportes DMARC estén limpios, subir a `p=quarantine`.

## 5. Base de datos compartida entre desarrollo y producción 🔴

**Por qué:** hay un solo proyecto de Supabase (`nswchmyzgcutyehhuche`), y tanto `localhost` como `audazia.dev` lo usan. En el sitio público se ven el catálogo de ejemplo, los cupones de prueba (BIENVENIDA10, DESCUENTO5000) y el stock que dejaron los pedidos de prueba 1001–1035. Lo que pruebes en local afecta a producción.

**Opciones:**

| Opción | Efecto |
|---|---|
| a) Un proyecto de Supabase nuevo para producción | Aplicar las migraciones, cargar el catálogo real y cambiar las variables `*SUPABASE*` en Vercel. El de ahora queda para el desarrollo |
| b) Seguir con uno solo | Antes de abrir, hacer la limpieza de la tarea 6 de [fase 6](pendientes-del-dueno-fase-6.md#6-decidir-qué-hacer-con-los-datos-de-prueba--25-10-2026) y dejar de probar contra él (o usar las ramas de Supabase) |

**Decisión:** pendiente (👤).

## 6. Pasar a Pro y volver al cron cada 10 min 🟠

**Por qué:** la cuenta sigue en **Hobby**, aunque se había anotado Pro el 25-10-2026 (D-021). Hobby solo permite crons diarios, así que `vercel.json` quedó con `0 9 * * *`. Un pedido abandonado de Webpay o Flow retiene el stock hasta que el cron lo anula, unas 24 horas en vez de 30 minutos. La transferencia (48 h) casi no cambia. Además, Hobby no admite uso comercial según los términos de Vercel.

**Pasos:**

1. 👤 Pasar la cuenta a Pro (*Settings → Billing*). Tienes la prueba disponible.
2. 🤖 Volver a `"schedule": "*/10 * * * *"` en `vercel.json`, el comentario de `src/app/api/cron/expirar-pedidos/route.ts` y D-021, y hacer push a `main`.

**Alternativa sin Pro:** `pg_cron` + `pg_net` en Supabase llamando a `https://audazia.dev/api/cron/expirar-pedidos` con el secreto cada 10 min (opción b de la tarea 3 de la fase 6). Necesita que el agente genere un `CRON_SECRET` nuevo, porque el actual está como *sensitive* y no se puede leer.

## 7. Revisar la primera ejecución del cron 🟠

**Cuándo:** después del **26-10-2026 a las 09:00 UTC** (06:00 de Chile). En Hobby la hora no es exacta: puede correr dentro de esa hora.

**Cómo comprobarlo (🤖):** *Settings → Cron Jobs* muestra `/api/cron/expirar-pedidos` y la ejecución responde 200 (no 401). En los logs aparece `[cron] expirar-pedidos` con `{ checked, cancelled, recovered, skipped }`.

**Si hay que dispararlo a mano:** el valor de `CRON_SECRET` no se puede leer desde Vercel. El agente genera uno nuevo, lo carga y lo usa en el `curl`.

## 8. Probar `urlConfirmation` de Flow con el sitio desplegado 🟠

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

---

## Cuando termines

Avísale al agente qué hiciste (por ejemplo: *"Ya cambié las URL de Supabase; creé el Redis en Upstash; voy con un proyecto de Supabase nuevo"*). El agente vuelve a desplegar, comprueba cada punto y actualiza [pendientes antes de producción](pendientes-antes-de-produccion.md), el [checklist de producción](../07-referencia/checklist-produccion.md), el [avance](../08-estado/avance.md) y el [registro de cambios](../08-estado/registro-de-cambios.md).
