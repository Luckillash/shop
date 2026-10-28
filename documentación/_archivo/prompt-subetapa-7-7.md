---
title: "Prompt para continuar con la subetapa 7.7"
description: "Prompt para pegar en un chat nuevo y hacer la subetapa 7.7 de la fase 7 (Los más vendidos en el Inicio, B34: función security definer con los ids, caché con el tag products, respaldo a Destacados)."
generated: "2026-10-28"
estado: "vigente"
related: ["_archivo/plan-fase-7.md", "_archivo/pendientes-del-dueno-fase-7.md", "_archivo/prompt-subetapa-7-6.md", "08-estado/avance.md", "04-diseno/templates.md", "02-arquitectura/decisiones.md", "02-arquitectura/renderizado-y-cache.md", "07-referencia/brechas-diseno-vs-datos.md"]
---

# Prompt para continuar con la subetapa 7.7

Copia el bloque en un chat nuevo. Escrito el 28-10-2026, al terminar la 7.6 y verificar el redeploy. Si algo cambió (T9 a T14, pedidos de prueba nuevos, la decisión de abajo), actualízalo antes de pegarlo.

```text
# Fase 7 de Shop (tienda Almacén) · subetapa 7.7: Los más vendidos (B34)

Trabajas en `C:\Users\lucas\OneDrive\Escritorio\MCPS\shop`: Next.js 16 + React 19 + TypeScript + Zustand + Redis + Supabase, publicado en https://audazia.dev (Vercel Hobby). Las fases 0 a 6 están terminadas; de la fase 7 quedaron listas la **7.0** y la **7.1** el 25-10-2026, la **7.2** y la **7.3** el 26-10-2026, la **7.4** y la **7.5** el 27-10-2026 y la **7.6** (reseñas, D-031, M11) el 28-10-2026. La 7.4 a la 7.6 están desplegadas desde el 28-10-2026 (commit `33c67a1`, verificado). El plan está aprobado para avanzar por subetapas: haz la **7.7** y detente al terminarla.

## Lee primero, en este orden
1. `AGENTS.md`: esta versión de Next tiene cambios incompatibles. Antes de escribir código, lee la guía que corresponda en `node_modules/next/dist/docs/` (`use cache`, `cacheLife`, `cacheTag`, `revalidateTag`/`updateTag`, prerenderizado del Inicio).
2. `documentación/README.md`: invariantes y la tabla "¿Qué archivo leo?".
3. `documentación/_archivo/plan-fase-7.md`: la fila de la 7.7 y la sección *Lo que deja la 7.6…*.
4. `documentación/08-estado/avance.md` y la entrada del 28-10-2026 en `08-estado/registro-de-cambios.md`.
5. `documentación/07-referencia/trampas-conocidas.md` antes de tocar código, sobre todo 4, 62, 63, 81, 85, 89, 90, 91 y 92.
6. `07-referencia/brechas-diseno-vs-datos.md` (B34), `02-arquitectura/decisiones.md` (D-031, y la aprobación de *Destacados* del 24-10-2026), `02-arquitectura/renderizado-y-cache.md` (tags y quién invalida), `03-base-de-datos/modelo-de-datos.md` (vista `product_catalog`), `03-base-de-datos/funciones-y-triggers.md` y `seguridad-rls.md` (`anon` no lee `order_items` ni `orders`), `04-diseno/templates.md` (Inicio) y `_archivo/pendientes-del-dueno-fase-7.md`.

## Lo que ya existe (úsalo, no lo dupliques)
- **Inicio** (`src/app/(tienda)/page.tsx`): todo sale de consultas con `'use cache'` y la página es **○** (estática). La última sección es *Destacados* con `getFeaturedProducts(4)` (`is_featured`), que el dueño aprobó el 24-10-2026 mientras no hubiera ventas. El artboard (`Main` / `InicioMovil`) muestra *Los más vendidos* en ese lugar.
- **Consultas del catálogo** (`src/lib/catalog/queries.ts`): cliente anónimo sin cookies (`createSupabasePublic`) para poder cachear; `getProductsByIds(ids)` ya devuelve `CatalogItem[]` en el orden pedido, con el tag `products`. `getFeaturedProducts` también lo usan `/buscar` (sin resultados) y `/carro`.
- **Listado:** `SORT_OPTIONS` en `src/lib/catalog/listing.ts` (*Destacados*, precio, *Novedades*, *Mejor evaluados*). No hay orden por ventas.
- **Invalidación hoy:** las acciones de la administración hacen `revalidateTag('products', 'max')`; `publishReview` también (7.6). El pago de un pedido (`settle_payment`, webhooks, cron) no invalida `products`.

## Alcance de la 7.7 (según el plan y B34)
- **Función SQL (M12), idempotente, con `apply_migration`:** `security definer`, `search_path = ''`, que devuelva **solo ids de producto** (y, si te sirve, las unidades) ordenados por unidades vendidas, porque el RLS no deja que `anon` lea `order_items`. Decide y anota qué cuenta como venta (propuesta: `paid`, `processing`, `shipped` y `delivered`; nunca `pending`, `cancelled` ni `refunded`), si hay ventana de tiempo (por ejemplo, los últimos 90 días), y si se excluyen los productos inactivos o sin stock. `EXECUTE` solo para quien la necesite (`anon`/`authenticated` si la llama el cliente público); revisa los advisors (la función `security definer` ejecutable por `anon` es un aviso conocido: justifícalo o evítalo) y regenera `src/types/database.ts`.
- **Consulta cacheada** (por ejemplo `getBestSellers(4)`): `'use cache'`, el tag `products` y un `cacheLife` razonable; los productos con `getProductsByIds` para reusar el mapeo.
- **Inicio:** con 4 o más productos vendidos, *Los más vendidos* según el artboard; con menos, *Destacados* como hoy. Decide si completas con destacados cuando hay entre 1 y 3 (anótalo como propuesta). El Inicio debe seguir **○**.
- **Invalidación:** decide si el ranking se actualiza solo por su `cacheLife` o si además hay que invalidar `products` (o un tag nuevo) cuando un pedido pasa a pagado. Ojo: `revalidateTag` desde un webhook o el cron no puede ser `updateTag`. Anótalo en `decisiones.md` (D-032).
- **Opcional (propuesta):** orden *Más vendidos* en el Listado, con la misma función. Solo si es barato y no vuelve dinámico el Listado; si no, déjalo anotado.
- Lo que no esté en el artboard es una **propuesta**: anótala para que la revise.

## Pendiente antes de empezar
1. **Decisión del dueño (pregúntame antes de desplegar nada que la active):** al 28-10-2026 hay **5 productos con ventas, todos de pedidos de prueba** (Frasco de vidrio con tapa de madera 5 unidades, Set de paños de cocina 3, Taza de gres esmaltado 2, Florero de greda 1, Difusor de varillas 1; pedidos `paid`, `shipped` y `delivered`). Como la base es la misma para desarrollo y `audazia.dev`, con la regla de 4 productos el Inicio de producción pasaría a *Los más vendidos* calculado con datos de prueba. Opciones a proponerme: (a) aceptarlo; (b) un umbral más alto o una fecha de inicio (contar solo pedidos desde el lanzamiento real); (c) excluir los pedidos de prueba (por ejemplo, de cuentas marcadas); (d) dejar la sección detrás de una variable de entorno. Revisa con SQL los números actuales antes de preguntarme.
2. Revisa en `_archivo/pendientes-del-dueno-fase-7.md` si respondí T9 (quitarle el rol a `prueba.fase5@almacen.cl`), T10, T12 o T14 (textos de la 7.4, 7.5 y 7.6); si es así, aplícalo primero (T9 lo hace el agente con `update profiles set role = 'customer'`, verificado con `returning`).
3. Revisa con el MCP de Vercel que el cron `0 9 * * *` (log `[cron] expirar-pedidos`) haya corrido con 200 el 28-10 y el 29-10 (ventana corta alrededor de las 09:00 UTC). El del 27-10 no apareció (T11) y el sitio estuvo deshabilitado hasta el redeploy del 28-10 (T15). Si alguno falló o no aparece, avísame antes de seguir. Verifica también que `audazia.dev` responda 200.

## Contexto que no está en el código
- **La base de Supabase es la misma para desarrollo y `audazia.dev`.** Migraciones con `apply_migration`, idempotentes; no borres datos de prueba.
- Pedidos de prueba 1001–1048 (**no hay 1037**, trampa 79); **el próximo es el 1049**. No hace falta crear pedidos: para probar con menos de 4 productos vendidos usa una transacción revertida o los parámetros de la función. Si cambias el estado de un pedido para probar, hazlo con permiso y restáuralo idéntico.
- Si ya hay un `next dev` o `next start` abierto, úsalo o detén solo el tuyo (trampa 81). Si `next build` falla con `EPERM` en `.next/static` o `.next/server`, bórralos y reintenta (trampa 85). Si Vitest no resuelve los paquetes, revisa la trampa 90 antes de buscar un bug.
- No edites archivos con `-replace` de PowerShell si el texto trae `$` (trampa 91); usa la herramienta Edit.
- Producción sin Redis (rate limiting fail-open). Cron diario (Hobby). MCP de Supabase, Vercel, GitHub y Chrome. Cada push a `main` despliega: commit o push solo cuando yo lo pida.

## Cómo quiero que trabajes
- Pregunta solo lo que de verdad me toca decidir (sobre todo el punto 1 de arriba); en lo demás usa el criterio de la documentación y anótalo en `decisiones.md`.
- Seguridad: la función expone solo ids (y unidades si hace falta), nunca datos de pedidos ni de clientes; compruébalo por SQL simulando `anon` y `authenticated`.
- El Inicio sigue **○** y los listados **◐**: verifica con `npm run build` que mantienen su marca y que no aparece *blocking-route* ni *resumable slots* (trampas 4 y 62); revisa también el log de `next start`.
- Textos: de tú, sentence case, sin exclamaciones. Lo que no esté en el artboard es una propuesta: anótala para que la revise.
- Tests con Vitest (lógica pura junto al archivo: la regla de respaldo a *Destacados*, el título de la sección y, si aplica, el orden del Listado), `npm run lint`, `npm run test:run` (hoy 303) y `npm run build` sin errores. Prueba en local con Edge por CDP, a 1280 y 390 px, una pestaña nueva por vista (trampas 63, 89 y 92): el Inicio con *Los más vendidos* (y el orden correcto), con menos de 4 (respaldo a *Destacados*, en una transacción revertida o con un parámetro), y que `/buscar` y `/carro` siguen igual.
- Al terminar, actualiza `08-estado/avance.md`, `08-estado/registro-de-cambios.md`, la brecha B34, `decisiones.md` (D-032), `04-diseno/templates.md` (Inicio), `02-arquitectura/renderizado-y-cache.md`, `03-base-de-datos/` (función, migración M12, permisos, `sql/ecommerce_schema.sql` con su copia en un archivo `sql/2026-10-xx_*.sql`), el plan (marca la 7.7 y agrega *Lo que deja la 7.7…*), las trampas nuevas, `_archivo/pendientes-antes-de-produccion.md` y `_archivo/pendientes-del-dueno-fase-7.md` con lo que me toque a mí.
- Responde en español.
```
