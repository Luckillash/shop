---
title: "Avance del proyecto"
description: "Estado actual por fase de la hoja de ruta: qué está hecho y verificado, qué está en curso y qué falta. Es el primer archivo que hay que actualizar al terminar una tarea."
keywords: ["avance", "estado", "progreso", "hecho", "pendiente", "tareas", "fases", "verificación"]
related: ["06-implementacion/hoja-de-ruta.md", "08-estado/registro-de-cambios.md", "07-referencia/brechas-diseno-vs-datos.md"]
source: ["_archivo/avance-del-proyecto.md", "revisión del repositorio (2026-10-23)"]
estado: "vigente"
---

# Avance del proyecto

> **Úsalo cuando:** necesitas saber en qué punto está el proyecto, o terminaste una tarea (actualiza este archivo y el [registro de cambios](registro-de-cambios.md)).

_Última actualización: 25 de octubre de 2026 (7.1)._

## Resumen

**Las fases 0 a 6 están terminadas** (la fase 6 el 25-10-2026). Se puede pagar con Webpay Plus (integración), Flow (sandbox) y transferencia, reintentar o cambiar de medio sobre el mismo pedido, y el cron anula los pedidos vencidos (recupera los pagados y reembolsa los pagos tardíos, B13). Probado con cuenta y como invitado. Faltan para producción: la llave de Resend de producción y las credenciales reales de los pagos (la `urlConfirmation` de Flow quedó probada en `audazia.dev` el 25-10-2026). Sigue la fase 7 (postcompra y operación).

Fase 5: cuenta (Ingresar, Crear cuenta, invitado con sesión anónima), sincronización del carro con `cart_items` y checkout en 3 pasos hasta `place_order` (M1 + M2).

Antes de la fase 5: Supabase tiene el esquema, el seed de Almacén y las funciones de búsqueda y de cupón; la app tiene clientes, proxy de sesión y tipos; el design system está portado a `src/components/ui/`; el catálogo funciona con datos reales; y el carro tiene drawer, página `/carro`, Carro vacío, validación contra la BD y cupón con rate limiting (24-10-2026).

## Hecho ✅

| Qué | Dónde | Verificado |
|---|---|---|
| Proyecto creado con `create-next-app` (TS, ESLint, App Router, `src/`, sin Tailwind, alias `@/*`, Turbopack) | raíz | `npm run build` OK (22-10-2026) |
| Dependencias `zustand`, `redis`, `server-only` | `package.json` | ✅ |
| `getRedis()`: conexión única, reintento y `server-only` | `src/lib/redis.ts` | ✅ |
| `useCartStore` (agregar, quitar, vaciar; `persist` en `cart`) | `src/store/cart-store.ts` | ✅ (completo en la fase 4) |
| `GET /api/health` → `{redis:"PONG"}` o 503 | `src/app/api/health/route.ts` | ✅ Sin Redis: 503 en ~5 ms con el motivo (24-10-2026) |
| `.env.example` / `.env.local` con `REDIS_URL` | raíz | ✅ `.gitignore` con `!.env.example` |
| **Fase 0:** `layout.tsx` con `lang="es-CL"`, metadata de Almacén y fuentes Bricolage Grotesque + Instrument Sans | `src/app/layout.tsx` | `npm run build` y `npm run lint` OK; el HTML generado tiene `lang="es-CL"` y las variables de fuente (23-10-2026) |
| **Fase 0:** tokens del design system (claro y oscuro, con las sombras de `tokens.json`) | `src/app/globals.css` | ✅ |
| **Fase 0:** plantilla eliminada (SVG de `public/`); `page.tsx` es una portada provisoria | `src/app/page.tsx` | ✅ |
| **Fase 0:** `formatCLP`, RUT, teléfono y fechas | `src/lib/format/` | `npm run test:run`: 17 tests OK (23-10-2026) |
| Vitest + Testing Library (`npm test`, `npm run test:run`) | `vitest.config.mts` | ✅ build, lint y tests OK |
| **Fase 1:** `@supabase/supabase-js` + `@supabase/ssr`; variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `package.json`, `.env.local`, `.env.example` | ✅ `SUPABASE_SECRET_KEY` agregada y verificada: con ella `coupons` devuelve 2 filas; con la publishable, 0 (RLS) |
| **Fase 1:** clientes público, de usuario y admin + `config.ts` | `src/lib/supabase/` | build, lint y tests OK (19 tests) |
| **Fase 1:** `src/proxy.ts` con `updateSession` (`getClaims`) | `src/proxy.ts`, `src/lib/supabase/proxy.ts` | `next start`: `/` 200, ruta inexistente 404, cookie inválida sin errores (23-10-2026) |
| **Fase 1:** esquema aplicado (por el usuario, desde el SQL Editor) | proyecto `nswchmyzgcutyehhuche` | MCP (23-10-2026): 17 tablas con RLS, 29 + 3 políticas, 10 funciones, 18 triggers, vista, bucket, 5 enums, `pg_trgm`. Advisors: 0 errores |
| **Fase 1:** tipos `Database` y genérico en los clientes | `src/types/database.ts` | build OK |
| **Fase 1:** `/` lee las categorías (`getCategories`, `'use cache'`) | `src/lib/catalog/queries.ts`, `src/app/page.tsx` | HTML generado con Cerámica, Textiles, Velas y aromas, Cocina (build limpio) |
| **Fase 1:** correcciones de los advisors aplicadas | `ecommerce_schema.sql` (unificado) | 43 políticas en `public`, iguales una a una a las del archivo. EXECUTE revocado en las funciones de trigger. 3 índices de FK. Advisors: 0 errores, solo los avisos aceptados e índices sin uso |
| **Fase 1:** seed de Almacén (M6) | `ecommerce_seed.sql` (unificado) | 4 categorías, 4 marcas, 12 productos, 20 variantes (1 agotada, 4 con stock bajo), 12 imágenes 4:5, 2 cupones; 12 filas en `product_catalog` |
| **Fase 2:** 15 componentes del design system + `Select` | `src/components/ui/` | 39 tests OK; build y lint OK; `/diseno` renderiza los 15 componentes sin errores en `next dev` (23-10-2026) |
| **Fase 2:** header, footer y versiones reducidas del checkout | `src/components/layout/` | HTML de `/`: promo, navegación desde la BD (Cerámica, Textiles, Velas y aromas, Cocina, Ofertas), buscador, cuenta, favoritos, carro, footer con razón social y RUT |
| **Fase 2:** layouts `(tienda)` y `(checkout)` | `src/app/` | `/diseno` responde 404 en producción |
| **Fase 2:** revisión visual contra el bundle original | `/diseno`, header y footer | Capturas con Edge headless en claro y oscuro (1280 px) y móvil (390 px): coinciden. Se corrigieron dos problemas heredados del diseño (botón de `ProductCard` en móvil y montos de `OrderSummary`) (24-10-2026) |
| **Fase 3:** consultas del catálogo con `'use cache'` y tags (`getFeaturedProducts`, `getNewProducts`, `listProducts`, `getProductBySlug`, `getVariantStock`, `getReviews`, `getRelatedProducts`, `searchProducts`…) | `src/lib/catalog/queries.ts` | `npm run build` limpio (sin `.next`): 27 páginas; las 4 categorías y los 12 productos se prerenderizan (24-10-2026) |
| **Fase 3:** lógica pura del Listado, variantes y mapeo de filas | `src/lib/catalog/{listing,variants,mappers}.ts` | 59 tests OK (20 nuevos); se elimina el test de la portada provisoria |
| **Fase 3:** Inicio, Listado (`/categorias/[slug]`, `/novedades`, `/ofertas`), Ficha (`/productos/[slug]`), Búsqueda (`/buscar`) y 404 | `src/app/(tienda)/`, `src/app/not-found.tsx`, `src/components/catalog/` | `next start`: todas responden. Filtros y orden verificados contra el seed (p. ej. Cerámica + con stock + $15.000 a $30.000 = Florero y Fuente; Ofertas = 4 productos, hasta −25 %); *Mostrando 8 de 12* → *12 de 12*; Ficha de la Taza: Terracota *(agotado)*, Florero *Quedan 3 unidades*; `og:image` y título. Ruta inexistente: 404; slug inexistente: plantilla 404 con `noindex` (trampa 48) |
| **Fase 3:** función `search_products` (full-text + trigramas de respaldo) | Supabase + `ecommerce_schema.sql` §12 | Probada como `anon`: "taza" → Taza; "tasa" → Taza primero; "ceramica" → 4 productos de Cerámica; "xyzzy" → Sin resultados. Advisors: sin avisos nuevos |
| **Fase 3:** revisión visual | Inicio, Listado, Ficha, Sin resultados, 404 | Capturas con Edge headless a 1280 px (tema oscuro) y 390 px reales (con `iframe`, trampa 49): sin desbordes. Ajuste: en móvil, el favorito de la Ficha queda en la misma fila que *Agregar al carro* |
| **Fase 4:** `CartItem` por variante (B28), `setQuantity`, `restoreItem`, `couponCode`, `persist` v1 con `migrate` (trampa 24); store de UI `useCartUi` | `src/store/` | Tests del store; en el navegador, un carro de la versión 0 se descarta sin errores |
| **Fase 4:** drawer (`<dialog>` modal de 440 px) abierto por *Agregar al carro* de la Ficha y de la tarjeta (D-017) | `src/components/cart/cart-drawer.tsx` | `next start` + Edge por CDP: se abre con *Agregaste … al carro*, foco dentro, Esc lo cierra y devuelve el foco a *Agregar al carro*, el velo lo cierra; el header dice *Carro, 2 productos* |
| **Fase 4:** página `/carro` (Carro y Carro vacío) con `FreeShippingBar`, `CartItem` con tope en el stock, *Eliminar* con *Deshacer*, `OrderSummary`, entrega, *Te podría gustar* y *Novedades* | `src/app/(tienda)/carro/page.tsx`, `src/components/cart/` | Build: `/carro` estática (○). Carro alterado en `localStorage` (precio $1, 80 unidades) → *El precio … cambió a $12.490* y *Solo quedan 18 unidades…*. *Deshacer* también en el Carro vacío |
| **Fase 4:** migración M3 `validate_coupon` (solo `service_role`, D-019) | Supabase + `ecommerce_schema.sql` §11 + `src/types/database.ts` | MCP: BIENVENIDA10 sobre $12.490 → $1.249; DESCUENTO5000 → $5.000; como `anon` → *permission denied*. Advisors: sin avisos nuevos |
| **Fase 4:** `refreshCart` y `applyCoupon` (Server Actions de solo lectura) + rate limiting en Redis (D-005, fail-open) | `src/lib/cart/`, `src/lib/rate-limit.ts` | En el navegador: vacío → *Escribe el código…*; NOEXISTE → *no es válido o ya venció*; DESCUENTO5000 bajo $30.000 → *es para compras desde $30.000*; BIENVENIDA10 → −10 % y se recalcula al cambiar la cantidad. Redis no corre en local: se verificó el fail-open (log) y el límite con un cliente falso en los tests |
| **Fase 4:** revisión visual | Drawer, Carro, cupón, corrección, Carro vacío | Capturas a 1280 px (oscuro) y a 390 px reales (claro, `iframe` servido desde `localhost`, trampas 49 y 52): sin desbordes. Ajustes: la página no se desplaza con el drawer abierto; sin esquinas a todo el ancho |
| **Fase 5:** M1 + M2 (`orders` con datos del checkout; `place_order` con despacho, redondeo, IVA, retiro y `expires_at`) | Supabase + `ecommerce_schema.sql` §7 y §11 + `src/types/database.ts` | Aplicada con `execute_sql` (`apply_migration` falló). Solo existe la firma nueva; advisors sin avisos nuevos |
| **Fase 5:** cuenta: `signIn`, `signUp`, `startGuestCheckout`, `signOut`; `/ingresar`, `/cuenta` (provisoria), `/auth/confirm` | `src/lib/auth/`, `src/components/auth/`, `src/app/` | Errores de Ingresar (vacío, contraseña incorrecta), ingreso con `?volver=/checkout`, *Cerrar sesión*. Invitado: con los anónimos desactivados muestra *La compra como invitado no está disponible…*; activados, crea la sesión anónima y entra al checkout |
| **Fase 5:** `syncUserCart` / `syncCart` y fusión al ingresar (D-018) | `src/lib/cart/server.ts`, `merge.ts` | Carro local (Taza ×2, Frasco) + `cart_items` (Florero) → los tres en el store y en la BD |
| **Fase 5:** checkout en 3 pasos + `placeOrder` | `src/app/(checkout)/`, `src/components/checkout/`, `src/lib/checkout/` | Pedido 1001 (domicilio RM, Webpay, BIENVENIDA10): $52.960 − $5.296, despacho gratis, IVA $7.610, 30 min. Pedidos 1002/1003 (retiro, transferencia, factura): $20.480, 48 h. Stock descontado, `cart_items` vacío, cupón canjeado, dirección guardada como predeterminada. Pedido 1004 como invitado (2026-10-24): sesión anónima, correo de contacto, despacho a Viña del Mar ($6.990), Flow, boleta: $27.470, IVA $4.386, 30 min. En Supabase el usuario es `is_anonymous` y sin correo, con `profile`, dirección y `cart_items` vacío |
| **Fase 5:** regiones, comunas y feriados (B31) | `src/lib/chile/` | 346 comunas (343 con despacho); feriados 2026–2027 (verificar) |
| **Fase 5:** revisión visual | Acceso, Ingresar, errores de Despacho y Pago, Pago, pedido, cuenta | Capturas a 1280 px (oscuro) y a 390 px reales (iframe desde localhost:3301): sin desborde horizontal. Ajustes: botón *Editar* sin estilo de botón nativo; `connection()` en el cliente de usuario |
| ***¿Olvidaste tu contraseña?*** | `/ingresar/recuperar`, `/ingresar/nueva-contrasena`, `requestPasswordReset`, `updatePassword` | `next start` + Edge: enlace desde Ingresar, errores (correo vacío, contraseña corta, no coinciden), correo sin cuenta con la misma respuesta, enlace generado con `generate_link` → contraseña cambiada (ingresa con la nueva y no con la anterior), enlace reutilizado → *no es válido o ya venció*, página sin sesión → *Pedir un enlace nuevo*. Sin errores en la consola (24-10-2026) |
| **Fecha de entrega en la Ficha (B35)** | `src/components/catalog/delivery-estimate.tsx`, `commune-picker.tsx`, `src/lib/checkout/delivery-commune.ts` | `next start` + Edge (25-10-2026): sin comuna → *Elige tu comuna…*; Viña del Mar → *Llega el viernes 30 de octubre*, $6.990; Providencia → *martes 27*, $3.990 (persiste al recargar); selector sin comuna → error; cookie alterada → plazos por zona; comuna guardada desde el paso Despacho → *a Ñuñoa*; 390 px sin desborde. Sin errores de retomar la página (trampa 62). `/carro` sigue estática |
| **Fase 6:** M4 + intentos de pago: `payments.attempt/reference/confirming_until`, `payment_alerts`, `start_payment_attempt`, `claim_payment`, `settle_payment` | Supabase (`payments_attempts_m4`) + `sql/2026-10-25_payments_attempts.sql` + `ecommerce_schema.sql` + `src/types/database.ts` | `apply_migration` funcionó a la primera. Probadas en una transacción revertida (intento reemplazado, lock true/false, settle idempotente, pedido `paid` con `paid_at`). Advisors: las funciones nuevas no aparecen (EXECUTE solo `service_role`); `payment_alerts` solo con el aviso de anónimos ya aceptado |
| **Fase 6:** Webpay Plus (create, form POST `token_ws`, retorno GET/POST con 303, commit con lock, `status` de respaldo, verificación de monto/orden/sesión) | `src/lib/payments/`, `src/app/api/pagos/webpay/retorno/`, `src/components/payment/` | Integración (25-10-2026): aprobado con cuenta (1020) y como invitado (1022); rechazado (MASTERCARD); abortado (`TBK_TOKEN`, sin commit); timeout simulado; sesión ajena → *No encontramos ese pago*; 3 recargas del retorno → sin commit; 2 retornos simultáneos → un solo commit; navegador cerrado después de pagar → el cron hizo el commit (1029, `recovered: 1`); anulado durante el formulario → sin cobro (1031, INITIALIZED) |
| **Fase 6:** Flow (firma, create con `timeout` 1200, `urlConfirmation`, `urlReturn`, `getStatus`, reembolso) | `src/lib/payments/flow*.ts`, `src/app/api/pagos/flow/` | Sandbox: rechazo (`status` 3) → *Tu pago en Flow no se completó* → reintento pagado (1028, *Pagado con Webpay vía Flow*); confirmación simulada con `curl` (200 en ~1 s, repetida sin cambios, token desconocido 200); **B13**: pagado después de que el cron anuló el pedido → reembolso de $11.980 en Flow, intento `refunded`, alerta `paid_after_cancel`, stock sin doble descuento (1030). Sin túnel (D-024) |
| **Fase 6:** transferencia (intento `pending`, *Transferencia pendiente* con *Copiar*, plazo de 48 h en hora de Chile, *Pagar con tarjeta en su lugar*) | `src/app/(checkout)/pedido/[id]/transferencia/`, `transfer-details.tsx` | Invitado (1022): rechazo → reintento anulado → transferencia (carro vaciado, *Copiado* anunciado con `role="status"`) → tarjeta aprobada. Intentos `1022-1`…`-4` con su `shop_reason` |
| **Fase 6:** reintentar / cambiar de medio (`retryPayment`, `PAYMENT_RATE_LIMIT`), *Estamos confirmando tu pago* (consulta a Flow), pedido vencido, pago devuelto, `/pedido/no-encontrado` | `src/lib/payments/actions.ts`, `screen.ts`, `src/app/(checkout)/pedido/` | Ver arriba. El medio anterior queda preseleccionado; el botón dice *Reintentar pago*, *Pagar* o *Ver datos para transferir* |
| **Fase 6:** cron `/api/cron/expirar-pedidos` (`CRON_SECRET`, `vercel.json` diario `0 9 * * *` mientras la cuenta siga en Hobby; cada 10 min con Pro) | `src/lib/payments/expire.ts` | 401 sin el secreto. Anuló los pedidos abandonados de las pruebas (1007–1019 y otros) consultando antes la pasarela; recuperó el pagado (1029); una segunda pasada no hace nada |
| **Fase 6:** *Te estamos llevando a Webpay Plus/Flow para pagar $X…* y *Volver al carro* sin enlace mientras se paga; carro del navegador vaciado solo con el pago aprobado o la transferencia registrada (una vez por pedido) | `payment-step.tsx`, `back-to-cart.tsx`, `payment-settled.tsx`, `payment-ui-store.ts` | Verificado en Edge por CDP (texto exacto y `<span aria-disabled>` en el header) |
| **Fase 6:** correos con Resend (confirmación, datos para transferir, pago devuelto) | `src/lib/email/` | Sin `RESEND_API_KEY`: se omiten con un aviso en el log (verificado). ✅ Con llave desde el 25-10-2026: envío real desde `pedidos@mail.audazia.dev` (llega a spam en Outlook por ser un dominio nuevo) |
| **Fase 6:** revisión visual | Confirmación, Pago rechazado, Flow no completado, Transferencia pendiente, confirmando, vencido, reembolsado | Capturas a 1280 px (oscuro) y 390 px reales (iframe desde localhost:3311): sin desborde horizontal, sin errores de consola, sin *resumable* en el log de `next start` |
| Tests | `*.test.ts(x)` | 169 OK (+41 de la fase 6: retornos de Webpay, firma y estados de Flow, lock, pantallas, textos, correos) (25-10-2026); antes 128 OK (+3 de la cookie de la comuna); antes 125 OK (+2 de contraseña, +2 de express, +1 de STORE desde el cierre); antes 120 OK (33 nuevos en la fase 5); `npm run lint` y `npm run build` (sin `.next`) OK (24-10-2026) |
| **Fase 7.0:** M8 (`order_events` + trigger `log_order_event`, `orders.cancel_reason`/`cancel_note`, `cancel_order` con motivo), `order-status.ts` (estados, transiciones, `estimatedDelivery` B25), `getAdminUser`/`requireAdmin`, cron con motivo `vencio` | Supabase (`order_events_m8`), `sql/2026-10-25_order_events.sql`, `src/lib/orders/`, `src/lib/auth/session.ts`, `src/lib/payments/expire.ts` | 25-10-2026: SQL probado en transacciones revertidas (eventos `placed`/`paid`/`processing`/`shipped`/`delivered`/`cancelled` con su actor y datos; motivo inválido rechazado; sin evento si no cambia el estado). Con la sesión de `prueba.fase5`: `is_admin` false, 0 eventos visibles, no puede anular el 1020 (pagado); sin sesión, *permission denied*. `next start` + Edge por CDP: Confirmación del 1020 → *Llega el martes 27 de octubre* y el paso 3 igual, sin errores de consola. 182 tests, lint y build OK. Sin pedidos nuevos (el próximo sigue siendo el 1037) |
| **Fase 7.1:** layout de `/cuenta` con su menú (*Hola, <nombre>*, *Mis pedidos*, *Cerrar sesión*; el resto en la 7.5), `/cuenta` → `/cuenta/pedidos`, **Mis pedidos** (tarjeta con N.º, `Badge`, fecha, miniaturas, línea de estado B24, resumen, total, *Ver detalle*; estado vacío propuesto) y **Detalle de pedido** (migas, seguimiento de 4 pasos, productos con *Volver a comprar*, dirección, pago, totales, *Necesito ayuda*; sin *Descargar boleta*, D-012). Proxy con el código HTTP del Detalle (D-026) | `src/app/(tienda)/cuenta/`, `src/components/account/`, `src/lib/orders/customer-view.ts`, `account.ts`, `src/lib/supabase/proxy.ts` | 25-10-2026, `next start` + Edge por CDP a 1280 y 390 px (sin desborde horizontal, sin errores de consola de la app, sin *resumable* en el log): con `prueba.fase5`, `/cuenta` → `/cuenta/pedidos` (30 pedidos), Detalle de 1020 (*Llega el martes 27 de octubre*, Confirmado el domingo 25), 1030 (*Te devolvimos $11.980…*), 1032 (*La transferencia no llegó a tiempo…*) y 1002 (retiro). Estados HTTP: propio 200; de un invitado (1021, 1036), inexistente (99999) e inválido (abc) → **404**. Sin sesión y como invitado (sesión anónima nueva, sin pedido) → redirect a Ingresar en la lista y el Detalle. *En camino*, *Entregado* y *Reembolsado* vistos con el 1029 cambiado temporalmente con permiso del dueño (triggers desactivados en la transacción: sin eventos) y restaurado idéntico (mismo `updated_at`, 0 eventos). 202 tests, lint y build OK. Sin pedidos nuevos: el próximo sigue siendo el **1037** |
| Design system, 40 templates y flujo de compra (artifacts) | [04-diseno/](../04-diseno/) | — |
| Servidores MCP `supabase`, `vercel`, `github`, `flow` y `transbank` configurados | `.mcp.json` | `vercel` agregado el 25-10-2026: autenticado, `list_projects` responde (solo `portafolio`). `github` agregado el 25-10-2026: autenticado como `Luckillash`, `Luckillash/shop` responde (público, `main`) |
| Documentación orientada a agentes | `documentación/` | 23-10-2026 |

## Por fase (ver la [hoja de ruta](../06-implementacion/hoja-de-ruta.md))

| Fase | Estado | Próximo paso |
|---|---|---|
| 0 · Base del proyecto | ✅ Terminada (23-10-2026) | — |
| 1 · Base de datos y Supabase | ✅ Terminada (23-10-2026) | — |
| 2 · Design system | ✅ Terminada (23-10-2026; revisión visual 24-10-2026) | — |
| 3 · Catálogo | ✅ Terminada (24-10-2026) | Pendientes registrados en la [hoja de ruta](../06-implementacion/hoja-de-ruta.md): fecha de entrega por comuna (B35) → fase 5; `next/image` (D-015) → cuando estén las fotos reales, antes de producción; filtros Tipo y Color (M5, B17) → cuando se definan los tipos |
| 4 · Carro | ✅ Terminada (24-10-2026) | — |
| 5 · Cuenta y checkout | ✅ Terminada (24-10-2026; fecha en la Ficha 25-10-2026) | — |
| 6 · Pagos | ✅ Terminada (25-10-2026) | `urlConfirmation` real ✅ probada en `audazia.dev` (25-10-2026, pedido 1036). Resend ✅ y datos bancarios reales ✅ (25-10-2026) |
| 7 · Postcompra y operación | 🔄 **En curso** · 7.0 ✅ · 7.1 ✅ (25-10-2026) | Revisar la primera ejecución del cron (26-10 después de las 06:00; T1) y seguir con la 7.2 (invitado → cuenta). Textos propuestos de la 7.1 por revisar (T2). Plan y decisiones en [plan-fase-7](../_archivo/plan-fase-7.md) y [pendientes del dueño](../_archivo/pendientes-del-dueno-fase-7.md) |

## Pendientes heredados (del avance original)

- [x] Conectar Supabase: paquetes, variables, scripts SQL, tipos y proxy (23-10-2026).
- [x] Cómo se relaciona el carro de Zustand con `carts` / `cart_items`: solo Zustand hasta que haya sesión; `syncCart` en la fase 5 (D-018, dueño, 24-10-2026).
- [x] Para qué se usa Redis: rate limiting (D-005, dueño, 24-10-2026). Los locks de pago siguen como propuesta para la fase 6.
- [x] `/api/health` se colgaba si Redis estaba apagado (trampa 53). Corregido en `src/lib/redis.ts` (24-10-2026): responde 503 en ~5 ms con el motivo (`connect ECONNREFUSED ::1:6379; connect ECONNREFUSED 127.0.0.1:6379`).
- [x] El despacho gratis se compara con el subtotal **después** del cupón (dueño, 24-10-2026, D-011): `place_order`, `/carro` y `FreeShippingBar`.
- [x] Inicios anónimos activados por el dueño (24-10-2026, D-008) y pedido completo como invitado verificado (pedido 1004).
- [x] `/auth/confirm` agregado a *Redirect URLs* de Supabase Auth por el dueño (24-10-2026). Probado con un correo real en `audazia.dev` el 25-10-2026: confirmación de cuenta y *¿Olvidaste tu contraseña?* funcionan.
- [x] Datos **reales** del retiro en tienda (25-10-2026): Local Tajamar, Tajamar 223, Departamento 302, Las Condes; lunes a viernes de 10:00 a 18:00 y sábados de 10:00 a 14:00. En `src/lib/store.ts` y en `place_order`.
- [x] El express es solo para la RM (dueño, 24-10-2026): checkout, `validateShipping` y `place_order`.
- [x] Feriados 2026–2027 verificados (24-10-2026): se agregó el viernes 17 de septiembre de 2027 (Ley 20.983). Hay que agregar los de 2028 antes de diciembre de 2027.
- [x] Pedidos de prueba 1001–1004 anulados con `cancel_order` (24-10-2026): stock y cupón devueltos. Quedan el usuario `prueba.fase5@almacen.cl` y los usuarios anónimos de las pruebas (borrarlos antes de producción).
- [ ] Datos de prueba de la fase 6 (25-10-2026): pedidos 1007–1036. Quedan **pagados** en integración/sandbox (sin dinero real) 1020, 1021, 1022, 1027, 1028, 1029 y 1036 (este último, la prueba de `urlConfirmation` en `audazia.dev`). El 1030 está anulado con su pago reembolsado y una alerta `paid_after_cancel`, y el resto anulados por el cron (stock devuelto: cuadra con el seed). Decisión del dueño (25-10-2026): **se dejan** hasta producción y entonces **se borran** (antes, `cancel_order` a los pagados para devolver el stock). La prueba de la 7.1 (25-10-2026) creó un usuario anónimo más, sin pedido (comprar como invitado); se borra con los demás anónimos.
- [ ] `npm audit`: 5 vulnerabilidades "high" en las dependencias de la plantilla. No se aplicó `--force`.
- [x] Reemplazar la página de inicio de la plantilla (template Inicio implementado el 24-10-2026).
- [x] Confirmado por el dueño (24-10-2026): umbral de stock bajo ≤ 3 (B19), textos del hero del Inicio y *Destacados* mientras no haya ventas (B34).
- [ ] *Los más vendidos* en el Inicio cuando haya ventas (B34): hoy no cambia solo. **Queda para la fase 7** (decisión del dueño, 24-10-2026).
- [x] Vitest configurado (23-10-2026): 17 tests en `src/lib/format/` y `src/app/page.test.tsx`. Falta definir los tests E2E (Playwright) para los Server Components `async` y el flujo de pago.

## Tareas del dueño de la fase 5 (revisadas el 24-10-2026)

El dueño cerró sus tareas de [_archivo/pendientes-del-dueno-fase-5.md](../_archivo/pendientes-del-dueno-fase-5.md). Estado comprobado por el agente con el MCP de Supabase y `/auth/v1/settings`:

| # | Tarea | Estado verificado |
|---|---|---|
| 1 | Inicios anónimos | ✅ `anonymous_users: true`; pedido 1004 como invitado |
| 2 | `/auth/confirm` en Redirect URLs | ✅ Configurado por el dueño. ✅ Probado con un correo real el 25-10-2026 en `audazia.dev` (cuenta confirmada en `auth.users`; *¿Olvidaste tu contraseña?* también) |
| 3 | Datos del retiro en tienda | ✅ Datos reales (25-10-2026): Local Tajamar, Tajamar 223, Departamento 302, Las Condes |
| 4 | Express solo en la RM | ✅ Implementado |
| 5 | Feriados 2026–2027 | ✅ Verificados (+ 17-09-2027) |
| 6 | Datos de prueba | ✅ Pedidos 1001–1004 `cancelled`. ⏳ Siguen 4 usuarios de prueba en `auth.users` (`prueba.fase5@almacen.cl` y 3 anónimos): borrarlos antes de producción |
| 7 | Historial de migraciones (opcional) | ✅ Registrada con `apply_migration` como `orders_checkout_fields_place_order_v2` (SQL idempotente, sin cambio de comportamiento). Advisors: aparecen avisos nuevos por haber activado los anónimos: `auth_allow_anonymous_sign_ins` en 19 tablas (aceptado: las políticas de dueño son para los invitados y las de admin usan `is_admin()`; revisar `reviews` en la fase 7) y `auth_leaked_password_protection` (activar antes de producción) |

Quedan para antes de producción (en el [checklist](../07-referencia/checklist-produccion.md)): borrar los usuarios de prueba y activar *Leaked password protection* en Supabase Auth. Los datos reales del retiro (25-10-2026) y la prueba de la confirmación de correo con un correo real (25-10-2026) ya están hechos.

## Primer despliegue (25-10-2026)

Publicada en https://audazia.dev (Vercel, plan Hobby, cron diario), con los pagos en integración/sandbox y sin Redis. Los pendientes, con sus pasos, en [_archivo/pendientes-del-despliegue.md](../_archivo/pendientes-del-despliegue.md).

## Tareas del dueño de la fase 6 (25-10-2026)

Con sus pasos en [_archivo/pendientes-del-dueno-fase-6.md](../_archivo/pendientes-del-dueno-fase-6.md):

| # | Tarea | Prioridad |
|---|---|---|
| 1 | ~~Cuenta de Resend + `RESEND_API_KEY` + dominio verificado (D-022)~~ ✅ `mail.audazia.dev` (25-10-2026). Falta la llave de producción | ✅ |
| 2 | ~~Confirmar los textos propuestos sin diseño (B14, B37)~~ ✅ Aprobados (25-10-2026) | ✅ |
| 3 | ~~Plan de Vercel que permita el cron cada 10 min, o `pg_cron` (D-021)~~ ✅ Cron **diario** (la cuenta sigue en Hobby, no Pro) con `CRON_SECRET` cargado en Vercel (25-10-2026). Falta volver a cada 10 min | ⚠️ |
| 4 | ~~Datos bancarios reales~~ ✅ en `.env.local` (25-10-2026, D-024). Falta cargarlos en Vercel | ✅ |
| 5 | ~~Probar `urlConfirmation` de Flow~~ ✅ en `audazia.dev` (25-10-2026, pedido 1036) | ✅ |
| 6 | ~~Qué hacer con los pedidos de prueba~~ ✅ Se dejan; se borran al subir a producción (25-10-2026) | ✅ |

## Antes de la fase 7

Nada de las fases 5 y 6 la bloquea. Lo recomendado antes de empezar (cuenta con un correo real ✅ 25-10-2026; primera ejecución del cron) y lo que quedó para producción está en [_archivo/pendientes-antes-de-la-fase-7.md](../_archivo/pendientes-antes-de-la-fase-7.md).

## Decisiones que bloquean

Ninguna para la fase 7. Fase 6: el dueño decidió el 25-10-2026 locks fail-open (D-005), Flow sin túnel (D-024), datos bancarios ficticios (D-024; reemplazados por los reales el mismo día), Vercel Cron (D-021; diario mientras la cuenta siga en Hobby), reembolso automático + alerta (D-020), invitado → cuenta en la fase 7 y correos con Resend (D-022). Sigue abierto el proveedor de boleta electrónica (D-012). Resend ya envía desde `mail.audazia.dev`; falta la llave de producción. Los textos propuestos sin diseño (B14, B37) quedaron aprobados.
