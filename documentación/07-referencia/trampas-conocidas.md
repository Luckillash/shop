---
title: "Trampas conocidas del proyecto"
description: "Errores fáciles de cometer en este proyecto: Next.js 16 con Cache Components, Supabase (RLS, place_order, numeric), Zustand, pagos (Webpay, Flow), fechas y la documentación misma."
keywords: ["trampas", "gotchas", "errores comunes", "bugs", "next 16", "cache", "RLS vacío", "place_order", "numeric", "hydration", "token_ws", "TBK_TOKEN", "urlConfirmation", "buy_order", "localhost"]
related: ["01-fundamentos/stack-y-versiones.md", "07-referencia/brechas-diseno-vs-datos.md", "../flow/documentación/07-referencia/trampas-conocidas.md", "../transbank/documentación/07-referencia/trampas-conocidas.md"]
source: ["análisis del código, del SQL y de la documentación (2026-10-23)"]
estado: "vigente"
---

# Trampas conocidas

> **Úsalo cuando:** algo no funciona como esperabas. Revísalo también **antes** de escribir código.

## Next.js 16

1. **`middleware.ts` ya no existe:** es `src/proxy.ts`, con `export function proxy`.
2. **Nada se cachea por defecto** (`cacheComponents: true`). `export const revalidate` y `dynamic` no aplican: usa `'use cache'` + `cacheLife` + `cacheTag`.
3. **`cookies()` dentro de `'use cache'` lanza un error.** Por eso el catálogo usa el cliente de Supabase **sin cookies**. Si usas `createSupabaseServer()` dentro de una función cacheada, falla.
4. **El aviso *blocking-route*** significa que hay datos sin caché o APIs de request fuera de `<Suspense>`.
5. **`revalidateTag` necesita dos argumentos:** `revalidateTag('products', 'max')`.
6. **`updateTag` solo funciona en Server Actions.** En un Route Handler (por ejemplo, el retorno de Webpay) usa `revalidateTag`.
7. **`params` y `searchParams` son promesas:** `const { slug } = await params`.
8. **`redirect()` es un GET.** Webpay necesita un POST con `token_ws`: hay que enviar un formulario desde el cliente.
9. **Un Server Component no puede escribir cookies.** Crear una sesión anónima o hacer login requiere una Server Action o un Route Handler.
10. **`AGENTS.md` lo regenera `next dev`.** No lo borres ni lo edites esperando que el cambio dure.

## Supabase

11. **RLS sin una política = 0 filas, sin error.** Si una consulta "no trae nada", revisa la [matriz de RLS](../03-base-de-datos/seguridad-rls.md) antes que el código.
12. **`place_order` falla con el cliente admin:** depende de `auth.uid()`. Llámala con el cliente del usuario.
13. **`place_order` lee el carro de la BD, no el de Zustand.** Si no sincronizas antes → *El carrito está vacío*.
14. **`numeric` llega como número (o string, según el cliente).** Normaliza con `Math.round(Number(x))` antes de mostrarlo o enviarlo a una pasarela.
15. **El descuento porcentual podía tener decimales** (`round(…, 2)`). Webpay rechaza montos con decimales en CLP. ✅ Desde M2 (2026-10-24), `place_order` redondea el descuento a pesos; los pedidos anteriores a M2 podrían tener decimales.
16. **`addresses.city` es la comuna.**
17. **Los mensajes de `place_order` dicen "carrito".** El diseño dice "carro". No los muestres: desde M2 traen un `hint` estable y la app los traduce con `orderFailure()` (`src/lib/checkout/order-errors.ts`).
18. **`cancel_order` no reembolsa.** Si el pedido estaba pagado, hay que hacer el refund en la pasarela.
19. **`sync_order_on_payment` solo actúa sobre pedidos `pending`.** Un pago tardío sobre un pedido `cancelled` no lo reactiva, y el stock ya se devolvió.
20. **Cambiar la firma de `place_order` crea una sobrecarga nueva** (no la reemplaza). Haz `drop function` de la firma vieja.
21. **`pg_trgm` está en el esquema `extensions`:** califica `similarity` o agrega `extensions` al `search_path`.
22. **`images.domains` está deprecado** en Next 16: usa `images.remotePatterns` para las URL de Storage.

## Carro (Zustand)

23. **Hydration mismatch:** `persist` lee `localStorage` solo en el cliente. No renderices el contador en el servidor.
24. **Cambiar la forma del estado sin `version`/`migrate`** deja ítems viejos en `localStorage`, que rompen la UI.
25. **El precio del carro no es el del pedido.** El total real sale de `orders.total`.

## Pagos

26. **HTTP 200 de Webpay no es "aprobado".** Es aprobado solo si `response_code === 0 && status === "AUTHORIZED"`.
27. **Con `TBK_TOKEN` no se hace commit**, aunque también venga `token_ws`.
28. **El retorno de Webpay llega por GET o por POST.** Exporta los dos en el Route Handler.
29. **El `commit` no se puede repetir.** Una recarga del retorno falla la segunda vez: comprueba el estado en `payments` y usa un lock.
30. **`buy_order` máximo 26 caracteres y único.** Usa `<order_number>-<n>`, no el uuid (36 caracteres).
31. **Flow no expira sin `timeout`.** Envíalo siempre.
32. **`urlConfirmation` de Flow no llega a localhost.** Usa un túnel. Responde 200 en menos de 15 s.
33. **El callback de Flow trae solo `token`.** El estado se obtiene con `getStatus`.
34. **Flow rechaza los correos `@example.com`** (código 1620).
35. **`urlCallBack` con B mayúscula** en `refund/create` de Flow. Como la firma ordena por nombre, un error de mayúscula la rompe.
36. **Verifica `amount` y la orden de la respuesta** contra lo esperado antes de marcar `paid`.

## Fechas y formato

37. **Zona horaria:** calcula y muestra en `America/Santiago` (Chile cambia de horario dos veces al año). El servidor puede estar en UTC.
38. **`Intl` devuelve "jueves, 24 de octubre"** con coma. El diseño escribe sin coma.

## Documentación y proyecto

39. **La carpeta se llama `documentación/`** (minúscula, con tilde). El avance antiguo decía `Documentación/`.
40. **El canvas "Flujo de compra" es una versión anterior** (archivo desde el 25-10-2026: solo Inicio, Header y Footer, distintos de los vigentes). La fuente única es el canvas de **Templates**.
41. **Los canvas de diseño tienen una versión vieja del design system instalada** (`1792708668-3de7`; la actual es `1792718261-9f4b`). Solo cambió el manual (patrones de pago), pero ten en cuenta la diferencia si comparas.
42. **El proyecto no es un repositorio git.** No hay historial: anota los cambios en [08-estado/registro-de-cambios.md](../08-estado/registro-de-cambios.md).

## Supabase (agregadas en la fase 1)

43. **Verifica la sesión con `getClaims()`, no con `getSession()`.** `getSession()` lee las cookies sin validarlas, y cualquiera puede falsificarlas. `getUser()` también valida, pero hace una llamada de red al servidor de Auth.
44. **En `src/lib/supabase/proxy.ts` no agregues código entre `createServerClient` y `getClaims()`.** Supabase advierte que puede cerrar sesiones al azar.
45. **Llaves nuevas vs legacy:** el proyecto usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) y `SUPABASE_SECRET_KEY` (`sb_secret_…`). Muchos ejemplos en internet siguen usando `ANON_KEY` y `SERVICE_ROLE_KEY`: no agregues esas variables.
46. **`apply_migration` del MCP puede volver `cancelled` o *Invalid or expired requestState*.** En la fase 5 falló dos veces seguidas; se aplicó el mismo SQL con `execute_sql` dentro de `begin … commit` (no queda en `list_migrations`). Un rato después volvió a funcionar y se registró la migración con el SQL idempotente (`orders_checkout_fields_place_order_v2`). Si pasa: aplica con `execute_sql` para no bloquearte y regístrala con `apply_migration` cuando vuelva. No es un error de SQL: la herramienta no recibió permiso en Claude Code. No la reintentes en bucle; pide al usuario que revise los permisos o que aplique el SQL desde el Dashboard.
47. **La caché de `'use cache'` sobrevive entre builds.** Next guarda las entradas en `.next`: si cambias datos directamente en Supabase (un seed, una edición en el Dashboard), `npm run build` puede volver a servir los datos viejos. En desarrollo, borra `.next`. En producción, invalida el tag (`revalidateTag('categories', 'max')`) desde una acción o un Route Handler protegido.

## Catálogo (agregadas en la fase 3)

48. **`notFound()` dentro de `<Suspense>` responde 200**, no 404. La Ficha y el Listado leen `params` dentro de `<Suspense>` (para tener App Shell), así que un slug inexistente muestra la plantilla 404 con `noindex`, pero con estado 200. Las URL sin ruta sí responden 404. Si hace falta un 404 real, valida el slug en el proxy o lee `params` fuera de `<Suspense>` (pierdes el App Shell).
49. **Edge headless no baja de 504 px de ancho.** `--window-size=390,…` recorta la captura, pero la página se renderiza a 504 px y parece que se desborda. Para revisar el móvil, captura una página local con un `<iframe>` de 390 px que cargue la URL.
50. **Las páginas no pueden exportar funciones auxiliares.** Next valida los exports de `page.tsx` en el build: pon los helpers en `src/lib/` (por ejemplo, `normalizeQuery` en `listing.ts`).
51. **`placehold.co` responde SVG.** `next/image` no lo optimiza sin `dangerouslyAllowSVG`; por eso el catálogo usa `<img>` hasta tener fotos reales (D-015).

## Carro (agregadas en la fase 4)

52. **Un `<iframe>` dentro de una página `data:` (o de otro *site*) no puede usar `localStorage`**, o lo tiene particionado: el carro sale vacío o da *SecurityError*. Para las capturas a 390 px (trampa 49), sirve la página anfitriona desde `localhost` en otro puerto: es el mismo *site* que la app. Como el iframe queda en el mismo proceso, para evaluar dentro de él con CDP usa `Page.createIsolatedWorld` con su `frameId`.
53. **Con Redis apagado, node-redis reintenta la conexión inicial para siempre** y la promesa de `connect()` no se rechaza. ✅ Corregido el 2026-10-24 en `src/lib/redis.ts`: `reconnectStrategy` falla de inmediato si nunca conectó (y reintenta con espera si se cae después), `connectTimeout` de 2 s y `disableOfflineQueue` (los comandos fallan en vez de quedar en cola). Sin Redis, `/api/health` responde 503 en milisegundos. El error que rechaza es un `ReconnectStrategyError` con el mensaje vacío: el motivo está en `socketError` (un `AggregateError` con los intentos por IPv6 e IPv4).
54. **`validate_coupon` no se puede llamar con el cliente del usuario ni con el anónimo** (solo `service_role`, D-019): devuelve *permission denied*. Llámala desde una Server Action con `createSupabaseAdmin()`, después del rate limiting.
55. **El drawer es un `<dialog>` modal.** No lo abras con el atributo `open`: usa `useCartUi.show()`, que llama a `showModal()`. Sin eso no hay foco atrapado, ni Esc, ni `::backdrop`.

## Cuenta y checkout (agregadas en la fase 5)

56. **React 19 vacía el formulario después de una acción pasada a `<form action>`**, también cuando la acción devuelve errores: el usuario pierde lo que escribió. Los formularios del checkout y de Ingresar son controlados (o leen el `FormData` en `onSubmit`) y llaman a la acción de `useActionState` dentro de `startTransition` (`useAuthAction().submit`).
57. **Un Server Component no puede leer valores exportados por un archivo `"use client"`**: recibe una referencia de cliente, no el objeto. Los tipos y constantes compartidos van en `src/lib/` (por ejemplo, `EMPTY_SHIPPING` en `src/lib/checkout/defaults.ts`).
58. **`getClaims()` usa `Date.now()`, y el prerender en tiempo de ejecución de `partialPrefetching` lo rechaza** (*Next.js encountered the unstable value `Date.now()` while prerendering*): `/cuenta` se quedaba en blanco y `/checkout` y `/pedido/[id]` lo registraban. ✅ Corregido: `createSupabaseServer()` llama a `await connection()` antes de leer las cookies. Las consultas con sesión no se registran con `console.error` en el render: se lanzan (`throw error`) para que React maneje el aborto del prerender.
59. **`signInAnonymously()` falla con *Anonymous sign-ins are disabled* (`anonymous_provider_disabled`)** si no se activó en Supabase → Authentication. La app muestra un aviso y deja ingresar. Para saber cómo está: `GET <SUPABASE_URL>/auth/v1/settings` con la llave publishable (`external.anonymous_users` y `mailer_autoconfirm`).
60. **Con la confirmación de correo activada, `signUp` no devuelve sesión**, y si el correo ya existe responde igual (no revela qué correos tienen cuenta). El enlace del correo llega a `/auth/confirm`, que tiene que estar en *Redirect URLs* de Supabase. Para probar con una cuenta sin correo real, crea el usuario con la API de administración (`POST /auth/v1/admin/users` con `email_confirm: true`).
61. **`place_order` no compara el carro con lo que vio el cliente.** Por eso `placeOrder` llama a `syncUserCart` y, si el stock recortó alguna línea, devuelve el carro corregido sin crear el pedido (*Cambió el stock…*). Así no se cobra un total distinto del que mostraba el botón *Pagar $TOTAL*.
62. **`new Date()` (o `Date.now()`) en el render de un componente de cliente rompe el retomar de la página prerenderizada**, aunque esté dentro de `useState(() => new Date())`. Al prerenderizar, Next corta ahí el shell estático; en la petición el árbol ya no coincide y el servidor registra *Couldn't find all resumable slots by key/index during replaying* (React cae a renderizar en el cliente y el contenido que llega por streaming puede quedarse en el respaldo). Pasó con la fecha de entrega de la Ficha (B35). Solución: leer la hora solo en el navegador, por ejemplo dentro del `getSnapshot` de `useSyncExternalStore` con `getServerSnapshot` que devuelve `null` (`src/components/catalog/delivery-estimate.tsx`). Para detectarlo: `grep resumable` en el log de `next start` después de pedir la página con curl. El checkout no lo sufre porque sus pasos se renderizan después de hidratar.
63. **En las pruebas con Edge por CDP, una pestaña puede quedar sin revelar los `<Suspense>`** después de una secuencia larga (selector → checkout → Ficha): Next arranca, pero los reemplazos `B:` quedan pendientes, incluso al recargar. No es la app: en una pestaña nueva del mismo perfil (mismas cookies y `localStorage`) la página funciona, y tampoco se reproduce en perfiles nuevos. Si pasa, verifica en una pestaña nueva (`Target.createTarget`) o separa los escenarios en perfiles distintos antes de buscar un bug. En la 7.1 pasó también en una secuencia corta (Ingresar → Detalle de pedido con `Page.navigate` en la misma pestaña): los `<Suspense>` del layout de la cuenta quedaron sin revelar aunque el HTML traía sus segmentos (`$RC("B:0","S:0")`); en una pestaña nueva se veían bien. Las pruebas de la 7.1 abren una pestaña por vista (`/json/new`).


## Pagos (agregadas en la fase 6)

64. **`redirect()` en un Route Handler responde 307**, que repite el método: el POST del retorno de Webpay o Flow se volvería a enviar a la página del pedido. Los retornos responden `NextResponse.redirect(url, 303)`.
65. **El POST del retorno viene de otro sitio**, así que las cookies `SameSite=Lax` no llegan: el Route Handler no tiene la sesión del usuario. Busca el intento por el token con el cliente admin y redirige con 303. El GET siguiente (navegación de primer nivel) sí lleva las cookies, y la página lee el pedido con RLS.
66. **El formulario de Webpay de integración ignora `el.value = …` y `el.click()`** en las pruebas automatizadas (SPA): escribe con `Input.insertText` de CDP, pasa al campo siguiente con Tab y haz clic con `Input.dispatchMouseEvent`. Escribe la fecha de vencimiento de a un carácter. En la autenticación simulada, el RUT va con puntos y guion (`11.111.111-1`): sin formato responde *rut incorrecto*.
67. **Una transacción de Webpay autenticada pero sin commit queda `INITIALIZED`** (con `vci`, sin `response_code`) y no se cobra. Un commit antes de que el usuario termine responde 422 *Invalid status '0'* (o *'19'* si ya se autenticó en el banco) *… Commerce will be notified by webpay to authorize*. Si el usuario terminó de pagar pero no volvió, el commit posterior sí funciona: así el cron recupera el pago (pedido 1029).
68. **`status` de Webpay sobre una transacción `INITIALIZED` no trae `response_code`**: `isApproved` debe tolerar que falte.
69. **El retorno de Webpay en integración llega por GET** (`?token_ws=…`) en el flujo normal y **por POST** cuando se anula con *Anular compra y volver* (`TBK_TOKEN`, `TBK_ORDEN_COMPRA`, `TBK_ID_SESION`).
70. **Flow muestra el parámetro `optional` al pagador** en su checkout (*orderId: …*). No mandes datos internos ahí: el intento se encuentra por el token.
71. **El sandbox de Flow tiene un simulador** después de elegir el medio: *Quiero pagar la orden* (`status` 2) o *Quiero rechazar el pago* (`status` 3). Vuelve a `urlReturn` por POST con el token.
72. **`urlConfirmation` no llega a localhost** (trampa 32): en local se simula con `curl -X POST -d "token=<token>" http://localhost:<puerto>/api/pagos/flow/confirmacion`. Responde 200 en ~1 s, también con un token desconocido (para que Flow no reintente) y 503 si `getStatus` falla (para que reintente).
73. **`NEXT_PUBLIC_SITE_URL` queda fija en el build** y debe coincidir con el puerto de `next start`: es la `return_url` de Webpay y la `urlReturn` de Flow. Si pruebas en otro puerto, vuelve a compilar.
74. **Los pedidos de prueba abandonados retienen stock** hasta que el cron los anula (30 min con tarjeta o Flow, 48 h con transferencia). Después de probar, corre el cron o anula los pedidos con `cancel_order`.

## Cuenta (agregadas en la fase 7.1)

75. **En una ruta de prerender parcial (◐), `notFound()` y `redirect()` no cambian el código HTTP**, aunque se llamen antes de cualquier `<Suspense>` y con `export const instant = false`: el shell estático sale con 200 antes de que la página lea `params` o la sesión. `notFound()` muestra la plantilla 404 con `noindex` y `redirect()` se vuelve una redirección del lado del cliente. Para un 404 o un redirect reales, compruébalo en el proxy (lo dice la guía `streaming.md#status-codes`). El Detalle de pedido lo hace en `src/lib/supabase/proxy.ts`, solo en la carga directa (sin la cabecera `rsc`) para no consultar la BD en cada prefetch (D-026).
76. **`usePathname()` en un componente de cliente de una ruta dinámica sin `generateStaticParams`** rompe el build (*encountered URL data `usePathname()` in a Client Component outside of `<Suspense>`*), también si está en un layout compartido con rutas estáticas. El menú de la cuenta pone los enlaces que lo usan en su propio `<Suspense>` con un respaldo sin la sección marcada (`src/components/account/account-menu-links.tsx`). `instant = false` en la página tapaba el error, pero no es la solución.
