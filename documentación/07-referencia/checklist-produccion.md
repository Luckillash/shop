---
title: "Checklist para pasar a producción"
description: "Lista de verificación antes de publicar la tienda: seguridad, base de datos, pagos (validación de Transbank, credenciales de Flow), datos legales, rendimiento, accesibilidad y operación."
keywords: ["producción", "checklist", "deploy", "lanzamiento", "seguridad", "validación transbank", "credenciales", "HTTPS", "advisors", "npm audit", "legal"]
related: ["07-referencia/variables-de-entorno.md", "06-implementacion/pagos-webpay-plus.md", "06-implementacion/pagos-flow.md"]
source: ["../transbank/documentación/07-referencia/checklist-produccion.md", "../flow/documentación/07-referencia/checklist-produccion.md", "node_modules/next/dist/docs/01-app/02-guides/production-checklist.md", "_archivo/avance-del-proyecto.md §6"]
estado: "propuesta"
---

# Checklist de producción

> **Úsalo cuando:** te preparas para publicar. Revisa también los checklists de Flow y Transbank (en `source`) y la guía `production-checklist.md` de Next.

## Seguridad
- [ ] `SUPABASE_SECRET_KEY`, `WEBPAY_API_KEY`, `FLOW_SECRET_KEY`, `CRON_SECRET` y `RESEND_API_KEY` solo en el servidor, nunca con `NEXT_PUBLIC_`.
- [ ] `get_advisors` (security y performance) de Supabase sin errores.
- [ ] Activar *Leaked password protection* en Supabase Auth (advisor `auth_leaked_password_protection`).
- [ ] Todas las tablas nuevas tienen RLS y políticas.
- [ ] Rate limiting en login, sesión anónima, cupón, creación de pedidos y reintentos de pago (✅ en el código desde las fases 5 y 6; necesita Redis en producción: sin Redis, deja pasar).
- [ ] Confirmación de correo probada con un correo real (enlace → `/auth/confirm` → sesión iniciada). *Site URL* y *Redirect URLs* de Supabase con el dominio real.
- [x] `/api/cron/*` protegido con un secreto (✅ fase 6: `Authorization: Bearer CRON_SECRET`, 401 sin él). Falta cargar `CRON_SECRET` en producción.
- [ ] `npm audit` revisado: había 5 vulnerabilidades "high" en las dependencias de la plantilla, y no se aplicó `--force`.
- [ ] HTTPS en todo el sitio (Transbank lo exige en los endpoints del comercio).
- [ ] El proxy o la plataforma sobrescribe `x-forwarded-for` (el rate limiting usa esa IP).
- [ ] Redis de producción configurado (`REDIS_URL`); sin Redis el rate limiting deja pasar todo y los locks de pago caen al lock de la BD (`claim_payment`).
- [ ] Hosting decidido, variables de entorno de producción cargadas y `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` fija si hay varias instancias.

## Base de datos
- [ ] Migraciones M1–M6 aplicadas y documentadas (M1–M4 y M6 ✅; M4 con los intentos de pago como `payments_attempts_m4`, 25-10-2026; falta M5 con los filtros).
- [ ] Seed de prueba **no** cargado en producción (o borrado). Cupones de prueba desactivados.
- [ ] Al menos un admin creado.
- [ ] Usuarios de prueba borrados (*Authentication → Users*): `prueba.fase5@almacen.cl` y los anónimos de las pruebas de las fases 5 y 6. Pedidos de prueba: 1001–1035 y los que se creen en la fase 7 (se dejaron a propósito hasta producción, 25-10-2026). **Borrarlos:** primero `cancel_order` a los pagados (1020–1022 y 1027–1029) para devolver el stock, y después `delete` en `orders` (borra en cascada `order_items`, `payments`, `payment_alerts` y `coupon_redemptions`).
- [x] M1 y M2 registradas en el historial de migraciones (`orders_checkout_fields_place_order_v2`, 24-10-2026).
- [ ] Respaldos activados (plan de Supabase).

## Pagos
- [ ] **Webpay:** proceso de validación aprobado por Transbank → llave secreta de producción → `WEBPAY_ENV=production` → **compra real de $50**.
- [ ] **Flow:** credenciales de producción (`https://www.flow.cl/api`), medios de pago contratados y `timeout` configurado.
- [ ] `NEXT_PUBLIC_SITE_URL` = el dominio real (queda fija en el build). `urlConfirmation` de Flow alcanzable y probada de verdad (en local se simuló con `curl`, D-024).
- [x] Probados en integración/sandbox los casos aprobado, rechazado, abortado, timeout (simulado), recarga del retorno, retornos simultáneos, navegador cerrado después de pagar y pago tardío sobre un pedido vencido (25-10-2026). Repetirlos en producción.
- [x] Plan de Vercel que permite el cron cada 10 min: **Pro** (25-10-2026, D-021).
- [ ] Cron de vencimiento funcionando en producción (✅ en local): `CRON_SECRET` de producción **generado al desplegar** (distinto al local) y cargado en Vercel y, tras el primer despliegue, *Settings → Cron Jobs* con ejecuciones en 200.
- [x] Datos bancarios reales de la transferencia en `BANK_*` de `.env.local` (25-10-2026, D-024).
- [ ] Las seis variables `BANK_*` cargadas también en Vercel.
- [ ] Datos reales del retiro en tienda (hoy ficticios: Av. Manuel Montt 1530, Local 4) en `src/lib/store.ts` y en `place_order` (`store.test.ts` vigila que coincidan).

## Legal y contenido
- [ ] Razón social y RUT reales en el footer (el diseño usa *Almacén SpA · RUT 76.543.210-3* como ejemplo ajustable).
- [ ] Términos y condiciones y política de privacidad publicados (el checkout los enlaza). Las páginas `/ayuda/terminos`, `/ayuda/privacidad`, `/ayuda/despacho` y `/ayuda/contacto` **no existen todavía** (dan 404).
- [ ] Catálogo real (productos, precios, stock, fotos 4:5) y cupones reales; BIENVENIDA10 y DESCUENTO5000 desactivados si no se usan.
- [ ] SMTP propio en Supabase Auth y proveedor de correo transaccional con dominio verificado.
- [ ] Emisión de boleta o factura electrónica resuelta (D-012).
- [x] Dominio de `EMAIL_FROM` verificado en Resend: `mail.audazia.dev` (SPF, DKIM y DMARC `p=none`, 25-10-2026, D-022).
- [ ] Correos transaccionales en producción: llave `almacen-produccion` de Resend y `EMAIL_FROM` en Vercel. Sin la llave, los correos se omiten.
- [ ] Los correos llegan a la bandeja principal (el 25-10-2026 llegaban a spam en Outlook por ser un dominio nuevo). Cuando los reportes DMARC estén limpios, subir a `p=quarantine`.
- [ ] Revisar las alertas abiertas de `payment_alerts` (B13, doble pago, reembolsos fallidos) y definir quién las atiende.

## Calidad
- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] Accesibilidad: teclado, foco, contraste en claro y oscuro, lectores de pantalla en el precio, el pago rechazado y los errores.
- [ ] `lang="es-CL"`, metadata y Open Graph por página.
- [ ] Imágenes 4:5 optimizadas con `next/image` (`remotePatterns` hacia Storage). Hoy el catálogo usa `<img>` porque los placeholders son SVG (D-015); se cambia cuando estén las fotos reales.
- [ ] Página 404 y `error.tsx` con el diseño.
