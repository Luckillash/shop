---
title: "Prompt para continuar con la subetapa 7.2"
description: "Prompt para pegar en un chat nuevo y hacer la subetapa 7.2 de la fase 7 (el invitado crea su cuenta desde la Confirmación, conservando sus pedidos, y Ver estado del pedido, B38): qué leer, lo que dejaron la 7.0 y la 7.1, el alcance con su artboard, el contexto fuera del código, lo pendiente antes de empezar y cómo trabajar."
generated: "2026-10-26"
estado: "vigente"
related: ["_archivo/plan-fase-7.md", "_archivo/pendientes-del-dueno-fase-7.md", "_archivo/prompt-subetapa-7-1.md", "08-estado/avance.md", "04-diseno/templates.md", "02-arquitectura/decisiones.md"]
---

# Prompt para continuar con la subetapa 7.2

Copia el bloque en un chat nuevo. Si algo cambió desde el 26-10-2026 (cron revisado, decisiones o textos de la 7.1 respondidos, pedidos de prueba nuevos), actualízalo antes de pegarlo.

````markdown
# Fase 7 de Shop (tienda Almacén) · subetapa 7.2: el invitado crea su cuenta

Trabajas en `C:\Users\lucas\OneDrive\Escritorio\MCPS\shop`: Next.js 16 + React 19 + TypeScript + Zustand + Redis + Supabase, publicado en https://audazia.dev (Vercel Hobby). Las fases 0 a 6 están terminadas; de la fase 7, la **7.0** (base) y la **7.1** (Mis pedidos y Detalle de pedido) quedaron listas el 25-10-2026. El plan está aprobado para avanzar por subetapas: haz la **7.2** y detente al terminarla.

## Lee primero, en este orden
1. `AGENTS.md`: esta versión de Next tiene cambios incompatibles. Antes de escribir código, lee la guía que corresponda en `node_modules/next/dist/docs/` (Server Actions y formularios; `02-guides/authentication-with-cache-components.md`).
2. `documentación/README.md`: invariantes y la tabla "¿Qué archivo leo?".
3. `documentación/_archivo/plan-fase-7.md`: la fila de la 7.2, la sección *Lo que deja la 7.1 para las siguientes subetapas* y las decisiones del dueño (siguen ⏳).
4. `documentación/08-estado/avance.md` y las entradas de la 7.0 y la 7.1 en `08-estado/registro-de-cambios.md`.
5. `documentación/07-referencia/trampas-conocidas.md` antes de tocar código, sobre todo 9, 43, 56, 58, 59, 60, 62, 63, 65, 75 y 76.
6. `02-arquitectura/autenticacion-y-autorizacion.md`, `02-arquitectura/decisiones.md` (D-008, D-018, D-022, D-024 y D-026), `04-diseno/templates.md` (Cuenta: *Confirmación · invitado crea su cuenta*), `04-diseno/estados-y-mensajes.md` (Confirmación y Transferencia pendiente), `03-base-de-datos/seguridad-rls.md` (usuarios anónimos) y las brechas B21, B22 y B38.

## Lo que dejaron la 7.0 y la 7.1 (úsalo, no lo dupliques)
- `getSessionUser()` (`src/lib/auth/session.ts`) devuelve `isAnonymous`. Las acciones de cuenta están en `src/lib/auth/actions.ts` (`signIn`, `signUp`, `startGuestCheckout`, `signOut`, `requestPasswordReset`, `updatePassword`), con validación en `validation.ts`, `safeNext` y rate limiting (`SIGNUP`, `GUEST`… en `src/lib/rate-limit.ts`, fail-open sin Redis). `/auth/confirm` procesa los enlaces del correo (`token_hash` o `code`) con `?volver=`.
- `useAuthAction().submit` y los formularios controlados de `src/components/auth/` (trampa 56: React 19 vacía el formulario tras la acción).
- Confirmación: `src/app/(checkout)/pedido/[id]/page.tsx` (`Confirmation`, con `getOrderView`, `orderScreen`, `PaymentSettled`). Transferencia pendiente: `pedido/[id]/transferencia/page.tsx`.
- 7.1: `/cuenta/pedidos` y `/cuenta/pedidos/[orderNumber]` exigen sesión **no anónima**: un invitado va a Ingresar (D-026). Las consultas filtran por `user_id`, así que si la cuenta conserva el `user_id` del invitado, sus pedidos aparecen solos. El proxy (`src/lib/supabase/proxy.ts`) da el redirect y el 404 reales del Detalle.
- Textos de la cuenta y del pedido en `src/lib/orders/customer-view.ts`; fechas con `formatLongDate` y `formatFullDate`.

## Alcance de la 7.2 (según el plan)
- **`ConfirmacionCrearCuenta`** (artboard del mismo nombre): en la Confirmación de un pedido pagado **con sesión anónima**, el aviso en fondo `promo` con el correo del pedido fijo (`contact_email`), contraseña (mínimo 8), *Recibir novedades* y *Crear cuenta* (secondary) → `Notice success` *Listo, creamos tu cuenta*. Con cuenta normal el aviso no aparece.
- **Conversión sin perder los pedidos:** Server Action que verifica la sesión (anónima, dueña del pedido), con rate limiting, y convierte al usuario con `updateUser` sobre la **misma** sesión, conservando el `user_id` y por lo tanto sus pedidos, su dirección y su carro. Antes de escribirla, revisa en la documentación de Supabase (MCP `search_docs`) cómo se convierte un usuario anónimo en permanente con correo y contraseña, y en qué orden.
- ⚠️ **Confirmación de correo:** comprueba cómo está (`GET <SUPABASE_URL>/auth/v1/settings` con la llave publishable, `mailer_autoconfirm`; trampa 59). Si Supabase exige confirmar el correo antes de que la cuenta deje de ser anónima, el aviso no puede decir *Listo, creamos tu cuenta*: propón el texto (algo como *Te enviamos un correo a … para confirmar tu cuenta*) y anótalo como propuesta. El enlace del correo pasa por `/auth/confirm` y debería llevar a `/cuenta/pedidos`.
- **Correo que ya tiene cuenta:** no se fusionan los pedidos (riesgo de privacidad). Se le pide ingresar, con un texto propuesto por ti.
- **`profiles.full_name`:** el invitado no tiene nombre (el menú de la 7.1 dice *Hola* a secas). Decide de dónde sale (por ejemplo, el destinatario de la dirección del pedido) y anótalo en `decisiones.md`.
- ***Recibir novedades*** es la decisión 7b del dueño (⏳, B21): no la asumas. Pregúntame o deja la casilla sin guardar nada, igual que en Crear cuenta, y anótalo.
- ***Ver estado del pedido*** (B38) en la Confirmación y en Transferencia pendiente: con cuenta, lleva a `/cuenta/pedidos/<n>`; para el invitado, decide qué se muestra (por ejemplo, solo después de crear la cuenta) y anótalo.
- Para leer el canvas: https://claude.ai/artifact/E7sfHjPteptX18QCaikCri con la herramienta `Artifact` (`action: "read"`, `path: "project/ConfirmacionCrearCuenta.dc.html"`; compáralo con `project/Confirmacion.dc.html` y `project/TransferenciaPendiente.dc.html`), no con WebFetch. Usa los componentes de `src/components/ui/` (D-006), no el bundle del canvas. Los datos de los artboards son de ejemplo.

## Contexto que no está en el código
- **La base de Supabase es la misma para desarrollo y `audazia.dev`.** Migraciones con `apply_migration`, idempotentes; no borres datos de prueba. Si te hace falta una columna (por ejemplo, para las novedades), es la decisión 7b: pregúntame antes.
- Pedidos de prueba 1001–1036; **el próximo es el 1037** (anota en el avance los que crees). Los pedidos de invitado existentes (1021, 1022, 1036) son de sesiones anónimas que ya no tienes: para probar, haz un pedido nuevo como invitado. Con Flow sandbox se puede pagar desde el simulador (*Quiero pagar la orden*, trampa 71); con Webpay, las tarjetas las escribo yo. Después de probar, anula con `cancel_order` lo que quede pendiente (trampa 74).
- Usa correos de prueba que no sean `@example.com` (Flow los rechaza, trampa 34) y que no sean de personas reales. Si la confirmación de correo está activa, el correo llega de verdad: para probar sin un buzón, crea o confirma con la API de administración (trampa 60) y dime qué usaste.
- Las cuentas de prueba que crees quedan en `auth.users`: anótalas en el avance para borrarlas antes de producción, junto con los anónimos de las pruebas.
- `prueba.fase5@almacen.cl` (contraseña en `_archivo/pendientes-del-dueno-fase-5.md`) sirve para el caso *el correo ya tiene cuenta*.
- **Todavía no hay ningún admin**: no marques ninguna cuenta como `admin` sin mi respuesta (decisión 4).
- Producción sin Redis (rate limiting fail-open); cron diario `0 9 * * *` (Hobby).
- MCP de Supabase, Vercel, Flow, Transbank, GitHub y Chrome. Cada push a `main` despliega: commit o push solo cuando yo lo pida.

## Pendiente antes de empezar
1. Revisa con el MCP de Vercel la primera ejecución del cron `/api/cron/expirar-pedidos` (26-10 a las 09:00 UTC = 06:00 de Chile): debe dar 200, no 401, y el log `[cron] expirar-pedidos` con `{ checked, cancelled, recovered, skipped }`. Ciérrala en `_archivo/pendientes-del-despliegue.md` (tarea 7) y en T1 de `_archivo/pendientes-del-dueno-fase-7.md`. Si dio 401 o no corrió después de su hora, avísame antes de seguir. Si todavía no es la hora, dímelo y pregúntame si sigo.
2. Mira si ya respondí los textos propuestos de la 7.1 (T2 de `_archivo/pendientes-del-dueno-fase-7.md`) o alguna decisión del plan; si cambié algo, aplícalo primero.

## Cómo quiero que trabajes
- Pregunta solo lo que de verdad me toca decidir; en lo demás usa el criterio de la documentación y anótalo en `decisiones.md`. Las decisiones del plan siguen pendientes: no las asumas salvo la 1, que ya está en el código.
- Seguridad: la acción verifica la sesión en el servidor (con `getClaims`, trampa 43), que sea anónima y dueña del pedido; nunca confía en el correo que llega del formulario (usa el del pedido) y no revela si un correo tiene cuenta más de lo necesario (trampa 60).
- Tests con Vitest (validación y textos de la conversión, puros y junto al archivo), `npm run lint` y `npm run build` sin errores, y una prueba de punta a punta en local con Edge por CDP a 1280 y 390 px (sin desborde horizontal ni errores de consola; una pestaña nueva por vista, trampa 63): pedido nuevo como invitado → crear la cuenta desde la Confirmación → el mismo `user_id` deja de ser anónimo en Supabase → el pedido aparece en Mis pedidos y su Detalle responde 200. También: el correo que ya tiene cuenta, contraseña corta, recargar la Confirmación después de crear la cuenta, *Ver estado del pedido* y que otro invitado siga sin ver ese pedido (404 o Ingresar).
- Al terminar, actualiza `08-estado/avance.md`, `08-estado/registro-de-cambios.md`, las brechas (B38 y las que correspondan) y decisiones (D-008, D-026 o una nueva), `rutas-y-paginas.md`, `autenticacion-y-autorizacion.md`, el plan (marca la 7.2 y su fila en *Lo que deja…*), `_archivo/pendientes-antes-de-produccion.md` (bloque 2) y `_archivo/pendientes-del-dueno-fase-7.md` con lo que me toque a mí (por ejemplo, los textos propuestos sin diseño).
- Responde en español.
````
