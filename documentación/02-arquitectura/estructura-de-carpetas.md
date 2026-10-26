---
title: "Estructura de carpetas: actual y objetivo"
description: "Árbol actual del repositorio y la estructura propuesta para src/ (rutas, componentes, lib por dominio, store), con la regla de dónde va cada tipo de archivo."
keywords: ["estructura", "carpetas", "src", "app", "components", "lib", "store", "route groups", "árbol", "dónde va"]
related: ["02-arquitectura/rutas-y-paginas.md", "01-fundamentos/convenciones-de-codigo.md", "06-implementacion/portar-design-system.md"]
source: ["listado del repositorio (2026-10-23)", "tsconfig.json"]
estado: "actual: vigente · objetivo: propuesta"
---

# Estructura de carpetas

> **Úsalo cuando:** vas a crear un archivo nuevo y no sabes dónde va, o buscas dónde está algo.

## Actual

```
shop/
├── AGENTS.md                 ← lo regenera `next dev`. Pide leer node_modules/next/dist/docs
├── .mcp.json                 ← servidores MCP: supabase, vercel, github, flow, transbank
├── .env.example · .env.local ← Redis y Supabase (.gitignore ignora `.env*` salvo `.env.example`)
├── next.config.ts            ← cacheComponents + partialPrefetching
├── vitest.config.mts         ← tests: jsdom, React, alias @/ nativo, setup en src/test/setup.ts
├── documentación/            ← esta documentación
├── public/                   ← vacío
└── src/
    ├── app/
    │   ├── layout.tsx            ← <html lang="es-CL">, metadata, fuentes
    │   ├── globals.css           ← tokens del design system (claro y oscuro) + estilos base + .sr-only
    │   ├── not-found.tsx         ← 404 de URL sin ruta (con header y footer)
    │   ├── (tienda)/             ← header y footer completos
    │   │   ├── layout.tsx
    │   │   ├── page.tsx          ← Inicio
    │   │   ├── not-found.tsx     ← 404 de notFound() dentro de la tienda
    │   │   ├── categorias/[slug]/page.tsx · novedades/page.tsx · ofertas/page.tsx  ← Listado
    │   │   ├── productos/[slug]/page.tsx   ← Ficha
    │   │   ├── buscar/page.tsx   ← Búsqueda y Sin resultados
    │   │   ├── carro/page.tsx    ← Carro y Carro vacío (estática; el carro está en el cliente)
    │   │   ├── ingresar/page.tsx ← Ingresar o crear cuenta (+ comprar como invitado)
    │   │   ├── ingresar/recuperar/ · ingresar/nueva-contrasena/  ← ¿Olvidaste tu contraseña?
    │   │   ├── cuenta/page.tsx   ← provisoria: correo y Cerrar sesión (fase 7: Mis pedidos)
    │   │   └── diseno/page.tsx   ← catálogo de componentes, solo en desarrollo (404 en producción)
    │   ├── (checkout)/
    │   │   ├── layout.tsx        ← header y footer reducidos
    │   │   ├── checkout/page.tsx ← acceso sin sesión o los 3 pasos (Contacto, Despacho, Pago)
    │   │   ├── pedido/[id]/page.tsx  ← Confirmación · confirmando · vencido · reembolsado
    │   │   ├── pedido/[id]/pago-rechazado/page.tsx · pedido/[id]/transferencia/page.tsx
    │   │   └── pedido/no-encontrado/page.tsx
    │   ├── auth/confirm/route.ts ← enlace de confirmación del correo
    │   └── api/
    │       ├── health/route.ts   ← GET: PING a Redis
    │       ├── pagos/webpay/retorno/route.ts · pagos/flow/{confirmacion,retorno,reembolso}/route.ts
    │       └── cron/expirar-pedidos/route.ts  ← Vercel Cron (vercel.json)
    ├── components/
    │   ├── ui/                   ← los 15 componentes del design system + Select (+ *.test.tsx)
    │   ├── layout/               ← header, cart-link, footer, checkout-header, checkout-footer
    │   ├── catalog/              ← tarjeta, grilla, migas, listado y filtros, galería, compra, entrega (+ fecha por comuna y selector, B35), buscador, 404
    │   ├── cart/                 ← drawer, lista con Deshacer, vista del carro, cupón, useHydrated
    │   ├── checkout/             ← CheckoutView, pasos, resumen, acceso, piezas (indicador, errores, opciones)
    │   ├── payment/              ← WebpayRedirect (form POST token_ws), RetryPayment / PayWithCardInstead, TransferDetails (Copiar), PaymentPending (consulta), PaymentSettled (vacía el carro), OrderAside
    │   └── auth/                 ← formularios de Ingresar/Crear cuenta y de contraseña, useAuthAction, Cerrar sesión
    ├── lib/
    │   ├── catalog/              ← queries.ts ('use cache') · listing.ts · variants.ts · mappers.ts (+ *.test.ts)
    │   ├── cart/                 ← actions.ts (refreshCart, applyCoupon, syncCart) · server.ts (syncUserCart, server-only) · merge · totals · reconcile · snapshot · coupon (+ *.test.ts)
    │   ├── checkout/             ← actions.ts (saveContact, saveShipping, placeOrder) · validation · shipping · order-errors · defaults · delivery-commune (cookie de la comuna) (+ *.test.ts)
    │   ├── auth/                 ← actions.ts (signIn, signUp, startGuestCheckout, signOut, requestPasswordReset, updatePassword) · session.ts · validation (+ *.test.ts)
    │   ├── chile/                ← regions.ts (16 regiones, 346 comunas) · business-days.ts (feriados, días hábiles) (+ *.test.ts)
    │   ├── format/               ← clp.ts · rut.ts · phone.ts · dates.ts (+ *.test.ts)
    │   ├── supabase/             ← config.ts · public.ts (anon) · server.ts (usuario) · admin.ts (secreta) · proxy.ts (updateSession)
    │   ├── payments/             ← webpay.ts · flow.ts (HTTP, server-only) · webpay-core / flow-core (puro) · service.ts (intentos, conciliación, B13) · start.ts · actions.ts (retryPayment, checkPayment) · expire.ts (cron) · lock.ts · labels.ts · screen.ts · order-view.ts · config.ts (+ *.test.ts)
    │   ├── email/                ← send.ts (Resend, server-only) · templates.ts (+ *.test.ts)
    │   ├── store.ts              ← STORE: nombre, razón social, RUT, correo, umbral de despacho gratis, retiro en tienda
    │   ├── rate-limit.ts         ← rate limiting en Redis (ventana fija, fail-open)
    │   └── redis.ts              ← getRedis(): conexión única (globalThis)
    ├── proxy.ts                  ← refresca la sesión de Supabase (getClaims)
    ├── store/                    ← cart-store.ts (useCartStore, persist "cart" v1) · cart-ui-store.ts (drawer, Deshacer) · payment-ui-store.ts (pagando: *Volver al carro* sin enlace)
    ├── test/setup.ts             ← cleanup de Testing Library
    └── types/database.ts         ← generado por el MCP de Supabase
```

## Objetivo (propuesta)

```
src/
├── proxy.ts                         ← refresca la sesión de Supabase (Next 16: no es middleware.ts)
├── app/
│   ├── layout.tsx                   ← <html lang="es-CL">, fuentes, tokens
│   ├── globals.css                  ← tokens del design system como variables CSS
│   ├── not-found.tsx                ← template 404
│   ├── (tienda)/                    ← header y footer completos
│   │   ├── layout.tsx
│   │   ├── page.tsx                 ← Inicio
│   │   ├── categorias/[slug]/page.tsx
│   │   ├── buscar/page.tsx
│   │   ├── productos/[slug]/page.tsx
│   │   ├── carro/page.tsx
│   │   ├── ingresar/page.tsx
│   │   ├── cuenta/…                 ← pedidos, direcciones, favoritos, datos
│   │   └── ayuda/[slug]/page.tsx
│   ├── (checkout)/                  ← header y footer reducidos
│   │   ├── layout.tsx
│   │   ├── checkout/page.tsx
│   │   └── pedido/[id]/…            ← confirmación, rechazo, transferencia
│   └── api/
│       ├── health/route.ts
│       ├── pagos/webpay/retorno/route.ts      ← GET y POST
│       ├── pagos/flow/confirmacion/route.ts   ← POST servidor a servidor
│       ├── pagos/flow/retorno/route.ts        ← POST desde el navegador
│       └── cron/expirar-pedidos/route.ts
├── components/
│   ├── ui/                          ← port del design system: Button, Price, Notice, TextField, Select…
│   ├── layout/                      ← Header, Footer, CheckoutHeader
│   └── <dominio>/                   ← product/, cart/, checkout/, account/
├── lib/
│   ├── redis.ts
│   ├── supabase/                    ← public.ts (anon) · server.ts (usuario) · admin.ts (service_role)
│   ├── catalog/                     ← queries.ts ('use cache') · types.ts
│   ├── cart/                        ← actions.ts (refresh, cupón; syncCart en la fase 5)
│   ├── checkout/                    ← actions.ts (place_order + iniciar pago) · shipping.ts
│   ├── payments/                    ← ✅ webpay.ts · flow.ts (HTTP) · *-core.ts (puro) · service.ts · start.ts · actions.ts · expire.ts · lock.ts · labels.ts · screen.ts · order-view.ts · config.ts
│   ├── email/                       ← ✅ send.ts (Resend) · templates.ts
│   ├── orders/                      ← ✅ order-status.ts (estados, transiciones, entrega estimada) · queries.ts · actions.ts
│   └── format/                      ← clp.ts · rut.ts · phone.ts · dates.ts
├── store/
│   └── cart-store.ts
└── types/
    └── database.ts                  ← tipos generados desde Supabase
```

## Dónde va cada cosa

| Si vas a crear… | Va en | Regla |
|---|---|---|
| Una página o un layout | `src/app/(grupo)/…/page.tsx` | Server Component por defecto |
| Un componente visual reutilizable del design system | `src/components/ui/` | Sin acceso a datos. Props tipadas como en [04-diseno/componentes.md](../04-diseno/componentes.md) |
| Un componente que solo usa un dominio | `src/components/<dominio>/` | Puede ser Server o Client Component |
| Una consulta de lectura | `src/lib/<dominio>/queries.ts` | `import "server-only"`. Cachea con `'use cache'` si no depende del usuario |
| Una mutación | `src/lib/<dominio>/actions.ts` (`"use server"`) | Verifica la sesión dentro de la acción |
| Una llamada a una pasarela | `src/lib/payments/` | `server-only`. Credenciales desde variables de entorno |
| Un endpoint que llama un tercero | `src/app/api/…/route.ts` | Valida el origen (token o secreto del cron) |
| Una función pura de formato o validación | `src/lib/format/` | Sin `server-only`, porque la usa el cliente también |
| Estado global del cliente | `src/store/` | Solo lo que necesita persistir o compartirse entre islas |
| Un test unitario | Junto al archivo: `<nombre>.test.ts(x)` | Vitest. Los Server Components `async` se prueban con E2E |
| SQL nuevo (migración) | `documentación/03-base-de-datos/sql/` | Ver [03-base-de-datos/migraciones-y-seed.md](../03-base-de-datos/migraciones-y-seed.md) |

> Los grupos `(tienda)` y `(checkout)` no cambian la URL. Solo permiten layouts distintos: el checkout lleva header y footer reducidos (ver [04-diseno/templates.md](../04-diseno/templates.md)).
