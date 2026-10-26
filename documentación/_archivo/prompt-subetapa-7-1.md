---
title: "Prompt para continuar con la subetapa 7.1"
description: "Prompt para pegar en un chat nuevo y hacer la subetapa 7.1 de la fase 7 (Mis pedidos y Detalle de pedido): qué leer, lo que dejó la 7.0, el alcance con sus artboards, el contexto fuera del código, lo pendiente antes de empezar y cómo trabajar."
generated: "2026-10-25"
estado: "vigente"
related: ["_archivo/plan-fase-7.md", "_archivo/pendientes-del-dueno-fase-7.md", "_archivo/prompt-inicio-fase-7.md", "08-estado/avance.md", "04-diseno/templates.md"]
---

# Prompt para continuar con la subetapa 7.1

Copia el bloque en un chat nuevo. Si algo cambió desde el 25-10-2026 (cron revisado, decisiones del dueño respondidas, pedidos de prueba nuevos), actualízalo antes de pegarlo.

````markdown
# Fase 7 de Shop (tienda Almacén) · subetapa 7.1: Mis pedidos y Detalle de pedido

Trabajas en `C:\Users\lucas\OneDrive\Escritorio\MCPS\shop`: Next.js 16 + React 19 + TypeScript + Zustand + Redis + Supabase, publicado en https://audazia.dev (Vercel Hobby). Las fases 0 a 6 están terminadas y la **7.0 quedó lista el 25-10-2026**. El plan de la fase 7 ya está aprobado para avanzar por subetapas: haz la **7.1** y detente al terminarla.

## Lee primero, en este orden
1. `AGENTS.md`: esta versión de Next tiene cambios incompatibles. Antes de escribir código, lee la guía que corresponda en `node_modules/next/dist/docs/`.
2. `documentación/README.md`: invariantes y la tabla "¿Qué archivo leo?".
3. `documentación/_archivo/plan-fase-7.md`: subetapas, criterios y decisiones del dueño (siguen ⏳).
4. `documentación/08-estado/avance.md` y la entrada del 25-10-2026 de `08-estado/registro-de-cambios.md` (lo que hizo la 7.0).
5. `documentación/07-referencia/trampas-conocidas.md`: antes de tocar código (sobre todo 23, 43, 58, 62 y 63).
6. `documentación/04-diseno/templates.md` (sección Cuenta), `02-arquitectura/rutas-y-paginas.md` (sección cuenta), `05-dominio/ciclo-de-vida-del-pedido.md` (Cómo se muestra), `02-arquitectura/decisiones.md` (D-008, D-012, D-025) y las brechas B23, B24 y B25.

## Lo que dejó la 7.0 (úsalo, no lo dupliques)
- `src/lib/orders/order-status.ts`: `customerStatusBadge` (los 6 estados con tono e ícono del diseño), `trackingProgress` + `TRACKING_STEPS` (4 pasos), `estimatedDelivery` (B25: desde `paid_at` o `placed_at`, la misma fecha que la Confirmación), `CANCEL_REASONS`.
- M8 en Supabase: `orders.cancel_reason` (`vencio` · `tienda` · `cliente`) y `cancel_note` para la línea de *Anulado*; `order_events` es **solo para el admin** (el cliente no lo lee: su línea de tiempo sale de las fechas del pedido).
- `cancel_order(p_order_id, p_reason, p_note)`; el cron anula con `vencio`.
- `getSessionUser()` en `src/lib/auth/session.ts`; `/cuenta` hoy es provisoria y redirige a `/ingresar?volver=/cuenta` sin sesión no anónima.
- Para mostrar pedidos ya existen `getOrderView`, `asAddress`, `addressLine` (`src/lib/payments/order-view.ts`), `paidWithLabel` (`labels.ts`), `shippingMethodLabel` (`checkout/shipping.ts`), `formatCLP`, `formatDeliveryDay`, `formatDeadline`.

## Alcance de la 7.1 (según el plan)
- **Layout de `/cuenta`** con su menú (Mis pedidos, Direcciones, Favoritos, Datos personales, Cerrar sesión; *Hola, <nombre>*). `/cuenta` lleva a `/cuenta/pedidos`. Direcciones, Favoritos y Datos personales llegan en la 7.5: decide si el menú los muestra ya (sin 404) o no, y anótalo.
- **Mis pedidos** (`/cuenta/pedidos`, artboards `MisPedidos` / `MisPedidosMovil`): tarjeta por pedido con N.º, `Badge`, *Comprado el …*, miniaturas, la línea de qué pasó (B24) y resumen (*N productos · Despacho a domicilio*), total y *Ver detalle*. Líneas del diseño: *Transfiere $X hasta el …* (pending con transferencia), *Llega el …* (en preparación / en camino), *Entregado el …*, *Te devolvimos $X el …* (reembolsado), el motivo de *Anulado* (*La transferencia no llegó a tiempo. No hicimos ningún cargo*). Pending con tarjeta o Flow, los motivos `tienda`/`cliente` y el 1030 (*Anulado · pago devuelto*) no tienen texto en el diseño: propón uno y anótalo como propuesta.
- **Detalle de pedido** (`/cuenta/pedidos/[orderNumber]`, `DetallePedido` / `DetallePedidoMovil`): migas, N.º + `Badge`, seguimiento con línea de tiempo de 4 pasos (transportista, código y *Seguir el envío* cuando esté `shipped`; los transportistas son la decisión 2, todavía ⏳: deja el enlace preparado y sin URL inventada), productos con *Volver a comprar*, dirección, pago y totales, *Necesito ayuda con este pedido*. **Descargar boleta queda oculto** hasta definir D-012.
- Estado vacío de Mis pedidos (sin diseño: propón el texto).
- Para leer el canvas: https://claude.ai/artifact/E7sfHjPteptX18QCaikCri con la herramienta `Artifact` (`action: "read"`, `path: "project/MisPedidos.dc.html"`, etc.), no con WebFetch. Usa los componentes de `src/components/ui/` (D-006), no el bundle del canvas. Los datos de los artboards son de ejemplo.

## Contexto que no está en el código
- **La base de Supabase es la misma para desarrollo y `audazia.dev`.** Migraciones con `apply_migration`, idempotentes; no borres datos de prueba.
- Pedidos de prueba 1001–1036; **el próximo es el 1037** (anota en el avance los que crees). `prueba.fase5@almacen.cl` tiene pagados el 1020, 1027, 1028 y 1029 (RM, despacho a domicilio) y varios anulados; su contraseña está en `_archivo/pendientes-del-dueno-fase-5.md`. Para ver *En camino*, *Entregado* o *Reembolsado* sin datos reales, cambia el estado dentro de una transacción que se revierta o pídeme permiso antes de modificar un pedido de prueba.
- **Todavía no hay ningún admin**: no marques ninguna cuenta como `admin` sin mi respuesta (decisión 4).
- Pagos en integración (Webpay) y sandbox (Flow); las tarjetas las escribo yo.
- Producción sin Redis; cron diario `0 9 * * *` (Hobby).
- MCP de Supabase, Vercel, Flow, Transbank, GitHub y Chrome. Cada push a `main` despliega: commit o push solo cuando yo lo pida.

## Pendiente antes de empezar
1. Revisa con el MCP de Vercel la primera ejecución del cron `/api/cron/expirar-pedidos` (26-10 a las 09:00 UTC = 06:00 de Chile): debe dar 200, no 401. Ciérrala en `_archivo/pendientes-del-despliegue.md` (tarea 7) y en la tarea T1 de `_archivo/pendientes-del-dueno-fase-7.md`. Si dio 401 o no corrió, avísame antes de seguir.

## Cómo quiero que trabajes
- Pregunta solo lo que de verdad me toca decidir; en lo demás usa el criterio de la documentación y anótalo en `decisiones.md`. Las decisiones del plan siguen pendientes: no las asumas salvo la 1, que ya está en el código.
- Tests con Vitest (la lógica de las líneas de estado y del seguimiento, pura y junto al archivo), `npm run lint` y `npm run build` sin errores, y una prueba de punta a punta en local con Edge por CDP a 1280 y 390 px (sin desborde horizontal ni errores de consola), con cuenta y verificando que un invitado o alguien sin sesión no ve pedidos ajenos (`/cuenta/pedidos/<número ajeno>` → 404).
- Al terminar, actualiza `08-estado/avance.md`, `08-estado/registro-de-cambios.md`, las brechas (B24) y decisiones que correspondan, `rutas-y-paginas.md`, el plan (marca la 7.1) y `_archivo/pendientes-del-dueno-fase-7.md` con lo que me toque a mí (por ejemplo, los textos propuestos sin diseño).
- Responde en español.
````
