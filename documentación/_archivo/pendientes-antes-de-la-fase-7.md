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
| 2 | ~~Revisar la primera ejecución del cron (`/api/cron/expirar-pedidos`, 200 y no 401)~~ ✅ (26-10-2026): corrió el 26-10-2026 a las 09:00:47 UTC con `{ checked: 0, cancelled: 0, recovered: 0, skipped: 0 }` (200) | 🤖 | — | Tarea 7 de [despliegue](pendientes-del-despliegue.md) |
| 3 | ~~Decidir el nombre del remitente de los correos~~ ✅ (26-10-2026): por ahora se queda *Almacén* (`EMAIL_FROM=Almacén <pedidos@mail.audazia.dev>` y el remitente del SMTP de Supabase Auth). El dueño lo cambiará más adelante | 👤 | Para cambiarlo: `EMAIL_FROM` en `.env.local` y en Vercel, y el nombre del remitente en *Authentication → SMTP Settings* de Supabase | Tarea 4 de [despliegue](pendientes-del-despliegue.md) (llave y remitente de producción) |

## 2. Lo que quedó de las fases 5 y 6 para antes de producción

Ya están en la [lista general](pendientes-antes-de-produccion.md) y en el [checklist de producción](../07-referencia/checklist-produccion.md). Se juntan aquí para no perderlos:

| Pendiente | Viene de | Quién | Prioridad | En la lista general |
|---|---|---|---|---|
| Borrar los datos de prueba: pedidos **1001–1043** (no hay 1037). Primero `cancel_order` a los **pagados** (1020–1022, 1027–1029, 1036 y 1038) para devolver el stock; los **enviados** 1040 y 1043 (`shipped`) no los acepta `cancel_order`, así que su stock se corrige a mano o al cargar el catálogo real. El 1042 ya está anulado, con el pago de Flow sandbox sin reembolsar (se deja para probar la 7.4). Después, borrarlos de `orders` | Fase 5 tarea 6 · fase 6 tarea 6 | 🤖 | 🔴 | Bloque 8 |
| Borrar los usuarios de prueba: todos salvo tu cuenta real (`lucassalazarc@outlook.com`). Al 26-10-2026 son 47: `prueba.fase5@almacen.cl`, 5 de mailinator (`almacen.invitado72`, `almacen.registro72`, `almacen.invitado73`, `almacen.asuntos72` y `almacen.asuntos74`) y 41 anónimos | Fase 5 tarea 6 | 👤 | 🔴 | Bloque 6 |
| Activar *Leaked password protection* en Supabase Auth | Advisors de la fase 5 | 👤 | 🔴 | Bloque 6 |
| ~~Plantilla del correo *Reset password* con `token_hash`~~ ✅ (26-10-2026, T4 de la [fase 7](pendientes-del-dueno-fase-7.md)): el enlace funciona en otro navegador | Fase 5 | 👤 | 🟠 | Bloque 6 |
| ~~Templates de todos los correos de Supabase Auth (confirmar cuenta, recuperar contraseña, enlace mágico, cambio de correo, invitación y reautenticación), en español y con el estilo de la tienda~~ ✅ (26-10-2026, T4 y T7 de la [fase 7](pendientes-del-dueno-fase-7.md)): en `supabase/templates/`, pegadas y probadas con correos reales | Nuevo (25-10-2026) | 👥 | 🟠 | Bloque 6 |
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
