---
title: "Prompt para iniciar la fase 7"
description: "Prompt para pegar en un chat nuevo y empezar la fase 7 (postcompra y operación): qué leer primero, el alcance con sus diseños (administración, cuenta, opinión, invitado y correos, agregados el 25-10-2026), las propuestas de diseño por aprobar, el contexto que no está en el código (base de datos compartida con producción, pedidos de prueba, sin admin, sin Redis, cron diario), lo pendiente antes de empezar y cómo trabajar."
generated: "2026-10-25"
estado: "vigente"
related: ["_archivo/pendientes-antes-de-la-fase-7.md", "06-implementacion/hoja-de-ruta.md", "08-estado/avance.md", "_archivo/pendientes-del-despliegue.md", "04-diseno/templates.md"]
---

# Prompt para iniciar la fase 7

Copia el bloque en un chat nuevo. Si algo cambió desde el 25-10-2026 (pedidos de prueba, Redis, plan de Vercel, admin, propuestas de diseño aprobadas), actualízalo antes de pegarlo.

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
7. `documentación/04-diseno/templates.md`: estructura de cada pantalla, incluidas las de la fase 7 (secciones Cuenta, Administración, Correos y Mapa de estados) y lo que sigue sin diseño.
8. Según la tarea: `07-referencia/brechas-diseno-vs-datos.md` (B21, B22, B24, B25, B34, B36, B38), `02-arquitectura/decisiones.md` (D-006, D-008, D-012, D-020, D-022, D-024), `05-dominio/ciclo-de-vida-del-pedido.md`, `03-base-de-datos/seguridad-rls.md` y `_archivo/pendientes-antes-de-produccion.md` (bloque 2).

## Diseño
- La única referencia es el canvas **Almacén · Templates de la tienda**: https://claude.ai/artifact/E7sfHjPteptX18QCaikCri. Léelo con la herramienta `Artifact` (`action: "read"` y el `path` del artboard, por ejemplo `project/AdminPedido.dc.html`), no con WebFetch. El mapa `FlujoPostcompra` resume, por cada `orders.status`, la pantalla del cliente, el correo y el botón de la administración.
- El manual del design system (https://claude.ai/artifact/8ueRvwVuopKWk3enu498tj, `project/README.md`) tiene las secciones *Pedidos: estados*, *Cuenta*, *Administración* y *Correos*.
- El canvas *Almacén — Flujo de compra* es una versión anterior archivada: no lo uses.
- Los artboards usan el bundle React 18 del design system (`Almacen.Button`, etc.). No lo cargues: usa los componentes portados en `src/components/ui/` (D-006) y crea los que falten con el mismo criterio.
- Los datos de los artboards (nombres, pedidos 10482, montos) son de ejemplo; los reales salen de la base.

## Alcance de la fase 7 (según la hoja de ruta)
- **Mis pedidos** y **Detalle de pedido** (`/cuenta/pedidos`) con `MisPedidos` y `DetallePedido`, los 6 estados con su `Badge` y su línea de qué pasó (*Pago pendiente*, *En preparación*, *En camino*, *Entregado*, *Reembolsado*, *Anulado*; B24) y fecha de entrega estimada (B25). Hoy `/cuenta` es provisoria.
- **Convertir al invitado en cuenta** desde la Confirmación (`ConfirmacionCrearCuenta`: solo pide la contraseña; `updateUser`, conservando sus pedidos) y *Ver estado del pedido* (D-008, D-024, B38).
- **Administración mínima** (`AdminHeader`, `AdminPedidos`, `AdminPedido` con sus 5 estados en el tweak `estado`, `AdminAnularPedido`, `AdminAlertas`, `AdminPedidoMovil`): confirmar transferencias con `settle_payment(…, 'paid', …)`, revisar y resolver `payment_alerts`, cambiar el estado del pedido (`paid` → `processing` → `shipped` con transportista y código de seguimiento → `delivered`) y anular con motivo y reembolso. Valida las transiciones en la Server Action (la base no las restringe). Requiere al menos un admin en `profiles`. Sin diseño y fuera de esta fase: la administración del catálogo (productos, stock, cupones) y la lista de pedidos en móvil.
- **Correos de despacho y anulación** con Resend (D-022), según `CorreoDespacho` y `CorreoAnulacion` (motivos `vencio`, `tienda`, `cliente`). Los de confirmación, transferencia y pago devuelto ya existen y salen de `pedidos@mail.audazia.dev`; ajusta el `layout` de `src/lib/email/templates.ts` al diseño de `CorreoConfirmacion` para que todos se vean iguales.
- **Direcciones**, **Favoritos** y **Datos personales** (`Direcciones`, `Favoritos` con estado vacío, `DatosPersonales`, en escritorio y móvil). `/cuenta/favoritos` hoy da 404 y el header ya enlaza ahí.
- **Reseñas** (B36): formulario según `EscribirResena` (modal sobre la Ficha). Revisa las políticas de `reviews` con usuarios anónimos. Las opiniones publicadas en la Ficha siguen con placeholders: muéstralas con los datos reales.
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

## Propuestas de diseño que todavía no apruebo
Inclúyelas en las decisiones del plan:
- En la administración, `paid` se llama *Por preparar* (el cliente ve *En preparación* en `paid` y en `processing`).
- Transportistas: Starken, Chilexpress, Blue Express, Correos de Chile y despacho propio.
- Solo opina quien compró el producto, y la opinión se publica con nombre y comuna. Falta decidir si un invitado puede opinar.

## Cómo quiero que trabajes
- Primero propón un **plan de la fase 7 en subetapas**, con orden, dependencias y las decisiones que necesitas de mí (por ejemplo, las propuestas de diseño de arriba, si un invitado puede opinar y quién es el admin). Espera mi aprobación antes de implementar.
- Pregunta solo lo que de verdad me toca decidir. En lo demás, usa el criterio de la documentación y anota la decisión en `decisiones.md`.
- Por cada subetapa: tests con Vitest, `npm run lint` y `npm run build` sin errores, y una prueba de punta a punta en local.
- Al terminar cada subetapa, actualiza `08-estado/avance.md` y `08-estado/registro-de-cambios.md`, y además las brechas y decisiones que correspondan. Lo que me toque a mí (cuentas, paneles, textos, decisiones) déjalo en un archivo nuevo, `documentación/_archivo/pendientes-del-dueno-fase-7.md`, con el mismo formato que los de las fases 5 y 6.
- Responde en español.
````
