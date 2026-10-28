---
title: "Prompt para continuar con la subetapa 7.8"
description: "Prompt para pegar en un chat nuevo y hacer la subetapa 7.8 de la fase 7 (opcionales: redirección optimista del resto de /cuenta/* en el proxy y limpieza de usuarios anónimos sin pedidos en el cron diario), con lo que hay que revisar antes y cómo cerrar la fase 7."
generated: "2026-10-28"
estado: "vigente"
related: ["_archivo/plan-fase-7.md", "_archivo/pendientes-del-dueno-fase-7.md", "_archivo/prompt-subetapa-7-7.md", "08-estado/avance.md", "02-arquitectura/decisiones.md", "02-arquitectura/rutas-y-paginas.md", "02-arquitectura/autenticacion-y-autorizacion.md", "06-implementacion/pago-transferencia.md"]
---

# Prompt para continuar con la subetapa 7.8

Copia el bloque en un chat nuevo. Escrito el 28-10-2026, al terminar la 7.7 (sin commit todavía). Si algo cambió (commit y deploy de la 7.7, T9 a T17, el cron, pedidos de prueba nuevos), actualízalo antes de pegarlo.

```text
# Fase 7 de Shop (tienda Almacén) · subetapa 7.8: opcionales (proxy de /cuenta/* y limpieza de anónimos)

Trabajas en `C:\Users\lucas\OneDrive\Escritorio\MCPS\shop`: Next.js 16 + React 19 + TypeScript + Zustand + Redis + Supabase, publicado en https://audazia.dev (Vercel Hobby). Las fases 0 a 6 están terminadas; de la fase 7 están listas la **7.0** y la **7.1** (25-10-2026), la **7.2** y la **7.3** (26-10-2026), la **7.4** y la **7.5** (27-10-2026), y la **7.6** y la **7.7** (*Los más vendidos*, D-032, M12) el 28-10-2026. La 7.4 a la 7.6 están desplegadas (commit `33c67a1`); la 7.7 quedó sin commit al terminar (revisa `git status` y `git log`). La **7.8** es la última subetapa: hazla, cierra la fase 7 en la documentación y detente.

## Lee primero, en este orden
1. `AGENTS.md`: esta versión de Next tiene cambios incompatibles. Antes de escribir código, lee la guía que corresponda en `node_modules/next/dist/docs/` (proxy, `redirect`/`rewrite` en el proxy, Route Handlers, `cacheComponents` y prerender parcial).
2. `documentación/README.md`: invariantes y la tabla "¿Qué archivo leo?".
3. `documentación/_archivo/plan-fase-7.md`: la fila de la 7.8 y todas las filas `7.8` de las secciones *Lo que deja la 7.x…* (son varias: 7.1, 7.4, 7.5, 7.6 y 7.7).
4. `documentación/08-estado/avance.md` y las entradas del 28-10-2026 en `08-estado/registro-de-cambios.md`.
5. `documentación/07-referencia/trampas-conocidas.md` antes de tocar código, sobre todo 1, 4, 9, 44, 48, 62, 63, 75, 77, 81, 85, 89, 90, 91, 92, 93 y 94.
6. `02-arquitectura/decisiones.md` (D-008 invitados anónimos, D-025, D-026 código HTTP del Detalle, D-029 administración, D-030), `02-arquitectura/rutas-y-paginas.md` (cuenta y administración), `02-arquitectura/autenticacion-y-autorizacion.md`, `06-implementacion/pago-transferencia.md` (el cron), `03-base-de-datos/seguridad-rls.md` (*Usuarios anónimos*), `_archivo/pendientes-antes-de-produccion.md` y `_archivo/pendientes-del-dueno-fase-7.md`.

## Lo que ya existe (úsalo, no lo dupliques)
- **Proxy** (`src/proxy.ts` → `updateSession` en `src/lib/supabase/proxy.ts`): refresca la sesión y ya da el código HTTP real en dos casos, con `withSession`/`withCookies` para no perder las cookies refrescadas:
  - `/admin/*`: sin sesión no anónima → redirect a Ingresar; sin el rol → rewrite a `/admin-no-encontrada` (404). Usa `rpc('is_admin')`.
  - Detalle de pedido (`/cuenta/pedidos/<n>`): sin sesión no anónima → redirect a Ingresar; número ajeno, inválido o inexistente → rewrite a `/cuenta/pedido-no-encontrado` (404).
- **Lo que falta:** el resto de `/cuenta/*` (`/cuenta`, `/cuenta/pedidos`, `/cuenta/direcciones`, `/cuenta/favoritos`, `/cuenta/datos`). Hoy cada página verifica la sesión y redirige dentro del `<Suspense>`, así que en la carga directa sin sesión responden **200** y redirigen en el cliente (trampa 75). El invitado (sesión anónima) también tiene que ir a Ingresar, con `volver`.
- **Cron diario** `0 9 * * *` → `/api/cron/expirar-pedidos` (`src/app/api/cron/expirar-pedidos/route.ts`, `Authorization: Bearer ${CRON_SECRET}` comparado con `timingSafeEqual`) → `expireOrders()` en `src/lib/payments/expire.ts`. Registra `[cron] expirar-pedidos` con el resumen.
- **Borrar un usuario** (FK revisadas el 28-10-2026): `profiles` cae en cascada desde `auth.users`, y desde `profiles` caen en cascada `addresses`, `carts` (y con ellos `cart_items`), `wishlist_items` y `reviews`. **`orders.user_id`, `coupon_redemptions.user_id`, `order_events.actor_id` e `inventory_movements.created_by` quedan en `null`**: por eso solo se borran anónimos **sin pedidos**. Un anónimo no puede opinar (M11) ni guardar favoritos.
- **Datos al 28-10-2026:** 42 usuarios anónimos, 38 sin pedidos, **0 con más de 30 días** (el más antiguo es del 25-10-2026). La limpieza no borraría nada todavía; pruébala con un umbral como parámetro o con datos en una transacción revertida.

## Alcance de la 7.8 (según el plan)
1. **Redirección optimista de `/cuenta/*` en el proxy:** sin sesión o con sesión anónima → redirect a `/ingresar?volver=<ruta y query>`, con el código HTTP real, para `/cuenta` y todas sus subpáginas. Sigue el patrón del Detalle y de `/admin/*` (las cookies refrescadas también van en el redirect; no agregues código entre `createServerClient` y `getClaims()`, trampa 44). Que no cueste una consulta extra por petición: con `getClaims()` basta para saber si hay sesión y si es anónima. Las páginas siguen verificando la sesión (el proxy es optimista, no la única defensa). No toques el Detalle de pedido ni `/admin/*`, salvo para compartir código. Revisa que `volver` no permita redirigir a otro dominio.
2. **Limpieza de usuarios anónimos sin pedidos de más de 30 días**, aprovechando el cron diario:
   - Decide y anota (D-033) cómo se borra: con la API de administración de Supabase (`auth.admin.deleteUser`) o con una función SQL `security definer`, `search_path = ''`, solo para `service_role` (M13, idempotente, con `apply_migration`). Compara las dos (transacciones, límite por ejecución, qué pasa si falla a la mitad) y elige.
   - Condición exacta: `is_anonymous`, sin ninguna fila en `orders` (con cualquier estado) y `created_at` (o la última actividad, `last_sign_in_at`, si te parece más justo: decide y anótalo) de hace más de 30 días. Pon un tope por ejecución (por ejemplo 500) para no pasarte del tiempo de una función en Hobby.
   - Intégrala en el mismo cron o en un segundo Route Handler. Si agregas otro cron en `vercel.json`, revisa en la documentación de Vercel cuántos permite Hobby y con qué frecuencia. Que una falla de la limpieza no impida vencer pedidos, ni al revés. Registra un log con el resumen (por ejemplo `[cron] limpiar-anonimos { checked, deleted }`).
   - Nunca borres un usuario con pedidos, una cuenta con correo ni un admin. Compruébalo por SQL con casos de prueba en una transacción revertida.
3. **Cierre de la fase 7:** marca la fase 7 como terminada en `avance.md`, `hoja-de-ruta.md` y el plan; agrega *Lo que deja la 7.8…* y un resumen de lo que queda para producción (todo lo ⏳ del dueño, de T9 a T17).
- Lo que no esté en el diseño (por ejemplo, un texto nuevo en Ingresar) es una **propuesta**: anótala para que la revise.

## Pendiente antes de empezar
1. **Cron (T11):** con el MCP de Vercel, revisa que `[cron] expirar-pedidos` haya corrido con 200 el 28-10 y el 29-10 (ventana corta alrededor de las 09:00 UTC). El del 27-10 nunca apareció y el sitio estuvo deshabilitado hasta el redeploy del 28-10 (T15). Si alguno falló o no aparece, avísame antes de seguir, porque la 7.8 depende del cron. Verifica también que `audazia.dev` responda 200.
2. **La 7.7 sin commit:** si `git status` muestra los cambios de la 7.7 sin commit, no los mezcles con la 7.8 sin preguntarme. Si te pido el commit, haz uno de la 7.7 primero.
3. Revisa en `_archivo/pendientes-del-dueno-fase-7.md` si respondí T9 (quitarle el rol a `prueba.fase5@almacen.cl`; el 28-10-2026 dije *todavía no*), T10, T12, T14 o T17. Si es así, aplícalo primero (T9 lo hace el agente con `update profiles set role = 'customer'`, verificado con `returning`).
4. **Pregúntame antes de desplegar** algo que borre usuarios en producción: la base es la misma para desarrollo y `audazia.dev`, y el cron de producción la va a ejecutar. Propón el umbral (30 días) y el tope por ejecución, y espera mi visto bueno antes del deploy (puedes dejarla detrás de una variable de entorno, por ejemplo `ANON_CLEANUP_ENABLED`, si te parece más seguro: propónmelo).

## Contexto que no está en el código
- **La base de Supabase es la misma para desarrollo y `audazia.dev`.** Migraciones con `apply_migration`, idempotentes; no borres datos de prueba (en la 7.8, solo lo que la limpieza borre en una transacción revertida o con mi permiso).
- Pedidos de prueba 1001–1048 (**no hay 1037**, trampa 79); **el próximo es el 1049**. Para la 7.8 no hace falta crear pedidos.
- Cuentas de prueba: `prueba.fase5@almacen.cl` (admin), `almacen.registro72@mailinator.com` y `almacen.invitado72@mailinator.com` (clientes). Te di sus contraseñas en otros chats; si las necesitas, cámbialas con la API de administración y dímelas en el chat (no las anotes en archivos).
- `BEST_SELLERS_SINCE` (7.7) no está definida en ningún lado: el Inicio muestra *Destacados*. Déjalo así.
- Si ya hay un `next dev` o `next start` abierto, úsalo o detén solo el tuyo (trampa 81). Si `next build` falla con `EPERM` en `.next/static` o `.next/server`, bórralos y reintenta (trampa 85). Si Vitest no resuelve los paquetes, revisa la trampa 90. En Git Bash, pasa rutas que empiezan con `/` con `MSYS_NO_PATHCONV=1` (trampa 94).
- No edites archivos con `-replace` de PowerShell si el texto trae `$` (trampa 91); usa la herramienta Edit. No hay Python en la máquina.
- Producción sin Redis (rate limiting fail-open). Cron diario (Hobby). MCP de Supabase, Vercel, GitHub y Chrome. Cada push a `main` despliega: commit o push solo cuando yo lo pida.

## Cómo quiero que trabajes
- Pregunta solo lo que de verdad me toca decidir (sobre todo el punto 4 de arriba); en lo demás usa el criterio de la documentación y anótalo en `decisiones.md` (D-033).
- Seguridad: la limpieza solo la puede ejecutar el cron (secreto) o `service_role`; compruébalo por SQL simulando `anon` y `authenticated`, y revisa los advisors después de la migración. El redirect del proxy no debe abrir una redirección a otro dominio con `volver`.
- Renderizado: el Inicio sigue **○**, los listados y la Ficha **◐**, y las páginas de la cuenta mantienen su marca; verifica con `npm run build` que no aparece *blocking-route* ni *resumable slots* (trampas 4 y 62) y revisa el log de `next start`.
- Prueba los códigos HTTP con `curl -I` contra `next start`: sin cookie y con una sesión anónima → 307 a Ingresar con `volver` para cada ruta de `/cuenta/*`; con una cuenta → 200; el Detalle y `/admin/*` como antes (redirect, 404 y 200). Prueba también el cron en local con `curl -H "Authorization: Bearer …"`: sin secreto → 401; con secreto → el resumen de los dos trabajos.
- Textos: de tú, sentence case, sin exclamaciones. Lo que no esté en el artboard es una propuesta: anótala para que la revise.
- Tests con Vitest (lógica pura junto al archivo: qué rutas protege el proxy, cómo se arma y valida `volver`, el filtro de la limpieza si queda en TypeScript), `npm run lint`, `npm run test:run` (hoy 309) y `npm run build` sin errores. Prueba en local con Edge por CDP, a 1280 y 390 px, una pestaña nueva por vista (trampas 63, 89 y 92): la carga directa de cada página de la cuenta sin sesión (va a Ingresar y vuelve después de ingresar) y con sesión.
- Al terminar, actualiza `08-estado/avance.md` (fase 7 terminada), `08-estado/registro-de-cambios.md`, `decisiones.md` (D-033), `02-arquitectura/rutas-y-paginas.md`, `02-arquitectura/autenticacion-y-autorizacion.md`, `06-implementacion/pago-transferencia.md` (el cron), `06-implementacion/hoja-de-ruta.md`, `03-base-de-datos/` si hay migración (M13, permisos, `sql/ecommerce_schema.sql` con su copia en un archivo `sql/2026-10-xx_*.sql`), `07-referencia/variables-de-entorno.md` si agregas una variable, el plan (marca la 7.8 y agrega *Lo que deja la 7.8…* y el cierre de la fase), las trampas nuevas, `_archivo/pendientes-antes-de-produccion.md` y `_archivo/pendientes-del-dueno-fase-7.md` con lo que me toque a mí.
- Responde en español.
```
