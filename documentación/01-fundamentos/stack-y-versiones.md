---
title: "Stack, versiones y diferencias de Next.js 16"
description: "Versiones exactas del stack y los cambios de Next.js 16.4 que contradicen lo que un modelo suele saber: proxy, Cache Components, APIs async, revalidateTag con dos argumentos, updateTag y refresh."
keywords: ["next 16", "react 19", "cacheComponents", "partialPrefetching", "proxy", "middleware", "use cache", "cacheLife", "cacheTag", "revalidateTag", "updateTag", "refresh", "connection", "turbopack", "PageProps", "LayoutProps"]
related: ["02-arquitectura/renderizado-y-cache.md", "01-fundamentos/convenciones-de-codigo.md", "07-referencia/trampas-conocidas.md"]
source: ["package.json", "next.config.ts", "AGENTS.md", "node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md", "node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md"]
estado: "vigente"
---

# Stack, versiones y diferencias de Next.js 16

> **Úsalo cuando:** vas a escribir código de Next.js o React en este proyecto. Lo que sabes de Next.js 13–15 puede estar desactualizado.

## Stack

| Capa | Tecnología | Versión (`package.json`) |
|---|---|---|
| Framework | Next.js, App Router, Turbopack | `16.4.2` |
| UI | React / React DOM | `19.3.0` |
| Lenguaje | TypeScript (`strict: true`) | `^5` |
| Estado del cliente | Zustand (+ `persist`) | `^5.0.16` |
| Caché y datos rápidos | `redis` (cliente oficial de Node) | `^6.3.0` |
| Protección de módulos de servidor | `server-only` | `^0.0.1` |
| Linter | ESLint 9 (flat config) + `eslint-config-next` | `^9` / `16.4.2` |
| Tests | Vitest + `@vitejs/plugin-react` + jsdom + Testing Library | `^5.0.5` / `^6.1.2` / `^30.1.3` / `@testing-library/react ^16.3.3` |
| Tipos de Node | `@types/node` (alineado con el runtime Node 24; Vitest 5 no acepta `^20`) | `^24` |
| Estilos | CSS Modules + `src/app/globals.css` (**sin Tailwind**) | — |
| Base de datos | Supabase: PostgreSQL 17, Auth y Storage (proyecto `nswchmyzgcutyehhuche`) | `@supabase/supabase-js ^2.118.0` · `@supabase/ssr ^0.12.7` |
| Runtime | Node.js / npm | 24.21.0 / 11.19.0 |

`next.config.ts` activa **`cacheComponents: true`** y **`partialPrefetching: true`**.

## Regla obligatoria

Antes de escribir código de Next.js, lee la guía correspondiente en `node_modules/next/dist/docs/` (lo exige `AGENTS.md`). Estas son las más útiles:

| Tema | Archivo en `node_modules/next/dist/docs/01-app/` |
|---|---|
| Caché con Cache Components | `01-getting-started/08-caching.md` |
| Revalidación (`cacheTag`, `revalidateTag`, `updateTag`) | `01-getting-started/09-revalidating.md` |
| Server Actions y formularios | `01-getting-started/07-mutating-data.md`, `02-guides/forms.md` |
| Route Handlers | `01-getting-started/15-route-handlers.md` |
| Proxy (antes Middleware) | `01-getting-started/16-proxy.md` |
| Autenticación con Cache Components | `02-guides/authentication-with-cache-components.md` |
| Seguridad de datos | `02-guides/data-security.md` |
| Cambios de la versión 16 | `02-guides/upgrading/version-16.md` |
| Directivas `use cache`, `use cache: private`, `use cache: remote` | `03-api-reference/01-directives/` |

## Lo que cambió (y suele romper el código generado)

| Antes (Next 13–15) | Ahora (Next 16.4, este proyecto) |
|---|---|
| `middleware.ts` | **`proxy.ts`** (en `src/`, junto a `app/`), con `export function proxy(request)`. Sirve para chequeos optimistas, **no** para autorizar. |
| `export const dynamic = 'force-dynamic'`, `revalidate = 60` | Con `cacheComponents`, todo es dinámico salvo lo que marques con **`'use cache'`** + **`cacheLife(...)`**. Los datos sin caché y las APIs de request van dentro de **`<Suspense>`**. |
| `unstable_cache`, `unstable_cacheLife`, `unstable_cacheTag` | `'use cache'`, `cacheLife` y `cacheTag` de `next/cache` (estables) |
| `revalidateTag('tag')` | **`revalidateTag('tag', 'max')`**: el segundo argumento es obligatorio. La forma de un argumento está deprecada. |
| — | **`updateTag('tag')`**: expira y refresca en el mismo request (leer lo que uno mismo escribió). **Solo funciona en Server Actions.** |
| `router.refresh()` desde el cliente | **`refresh()`** de `next/cache`, dentro de una Server Action |
| `cookies()`, `headers()`, `params`, `searchParams` síncronos | **Todos son async**: `await cookies()`, `const { slug } = await params` |
| `cookies()` dentro de una función cacheada | Lanza un error. Lee el valor fuera y pásalo como argumento, o usa **`'use cache: private'`** |
| Para forzar que una ruta sea dinámica | `await connection()` de `next/server` (ver `src/app/api/health/route.ts`) |
| Tipos de props escritos a mano | Helpers globales **`PageProps<'/ruta/[slug]'>`** y **`LayoutProps<'/'>`** (se generan con `next dev`/`build`) |
| `next lint` | Eliminado. Se usa `npm run lint`, que ejecuta `eslint` |
| Webpack por defecto | Turbopack por defecto en `dev` y `build` |
| Route Handler `GET` siempre dinámico | Con Cache Components, un `GET` se prerenderiza si no lee el request ni datos sin caché |

### Ejemplo de referencia: datos de catálogo cacheados

```ts
// src/lib/catalog/queries.ts
import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product:${slug}`);
  // ...consulta a Supabase con el cliente anónimo (sin cookies)
}
```

Ver [02-arquitectura/renderizado-y-cache.md](../02-arquitectura/renderizado-y-cache.md) para saber qué se cachea, con qué tags y quién los invalida.
