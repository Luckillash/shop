---
title: "Arquitectura: componentes y responsabilidades"
description: "Diagrama de la arquitectura (navegador, Next.js, Supabase, Redis, Webpay, Flow), qué hace cada pieza, dónde vive la lógica de negocio y el recorrido de una compra de punta a punta."
keywords: ["arquitectura", "diagrama", "server components", "server actions", "route handlers", "supabase", "redis", "webpay", "flow", "responsabilidades", "fuente de verdad"]
related: ["02-arquitectura/estructura-de-carpetas.md", "02-arquitectura/renderizado-y-cache.md", "02-arquitectura/autenticacion-y-autorizacion.md", "05-dominio/ciclo-de-vida-del-pedido.md"]
source: ["src/", "03-base-de-datos/sql/ecommerce_schema.sql", "_archivo/diseno-almacen.md §5-§6"]
estado: "propuesta (parcialmente implementada)"
---

# Arquitectura: componentes y responsabilidades

> **Úsalo cuando:** necesitas decidir dónde va una pieza de lógica (cliente, servidor, base de datos o pasarela) o entender cómo se comunican las partes.

Hoy solo existen Redis, el carro en Zustand y `/api/health`. El resto del diagrama es la arquitectura objetivo, que se desprende del esquema SQL y del diseño.

## Diagrama

```
┌──────────────────────────── Navegador ─────────────────────────────┐
│  HTML/RSC de Next.js · islas "use client" (drawer, stepper, forms)  │
│  Zustand: carro en localStorage ("cart")                            │
└───────┬──────────────────────────────▲──────────────┬───────────────┘
        │ navegación / Server Actions   │ redirección  │ formulario POST
        ▼                               │              ▼
┌──────────────────── Next.js 16 (servidor Node) ───────────────┐   ┌──────────────┐
│ proxy.ts ─ refresca la sesión de Supabase (chequeo optimista) │   │ Webpay Plus  │
│ Server Components ─ leen catálogo ('use cache' + tags)        │   │ (Transbank)  │
│ Server Actions ─ carro, cupón, checkout, crear pago           │──►│ create/commit│
│ Route Handlers ─ retorno Webpay · confirmación/retorno Flow   │◄──│  /status     │
│                   · cron de expiración · /api/health          │   └──────────────┘
│ src/lib/supabase/* (anon · usuario · admin)                   │   ┌──────────────┐
│ src/lib/payments/* (webpay · flow) · src/lib/redis.ts         │──►│ Flow         │
└──────┬─────────────────────────────────┬──────────────────────┘◄──│ urlConfirm.  │
       │ PostgREST / RPC / Auth           │ TCP                      └──────────────┘
       ▼                                  ▼
┌──────────── Supabase ────────────┐   ┌──────── Redis ────────┐
│ Postgres: tablas + RLS + RPC     │   │ locks de idempotencia │
│  place_order · cancel_order      │   │ rate limiting         │
│ Auth: usuarios (+ anónimos)      │   │ (uso por definir)     │
│ Storage: bucket product-images   │   └───────────────────────┘
└──────────────────────────────────┘
```

## Responsabilidades

| Pieza | Es responsable de | No debe |
|---|---|---|
| **Navegador / Zustand** | Mostrar el carro sin esperar al servidor y recordar la selección entre visitas | Calcular totales finales, decidir el stock o el precio, tocar las pasarelas |
| **Server Components** | Leer y renderizar el catálogo, los pedidos y la cuenta | Mutar datos |
| **Server Actions** | Mutaciones iniciadas por el usuario: sincronizar el carro, aplicar un cupón, crear el pedido, iniciar un pago | Confiar en precios o montos que mande el cliente |
| **Route Handlers** | Entradas externas: el retorno de Webpay (GET o POST), la confirmación y el retorno de Flow, los crons, el health check | Renderizar UI |
| **`proxy.ts`** | Refrescar la cookie de sesión de Supabase y redirigir de forma optimista (por ejemplo, `/cuenta` sin sesión → `/ingresar`) | Autorizar el acceso a datos o consultar la base de datos |
| **PostgreSQL (RPC + triggers)** | **Fuente de verdad** de stock, precios, cupones y estados. `place_order` es atómica: valida, crea el pedido, descuenta el stock y vacía el carro | — |
| **RLS** | Aislar los datos por usuario y dejar la escritura del catálogo solo a `admin` | — |
| **`service_role` (cliente admin)** | Registrar pagos, cambiar estados desde las pasarelas, correr crons | Usarse con datos que mande el usuario sin validarlos, o importarse en el cliente |
| **Redis** | Locks cortos (por ejemplo, para no hacer dos veces el commit del mismo token) y rate limiting | Ser la fuente de verdad de pedidos o stock |
| **Webpay / Flow** | Cobrar | Avisar por webhook en Webpay: **no existe**. El retorno llega por el navegador |

## Dónde vive cada regla de negocio

| Regla | Lugar |
|---|---|
| Precio unitario (`coalesce(variant.price, product.base_price)`) | SQL: `place_order`, vista `product_catalog` |
| Stock suficiente y sin sobreventa (`for update`) | SQL: `place_order` |
| Validez y límites de un cupón | SQL: `place_order` (falta una función de validación previa, ver [brechas](../07-referencia/brechas-diseno-vs-datos.md)) |
| Costo de despacho | **Pendiente.** `place_order` lo deja en `0` ([05-dominio/reglas-de-negocio.md](../05-dominio/reglas-de-negocio.md)) |
| Pedido `pending` → `paid` cuando se registra un pago `paid` | SQL: trigger `sync_order_on_payment` |
| Aprobación de Webpay (`response_code == 0` y `status == AUTHORIZED`) | Servidor: `src/lib/payments/webpay.ts` |
| Estado de Flow (1/2/3/4 → estado de `payments`) | Servidor: `src/lib/payments/flow.ts` |
| Vencimiento de la reserva (48 h por transferencia) | **Pendiente**: cron + `cancel_order` |
| Formato de CLP, RUT y fechas | Compartido: `src/lib/format/` |

## Recorrido de una compra

1. **Catálogo:** un Server Component lee `product_catalog` con `'use cache'` (sin cookies).
2. **Agregar al carro:** el cliente actualiza Zustand de inmediato. Si hay sesión, una Server Action sincroniza `cart_items`.
3. **Checkout:** `/checkout` requiere sesión. Un invitado obtiene una sesión **anónima** de Supabase (decisión propuesta D-008). Se guarda la dirección en `addresses`.
4. **Crear el pedido:** una Server Action sincroniza el carro y llama a `rpc('place_order', …)` con el cliente del usuario. Devuelve `order_id`, con el pedido en `pending` y el stock ya descontado.
5. **Iniciar el pago:** la misma acción crea la fila `payments` (`pending`) y llama a Webpay `create` o a Flow `payment/create`. Luego redirige.
6. **Resultado:**
   - Webpay: el navegador vuelve al Route Handler de retorno → `commit` → se actualiza `payments` → se redirige a Confirmación o a Pago rechazado.
   - Flow: llega el POST de `urlConfirmation` (servidor a servidor) → `getStatus` → se actualiza `payments`. El navegador vuelve a `urlReturn` → se muestra el estado.
   - Transferencia: el pedido queda `pending` con fecha límite. Un admin registra el pago, o el cron lo anula.
7. **Pagado:** el trigger pasa el pedido a `paid` y se ve en *Mis pedidos*.

Detalle de los estados en [05-dominio/ciclo-de-vida-del-pedido.md](../05-dominio/ciclo-de-vida-del-pedido.md).
