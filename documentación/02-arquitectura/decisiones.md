---
title: "Registro de decisiones de arquitectura"
description: "Decisiones tomadas, propuestas y pendientes (D-001…), con su contexto, consecuencias y dónde impactan. Antes de cambiar algo estructural, revisa aquí."
keywords: ["ADR", "decisiones", "pendientes", "propuestas", "tailwind", "supabase", "redis", "invitado", "despacho", "IVA", "buy_order", "expiración"]
related: ["07-referencia/brechas-diseno-vs-datos.md", "08-estado/avance.md"]
source: ["_archivo/avance-del-proyecto.md §6", "_archivo/diseno-almacen.md §6", "análisis de la documentación (2026-10-23)"]
estado: "vigente"
---

# Registro de decisiones

> **Úsalo cuando:** vas a hacer un cambio estructural, o una tarea depende de una decisión. Si tomas una decisión nueva, agrégala aquí.

Estados: ✅ tomada · 💡 propuesta (recomendada, falta confirmarla) · ❓ pendiente (hay que preguntarle al dueño del proyecto).

| ID | Decisión | Estado |
|---|---|---|
| D-001 | Next.js 16 con App Router, Cache Components y Partial Prefetching | ✅ |
| D-002 | CSS Modules + tokens en `globals.css`, sin Tailwind | ✅ |
| D-003 | Supabase como base de datos, autenticación y almacenamiento de imágenes | ✅ |
| D-004 | Zustand con `persist` para el carro del cliente | ✅ |
| D-005 | Redis para rate limiting (cupón, fase 4) y locks de pago (fase 6), fail-open con respaldo en la BD | ✅ |
| D-006 | Portar el design system como componentes propios de React 19 | ✅ |
| D-007 | Medios de pago: Webpay Plus, Flow y transferencia | ✅ |
| D-008 | Compra como invitado con sesiones anónimas de Supabase | ✅ |
| D-009 | Montos en CLP como enteros en la app | ✅ |
| D-010 | `expires_at`: 30 min Webpay/Flow, 48 h transferencia (el cron, en la fase 6) | ✅ |
| D-011 | Despacho calculado en `place_order`; el umbral se mide después del cupón | ✅ |
| D-012 | IVA incluido en `tax_total` (informativo); boleta o factura con `invoice_details` | ✅ (proveedor SII pendiente) |
| D-013 | `buy_order` / `commerceOrder` = `<order_number>-<n>` | ✅ |
| D-014 | Retiro: `shipping_method = pickup` y la dirección de la tienda en `shipping_address` | ✅ |
| D-015 | Imágenes con `<img>` mientras sean placeholders; `next/image` con las fotos reales | ✅ |
| D-016 | Búsqueda con la función `search_products` (full-text + trigramas como respaldo) | ✅ |
| D-017 | Agregar al carro desde la tarjeta solo con una variante; con varias, "Ver opciones" | ✅ |
| D-018 | En la fase 4 el carro vive solo en Zustand; `cart_items` se sincroniza con la sesión (fase 5) | ✅ |
| D-019 | `validate_coupon` solo para `service_role`, llamada desde una Server Action con rate limiting | ✅ |
| D-020 | Pago aprobado sobre un pedido anulado o ya pagado: reembolso automático + alerta | ✅ |
| D-021 | Cron de vencimiento en Vercel Cron cada 10 min (plan Pro) | ✅ |
| D-022 | Correos transaccionales con Resend desde `mail.audazia.dev` (sin llave: se omiten) | ✅ |
| D-023 | Intentos de pago: `start_payment_attempt` crea el intento antes del token y reemplaza los pendientes; el plazo no se acorta al cambiar de medio | ✅ |
| D-024 | Datos bancarios ficticios hasta producción (reales desde el 25-10-2026) · invitado → cuenta en la fase 7 · Flow sin túnel en local | ✅ |

---

### D-001 · Next.js 16 con Cache Components ✅
- **Contexto:** el proyecto se creó con `create-next-app` (16.4.2) y `cacheComponents: true` + `partialPrefetching: true`.
- **Consecuencia:** nada se cachea si no se marca con `'use cache'`. Las APIs de request son async y van en `<Suspense>`. Se usa `proxy.ts`. Ver [01-fundamentos/stack-y-versiones.md](../01-fundamentos/stack-y-versiones.md).

### D-002 · CSS Modules sin Tailwind ✅
- **Consecuencia:** los tokens del diseño van como variables CSS en `globals.css`.

### D-003 · Supabase ✅
- **Consecuencia:** la lógica crítica (stock, cupones, totales) vive en PostgreSQL (`place_order`) y la seguridad en RLS. El cliente aún no está instalado.

### D-004 · Zustand para el carro ✅
- **Consecuencia:** hay dos carros (el del cliente y `cart_items`). Ver [estado-del-cliente.md](estado-del-cliente.md).

### D-005 · Uso de Redis ✅ rate limiting (2026-10-24) · ✅ locks (2026-10-25)
- **Contexto:** se instaló y hay un health check, pero no tenía un uso definido.
- **Decisión (dueño, 2026-10-24):** Redis se usa para el **rate limiting** de *Aplicar cupón*: ventana fija `INCR` + `EXPIRE` en `rl:coupon:<ip>`, 10 códigos inexistentes cada 10 minutos (`src/lib/rate-limit.ts`). Es **fail-open**: si Redis no responde en 500 ms, deja pasar y lo registra (lo crítico lo vuelve a validar PostgreSQL).
- **Locks de pago (dueño, 2026-10-25):** `SET lock:pay:<provider>:<token> NX EX 60` antes del commit de Webpay o del getStatus de Flow (`src/lib/payments/lock.ts`). **Fail-open**: Redis no corre en local (decisión del dueño), así que la garantía real es el lock de la BD: `claim_payment` marca `payments.confirming_until` solo si el intento sigue `pending` y nadie lo tiene. Verificado con dos retornos simultáneos del mismo token: uno confirma y el otro redirige sin tocar la pasarela.
- También limita login, crear cuenta, invitado, crear pedido (fase 5) y reintentar el pago (`PAYMENT_RATE_LIMIT`, 20 por hora). **No** usarlo para cachear el catálogo (eso lo hace `'use cache'`). Ver [renderizado-y-cache.md](renderizado-y-cache.md#rol-de-redis).

### D-006 · Portar el design system ✅ (fase 2, 2026-10-23)
- **Contexto:** los componentes del diseño son de React 18 y se exponen en `window.Almacen` (bundle global). El proyecto usa React 19 con Server Components.
- **Propuesta:** reescribirlos en `src/components/ui/` con CSS Modules, respetando sus props y reglas. No cargar el bundle. Ver [06-implementacion/portar-design-system.md](../06-implementacion/portar-design-system.md).

### D-007 · Medios de pago ✅
- Webpay Plus (tarjetas), Flow (otros medios) y transferencia con reserva de 48 h. Los MCP del proyecto apuntan a integración y sandbox.

### D-008 · Invitados con sesiones anónimas ✅ (dueño, 2026-10-24)
- **Contexto:** `place_order` exige `auth.uid()`. El diseño permite comprar como invitado.
- **Decisión:** *Continuar como invitado* (checkout) o *Comprar como invitado* (Ingresar) llama a la Server Action `startGuestCheckout`, que crea una sesión con `signInAnonymously()` (rate limiting por IP, `GUEST_RATE_LIMIT`). El trigger `handle_new_user` crea su `profile` y su `cart`; RLS funciona igual porque el rol es `authenticated`.
- **⚠️ Requisito:** activar *Allow anonymous sign-ins* en Supabase → Authentication. Mientras esté desactivado, la app muestra *La compra como invitado no está disponible en este momento. Ingresa o crea una cuenta.* ✅ Activado por el dueño el 2026-10-24. Pedido 1004 como invitado (2026-10-24): sesión anónima, correo de contacto, despacho a Viña del Mar ($6.990), Flow, boleta: $27.470, IVA $4.386, 30 min. En Supabase el usuario es `is_anonymous` y sin correo, con `profile`, dirección y `cart_items` vacío.
- **Pendiente (fase 7, decisión del dueño del 2026-10-25):** convertir al invitado en cuenta desde la Confirmación (`updateUser`) y limpiar anónimos sin pedidos. La Confirmación de la fase 6 no muestra el `Notice` *Guarda tus datos para la próxima compra*.

### D-009 · CLP entero ✅
- **Contexto:** el diseño, Webpay y Flow trabajan con CLP enteros. La BD usa `numeric(12,2)`.
- **Consecuencia:** se redondea al leer. Ojo: el descuento porcentual de `place_order` usa `round(…, 2)` y puede generar decimales. Ver [07-referencia/trampas-conocidas.md](../07-referencia/trampas-conocidas.md).

### D-010 · Vencimiento de pedidos pendientes ✅ (dueño, 2026-10-24)
- **Contexto:** `place_order` descuenta el stock al crear el pedido. Un pedido `pending` que nunca se paga retiene el stock.
- **Decisión:** columna `orders.expires_at`, que calcula `place_order`: `now() + 30 min` para `webpay` y `flow`, `now() + 48 h` para `transfer` (M1 + M2). Un cron (Route Handler protegido, fase 6) llamará a `cancel_order` con los vencidos; el índice M4 llega con él.

### D-011 · Costo de despacho ✅ (dueño, 2026-10-24)
- **Decisión:** se calcula en `place_order` (una sola fuente de verdad) con `p_shipping_method`: retiro 0 · express $4.990 · domicilio gratis si **subtotal − descuento ≥ $39.990**, si no $3.990 en la RM y $6.990 en regiones. `src/lib/checkout/shipping.ts` repite las reglas solo para mostrarlas.
- **Consecuencia:** `/carro` y `FreeShippingBar` miden el umbral después del cupón (el drawer no conoce el cupón y usa el subtotal).
- **Express:** El express es **solo para la Región Metropolitana** (todas sus comunas), a $4.990, sin despacho gratis, al día hábil siguiente si se paga antes de las 14:00 de un día hábil (dueño, 2026-10-24; los detalles los propuso el agente). Fuera de la RM, el checkout lo muestra deshabilitado (*Solo en la Región Metropolitana*) y lo desmarca si se cambia de región; `validateShipping` y `place_order` (`hint: express_region`) lo rechazan.

### D-012 · IVA y documento tributario ✅ (dueño, 2026-10-24)
- **Decisión:** `tax_total = round(total × 19 / 119)`, el IVA incluido, solo informativo (el total no cambia). `orders.document_type` (`boleta` · `factura`) y, con factura, `invoice_details = { business_name, rut, activity }`. Un check exige `invoice_details` con factura.
- **Pendiente:** proveedor de boleta electrónica (fase 7).

### D-013 · Identificador de orden por intento ✅ (dueño, 2026-10-24)
- **Decisión:** `"<order_number>-<n>"`, donde `n` es el número de intento (`count(payments) + 1`). Ejemplo: `1001-2`. ✅ Implementado en la fase 6: `payments.attempt` y `payments.reference` (únicos), calculados por `start_payment_attempt` con el pedido bloqueado (D-023).

### D-014 · Retiro en tienda ✅ (dueño, 2026-10-24)
- **Decisión:** `orders.shipping_method = pickup`; `place_order` guarda en `shipping_address` la dirección de la tienda (`type: "pickup"`, `store`, nombre y teléfono de quien retira) sin fila en `addresses`. Las entregas guardan `type: "delivery"`.
- **Datos reales** (el dueño, 2026-10-25; reemplazaron a los ficticios del 2026-10-24, Almacén Providencia, Av. Manuel Montt 1530, Local 4): Local Tajamar, Tajamar 223, Departamento 302, Las Condes (RM); listo desde el día hábil siguiente al pago; lunes a viernes de 10:00 a 18:00 y sábados de 10:00 a 14:00; *Retira con tu RUT y número de pedido.* Están en `src/lib/store.ts` (`STORE.pickup`: `street`, `unit`, `commune`, `readyInBusinessDays`, `hours`, `instructions`) y en `place_order` (`line1`, `line2`, `city`). El test `src/lib/store.test.ts` falla si no coinciden con `ecommerce_schema.sql`.

### D-015 · Imágenes: `<img>` por ahora, `next/image` con fotos reales ✅ (fase 3, 2026-10-24)
- **Contexto:** las imágenes del seed son placeholders de `placehold.co`, que responde **SVG**. `next/image` no optimiza SVG sin `dangerouslyAllowSVG` (riesgo de XSS) y no aporta nada sobre un placeholder.
- **Decisión:** `ProductCard`, la galería de la Ficha y las categorías del Inicio usan `<img>` con `loading="lazy"` (con el `eslint-disable` comentado).
- **Cuando haya fotos en Storage:** pasar a `next/image` con `images.remotePatterns` para `https://<proyecto>.supabase.co/storage/v1/object/public/product-images/**` (no `images.domains`, trampa 22) y `sizes` según la grilla.

### D-016 · Búsqueda con `search_products` ✅ (fase 3, 2026-10-24)
- **Contexto:** la guía proponía full-text + trigramas. Con trigramas siempre activos, "taza" también traía "tapa" y "tabla".
- **Decisión:** función `public.search_products(q, max_results)` (`security invoker`, `search_path = ''`) en dos pasos: full-text en español sobre `search_vector`; **solo si no hay resultados**, `word_similarity` ≥ 0,4 sin tildes sobre el nombre y la categoría ("tasa", "taz", "ceramica"). Máximo 48 filas. La consulta se normaliza (espacios, minúsculas) antes de cachearla.
- **Consecuencia:** sin `unaccent` (no está instalada): las tildes se quitan con `translate`. El full-text no encuentra "ceramica" sin tilde, pero el respaldo por categoría sí.

### D-017 · Agregar al carro desde la tarjeta ✅ (fase 3, 2026-10-24)
- **Contexto:** `ProductCard` tiene un botón *Agregar al carro*, pero un producto con colores o tamaños necesita que el cliente elija.
- **Decisión:** si el producto tiene **una** variante activa, el botón la agrega directo y abre el drawer del carro (desde la fase 4; antes mostraba *Agregado* 2 s). Si tiene varias, dice *Ver opciones* y lleva a la Ficha.

### D-018 · Carro solo en Zustand hasta que haya sesión ✅ (dueño, 2026-10-24)
- **Contexto:** `place_order` lee `cart_items`, pero escribir ahí requiere una sesión (`carts.user_id`), y la sesión (normal o anónima, D-008) llega en la fase 5.
- **Decisión:** en la fase 4 el carro vive solo en Zustand + `localStorage`. `/carro` lo valida contra la BD con `refreshCart`, una Server Action **de solo lectura** (precios y stock actuales; corrige el store y avisa). No se escribe `cart_items`.
- **Consecuencia:** en la fase 5 hay que implementar `syncCart` antes de `place_order` (obligatorio) y la fusión al iniciar sesión. Ver [estado-del-cliente.md](estado-del-cliente.md#sincronización-con-la-base-de-datos-fase-5).

### D-019 · `validate_coupon` solo para `service_role` ✅ (fase 4, 2026-10-24)
- **Contexto:** la propuesta original daba `EXECUTE` a `anon` y `authenticated`. Con eso, cualquiera puede probar códigos llamando a `/rest/v1/rpc/validate_coupon` con la llave publicable, sin pasar por el rate limiting de la app.
- **Decisión:** `EXECUTE` solo para `service_role`. La llama la Server Action `applyCoupon`/`refreshCart` con el cliente admin, después del rate limiting y con el subtotal calculado en el servidor. El usuario se pasa como `p_user_id` (de `getClaims()`, nunca del cliente) para el límite por usuario.
- **Consecuencia:** la firma es `validate_coupon(text, numeric, uuid default null)`. Ver [06-implementacion/carro.md](../06-implementacion/carro.md#cupón).

### D-020 · Pago aprobado sobre un pedido anulado (B13) o ya pagado ✅ (dueño, 2026-10-25)
- **Contexto:** el trigger `sync_order_on_payment` solo actúa sobre pedidos `pending` (trampa 19). Si el cron anula un pedido mientras el cliente paga en Flow, o dos pestañas pagan el mismo pedido, queda un cobro sin pedido.
- **Decisión:** **reembolso automático + alerta**. `settle_payment` devuelve el estado del pedido después del trigger. Si quedó `cancelled` (alerta `paid_after_cancel`) o ya tenía otro pago `paid` (`double_payment`), `src/lib/payments/service.ts` llama al reembolso de la pasarela (Webpay `/refunds`; Flow `refund/create` con `urlCallBack` → `/api/pagos/flow/reembolso`), deja el intento `refunded` y registra la alerta en `payment_alerts`. Si el reembolso falla: alerta `refund_failed` para el admin. El cliente ve *Te devolvimos el pago* y recibe un correo. El pedido no se reactiva: el stock ya se liberó.
- Un monto o una orden que no coinciden (trampa 36) también se reembolsan (`amount_mismatch`).
- **Verificado (2026-10-25):** pedido 1030 (Flow pagado después de que el cron lo anuló): reembolso de $11.980 creado en Flow, intento `refunded`, alerta `paid_after_cancel`, pantalla *Te devolvimos el pago* y el stock no se descuenta dos veces.
- **Webpay no llega a este caso:** si el cron anula el pedido con el cliente en el formulario, el intento queda `failed` y al volver no se hace commit. Una transacción autenticada sin commit queda `INITIALIZED` y no se cobra (pedido 1031).

### D-021 · Cron de vencimiento en Vercel Cron ✅ (dueño, 2026-10-25)
- **Decisión:** `vercel.json` → `/api/cron/expirar-pedidos` cada 10 min (`*/10 * * * *`). Protegido con `Authorization: Bearer ${CRON_SECRET}` (comparación en tiempo constante).
- **Plan de Vercel (2026-10-25): sigue en Hobby** ⚠️. Para el primer despliegue el cron quedó **diario** (`0 9 * * *`, 06:00 de Chile): un pedido abandonado puede tardar hasta un día en vencer. **Al pasar a Pro, volver a `*/10 * * * *` en `vercel.json`.** Antes: *el plan Hobby solo permite crons diarios; si el despliegue queda en Hobby, cambiar a `pg_cron` + `pg_net` llamando a la URL con el secreto, o a un cron externo.* En local se dispara con `curl -H "Authorization: Bearer …"`.

### D-022 · Correos con Resend ✅ (dueño, 2026-10-25) · ✅ llave en local
- **Decisión:** Resend por API REST (sin SDK) en `src/lib/email/send.ts`, dentro de `after()` para no demorar la respuesta. Correos de la fase 6: confirmación del pago, datos para transferir y pago devuelto (B13). Los textos están en `src/lib/email/templates.ts`.
- **Mientras `RESEND_API_KEY` esté vacía**, no se envía nada y queda `[email] Sin RESEND_API_KEY: no se envió …` en el log. Para activarlo: cuenta de Resend, verificar el dominio de `EMAIL_FROM` (DNS) y poner la llave.
- **Activado en local (2026-10-25):** dominio `mail.audazia.dev` verificado (SPF y DKIM con *Connect* de Resend en el DNS de Vercel, DMARC `p=none` en `_dmarc.audazia.dev`), remitente `Almacén <pedidos@mail.audazia.dev>`. Se usa un subdominio para no mezclar la reputación de la tienda con la de `audazia.dev`. Producción: otra llave, en Vercel.

### D-023 · Intentos de pago y plazo al cambiar de medio ✅ (2026-10-25)
- **Decisión:** `start_payment_attempt(order_id, provider)` (solo `service_role`) bloquea el pedido y exige que esté `pending`, sin vencer, sin un pago `paid` y con menos de 10 intentos. Marca `failed` los `pending` anteriores (`raw_response.superseded_by`), crea el intento `<order_number>-<n>` con `amount = orders.total` y cambia `payment_method`. El intento existe **antes** del token de la pasarela: si la pasarela falla, queda `failed` (`shop_reason: gateway_error`) y el usuario va a Pago rechazado con el aviso de conexión (no vuelve al checkout, porque otro *Pagar* crearía un segundo pedido).
- **Plazo (`expires_at`):** transferencia → `placed_at + 48 h`. Webpay/Flow → al menos `now() + 30 min` (para que un reintento a los 25 min no venza en medio del formulario), sin pasar de `placed_at + 48 h`. Al pasar de transferencia a tarjeta, el plazo **no se acorta** (la guía pedía decidirlo): el stock ya estaba reservado 48 h.
- Un intento de Webpay reemplazado no se confirma nunca (sin commit no hay cobro). Uno de Flow sí puede cobrarse, y entonces aplica D-020.

### D-024 · Datos bancarios, invitados y Flow en local ✅ (dueño, 2026-10-25)
- Datos de la transferencia: los **ficticios** del diseño, en variables `BANK_*`, hasta producción. **Actualización (25-10-2026):** el dueño pasó los reales (Itaú, cuenta corriente) y quedaron en `.env.local`; `.env.example` sigue con los de ejemplo.
- Convertir al invitado en cuenta: fase 7 (D-008).
- **Datos de prueba (25-10-2026):** los pedidos 1001–1036, sus pagos y los usuarios de prueba se dejan para la fase 7 y **se borran al subir a producción** (checklist de producción).
- Flow sin túnel en esta fase: se probó con `urlReturn` + `getStatus`, y la confirmación se simuló con un POST local del token. El túnel (o el despliegue) se prueba antes de producción.

### D-025 · Historial del pedido y motivo de anulación ✅ (agente, fase 7.0, 2026-10-25)
- **Historial:** tabla `order_events` (M8) escrita por un trigger sobre `orders` (`placed` y cada cambio de `status`), no por la app: así quedan también los cambios del cron, de las pasarelas (`sync_order_on_payment`) y de `cancel_order`, sin tocar el código de la fase 6. El actor sale de `auth.uid()`; las acciones de administración que necesiten la llave secreta (por ejemplo `settle_payment` para confirmar una transferencia) lo indican con `set_config('shop.actor_id', <admin>, true)` en la misma transacción (7.4). Los eventos sin cambio de estado (correos) los agrega el backend con `kind = 'email'`. El trigger acepta cualquier estado, incluso volver a `pending`: el historial nunca bloquea un cambio de estado.
- **Pedidos anteriores (1001–1036):** no tienen eventos ni se rellenan; su historial se arma con `placed_at`, `paid_at`, `shipped_at`, `delivered_at`, `cancelled_at` y los intentos de pago.
- **Motivo:** `orders.cancel_reason` (`vencio` · `tienda` · `cliente`, los del tweak de `CorreoAnulacion`) + `cancel_note` (texto que ve el cliente). Solo los escribe `cancel_order`, que ahora los recibe; el cliente siempre anula con `cliente`, el cron con `vencio`.
- **Transiciones (`src/lib/orders/order-status.ts`):** `pending → paid` (solo al confirmar una transferencia) · `pending/paid/processing → cancelled` · `paid → processing → shipped → delivered` · `cancelled → refunded` (solo si se cobró). La Server Action las valida; la BD no.
- **`cancelled` o `refunded`:** anulado sin cobro → `cancelled` (*Anulado*). Anulado por la tienda con el reembolso completado → `refunded` (*Reembolsado*). Si el reembolso falla → queda `cancelled` con una alerta `refund_failed`. El 1030 queda como está (*Anulado · pago devuelto*).
- **Fecha estimada de entrega (B25):** no se guarda. `estimatedDelivery()` la calcula desde `paid_at` (o `placed_at`) con los plazos por zona, igual que la Confirmación, que ahora usa la misma función. Sin el *mañana* relativo del checkout.
- **Acceso a `/admin`:** `requireAdmin()` en el layout y las páginas (sin sesión → Ingresar; sin rol → 404, para no revelar que existe) y `getAdminUser()` en **cada** Server Action. No se usa `forbidden()`: es experimental (`authInterrupts`) en Next 16.4.
- **Reseñas:** se publican al instante, como en el diseño. Para ocultar una, mientras no haya administración del catálogo, se hace en Supabase (7.6).
