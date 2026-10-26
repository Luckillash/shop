---
title: "Prompt para iniciar la fase 7"
description: "Prompt para pegar en un chat nuevo y empezar la fase 7 (postcompra y operación): qué leer primero, el alcance, el contexto que no está en el código (base de datos compartida con producción, pedidos de prueba, sin admin, sin Redis, cron diario), lo pendiente antes de empezar y cómo trabajar."
generated: "2026-10-25"
estado: "vigente"
related: ["_archivo/pendientes-antes-de-la-fase-7.md", "06-implementacion/hoja-de-ruta.md", "08-estado/avance.md", "_archivo/pendientes-del-despliegue.md"]
---

# Prompt para iniciar la fase 7

Copia el bloque en un chat nuevo. Si algo cambió desde el 25-10-2026 (pedidos de prueba, Redis, plan de Vercel, admin), actualízalo antes de pegarlo.

````markdown
# Fase 7 de Shop (tienda Almacén): postcompra y operación

Trabajas en `C:\Users\lucas\OneDrive\Escritorio\MCPS\shop`: Next.js 16 + React 19 + TypeScript + Zustand + Redis + Supabase. El sitio está publicado en https://audazia.dev (Vercel, plan Hobby). Las fases 0 a 6 están terminadas. Las fases 5 y 6 se cerraron el 25-10-2026 y nada de ellas bloquea esta fase.

## Lee primero, en este orden
1. `AGENTS.md`: esta versión de Next tiene cambios incompatibles. Antes de escribir código, lee la guía que corresponda en `node_modules/next/dist/docs/`.
2. `documentación/README.md`: invariantes y la tabla "¿Qué archivo leo?".
3. `documentación/08-estado/avance.md`: estado actual.
4. `documentación/_archivo/pendientes-antes-de-la-fase-7.md`: lo que quedó de las fases 5 y 6.
5. `documentación/06-implementacion/hoja-de-ruta.md`: alcance de la fase 7.
6. `documentación/07-referencia/trampas-conocidas.md`: antes de tocar código.
7. Según la tarea: `07-referencia/brechas-diseno-vs-datos.md` (B21, B22, B24, B25, B34, B36, B38), `02-arquitectura/decisiones.md` (D-008, D-012, D-020, D-022, D-024), `03-base-de-datos/seguridad-rls.md` y `_archivo/pendientes-antes-de-produccion.md` (bloque 2).

## Alcance de la fase 7 (según la hoja de ruta)
- **Mis pedidos** y **Detalle de pedido** (`/cuenta/pedidos`) con los templates de Cuenta, badges de `cancelled` y `refunded` (B24) y fecha de entrega estimada (B25). Hoy `/cuenta` es provisoria.
- **Convertir al invitado en cuenta** desde la Confirmación (`updateUser`, conservando sus pedidos) y *Ver estado del pedido* (D-008, D-024, B38).
- **Administración mínima (sin diseño, hay que proponerlo):** confirmar transferencias con `settle_payment(…, 'paid', …)`, revisar `payment_alerts` y cambiar el estado del pedido (`processing` → `shipped` con código de seguimiento → `delivered`). Requiere al menos un admin en `profiles`.
- **Correos de despacho y anulación** con Resend (D-022). Los de confirmación, transferencia y pago devuelto ya existen y salen de `pedidos@mail.audazia.dev`.
- **Direcciones**, **Favoritos** y **Datos personales** (sin diseño: reutiliza componentes). `/cuenta/favoritos` hoy da 404 y el header ya enlaza ahí.
- **Reseñas** (B36): formulario. Decidir si un invitado puede reseñar y revisar las políticas de `reviews` con usuarios anónimos.
- ***Los más vendidos*** en el Inicio (B34): ranking de pedidos pagados, con *Destacados* como respaldo si hay menos de 4.
- Opcionales 🟢: redirección optimista de `/cuenta/*` en el proxy, RUT en `profiles` (B22), newsletter (B21) y limpieza de usuarios anónimos sin pedidos.
- **Fuera de alcance mientras no haya proveedor:** boleta o factura electrónica (D-012).

## Contexto que no está en el código
- **La base de Supabase es la misma para desarrollo y para `audazia.dev`.** Toda migración o dato de prueba se ve en el sitio público. Usa `apply_migration` con SQL idempotente y no borres datos de prueba (se borran al subir a producción).
- Los pedidos de prueba van del **1001 al 1036**; el próximo es el 1037. Los pagados de prueba son 1020–1022, 1027–1029 y 1036, y sirven para probar Mis pedidos y la administración. Anota los que crees en el avance.
- Usuario de prueba: `prueba.fase5@almacen.cl`. Todavía no hay ningún admin: pregúntame antes de marcar una cuenta como `admin`.
- Los pagos siguen en integración (Webpay) y sandbox (Flow). Las tarjetas de prueba las ingreso yo; no escribas números de tarjeta en formularios.
- Producción no tiene Redis: el rate limiting deja pasar todo y los locks de pago caen a `claim_payment`. El cron de vencimiento corre una vez al día (`0 9 * * *`) porque la cuenta está en Hobby.
- Hay MCP de Supabase, Vercel, Flow, Transbank, GitHub y Chrome. Cada push a `main` despliega en producción: haz commit o push solo cuando yo lo pida.

## Pendiente antes de empezar (revísalo primero)
1. Revisa con el MCP de Vercel la primera ejecución del cron `/api/cron/expirar-pedidos` (debe dar 200, no 401) y cierra la tarea 7 del despliegue.

## Cómo quiero que trabajes
- Primero propón un **plan de la fase 7 en subetapas**, con orden, dependencias y las decisiones que necesitas de mí (por ejemplo, cómo es la administración sin diseño, si un invitado puede reseñar y quién es el admin). Espera mi aprobación antes de implementar.
- Pregunta solo lo que de verdad me toca decidir. En lo demás, usa el criterio de la documentación y anota la decisión en `decisiones.md`.
- Por cada subetapa: tests con Vitest, `npm run lint` y `npm run build` sin errores, y una prueba de punta a punta en local.
- Al terminar cada subetapa, actualiza `08-estado/avance.md` y `08-estado/registro-de-cambios.md`, y además las brechas y decisiones que correspondan. Lo que me toque a mí (cuentas, paneles, textos, decisiones) déjalo en un archivo nuevo, `documentación/_archivo/pendientes-del-dueno-fase-7.md`, con el mismo formato que los de las fases 5 y 6.
- Responde en español.
````
