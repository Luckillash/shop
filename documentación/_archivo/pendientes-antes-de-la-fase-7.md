---
title: "Pendientes al cerrar las fases 5 y 6"
description: "Qué queda de las fases 5 y 6 antes de empezar la fase 7 (25-10-2026): nada la bloquea; dos pruebas recomendadas (cuenta con un correo real, ya hecha, y primera ejecución del cron) y lo que se dejó a propósito para antes de producción, con enlaces a la lista general y a los pendientes del despliegue."
generated: "2026-10-25"
estado: "vigente"
related: ["_archivo/pendientes-antes-de-produccion.md", "_archivo/pendientes-del-despliegue.md", "_archivo/pendientes-del-dueno-fase-5.md", "_archivo/pendientes-del-dueno-fase-6.md", "07-referencia/checklist-produccion.md", "08-estado/avance.md"]
---

# Pendientes al cerrar las fases 5 y 6

Revisión del 25-10-2026, después de probar la `urlConfirmation` de Flow en `audazia.dev` (pedido 1036). **Nada de las fases 5 y 6 bloquea la fase 7**: las tareas del dueño están cerradas o se postergaron a propósito hasta producción.

**Quién:** 👤 tú · 🤖 el agente · 👥 los dos.
**Prioridad:** 🔴 sin esto no se puede abrir la tienda al público · 🟠 importante · 🟢 mejora.

## 1. Antes de empezar la fase 7 (recomendado, no bloquea)

| # | Tarea | Quién | Por qué ahora | Dónde está el detalle |
|---|---|---|---|---|
| 1 | ~~Crear una cuenta en `https://audazia.dev/ingresar` con un correo real, abrir el enlace de confirmación y probar *¿Olvidaste tu contraseña?*~~ ✅ (25-10-2026): las dos funcionaron; en `auth.users` la cuenta quedó con `email_confirmed_at` | 👥 | — | Tarea 12 de [despliegue](pendientes-del-despliegue.md) · bloque 6 de la [lista general](pendientes-antes-de-produccion.md#6-supabase) |
| 2 | Revisar la primera ejecución del cron (`/api/cron/expirar-pedidos`, 200 y no 401) | 🤖 | Corre una vez al día a las 09:00 UTC (06:00 de Chile); la primera es el 26-10-2026 | Tarea 7 de [despliegue](pendientes-del-despliegue.md) |
| 3 | Decidir el nombre del remitente de los correos | 👤 | El correo del pedido 1036 llegó y se ve como *audazia*. `EMAIL_FROM` dice `Almacén <pedidos@mail.audazia.dev>`; si quieres otro nombre, el agente lo cambia en Vercel | Tarea 4 de [despliegue](pendientes-del-despliegue.md) (llave y remitente de producción) |

## 2. Lo que quedó de las fases 5 y 6 para antes de producción

Ya están en la [lista general](pendientes-antes-de-produccion.md) y en el [checklist de producción](../07-referencia/checklist-produccion.md). Se juntan aquí para no perderlos:

| Pendiente | Viene de | Quién | Prioridad | En la lista general |
|---|---|---|---|---|
| Borrar los datos de prueba: `cancel_order` a los pagados (1020–1022, 1027–1029 y 1036) y después borrar los pedidos 1001–1036 y los de la fase 7 | Fase 5 tarea 6 · fase 6 tarea 6 | 🤖 | 🔴 | Bloque 8 |
| Borrar los usuarios de prueba: `prueba.fase5@almacen.cl` y los anónimos | Fase 5 tarea 6 | 👤 | 🔴 | Bloque 6 |
| Activar *Leaked password protection* en Supabase Auth | Advisors de la fase 5 | 👤 | 🔴 | Bloque 6 |
| Plantilla del correo *Reset password* con `token_hash` (la recuperación ya funcionó con un correo real el 25-10-2026; la plantilla hace que el enlace sirva también en otro navegador) | Fase 5 | 👤 | 🟠 | Bloque 6 |
| Templates de todos los correos de Supabase Auth (confirmar cuenta, recuperar contraseña, enlace mágico, cambio de correo, invitación y reautenticación), en español y con el estilo de la tienda. Hoy salen los de Supabase por defecto, en inglés. El agente genera el HTML; tú los pegas en *Authentication → Email Templates* | Nuevo (25-10-2026) | 👥 | 🟠 | Bloque 6 |
| Credenciales de producción de Webpay y Flow, y repetir la prueba de `urlConfirmation` con ellas | Fase 6 | 👥 | 🔴 | Bloques 5 y 8 |
| Llave `almacen-produccion` de Resend en Vercel; revisar si los correos siguen cayendo en spam | Fase 6 tarea 1 | 👥 | 🔴 | Bloque 7 · tarea 4 de [despliegue](pendientes-del-despliegue.md) |
| Cron cada 10 min: pasar a Pro o `pg_cron` (hoy diario, plan Hobby) | Fase 6 tarea 3 | 👥 | 🔴 | Bloque 7 · tarea 6 de [despliegue](pendientes-del-despliegue.md) |
| Redis de producción (sin él, el rate limiting deja pasar todo; los locks de pago caen a `claim_payment`) | Fase 6 | 👥 | 🔴 | Bloque 7 · tarea 3 de [despliegue](pendientes-del-despliegue.md) |
| Proveedor de boleta electrónica (D-012) | Fase 6 | 👤 | 🔴 | Bloque 5 |
| `npm audit`: 5 vulnerabilidades "high" de la plantilla | Fase 5 | 🤖 | 🟠 | Bloque 3 |
| Tests E2E (Playwright) del flujo de compra y de los pagos | Fases 5 y 6 | 🤖 | 🟠 | Bloque 3 |
| Revisar las políticas de `reviews` con usuarios anónimos (advisor `auth_allow_anonymous_sign_ins`) | Fase 5 tarea 7 | 🤖 | 🟢 | Bloque 2 (reseñas, fase 7) |
| Feriados de 2028 | Fase 5 tarea 5 | 🤖 | 🟢 | Bloque 3 (antes de diciembre de 2027) |

## 3. Ya cerrado en las fases 5 y 6

- **Fase 5:** inicios anónimos, `/auth/confirm` en las Redirect URLs (con la confirmación de cuenta y *¿Olvidaste tu contraseña?* probadas con un correo real en `audazia.dev` el 25-10-2026), datos reales del retiro en tienda, express solo en la RM, feriados 2026–2027 e historial de migraciones ([pendientes de la fase 5](pendientes-del-dueno-fase-5.md)).
- **Fase 6:** Resend con `mail.audazia.dev`, textos propuestos aprobados, cron diario con `CRON_SECRET` en Vercel, datos bancarios reales, `urlConfirmation` de Flow probada en `audazia.dev` (pedido 1036, con el correo de confirmación recibido) y la decisión sobre los datos de prueba ([pendientes de la fase 6](pendientes-del-dueno-fase-6.md)).
