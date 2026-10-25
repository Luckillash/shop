---
title: "Guía: integrar Supabase en Next.js 16"
description: "Cómo está integrado Supabase: paquetes, variables (publishable y secret key), los clientes público, de usuario y admin, el refresco de la sesión en proxy.ts con getClaims, la aplicación del esquema y la generación de tipos."
keywords: ["supabase", "@supabase/ssr", "@supabase/supabase-js", "createServerClient", "createClient", "proxy.ts", "updateSession", "getClaims", "cookies", "publishable key", "secret key", "service_role", "tipos"]
related: ["02-arquitectura/autenticacion-y-autorizacion.md", "03-base-de-datos/migraciones-y-seed.md", "07-referencia/variables-de-entorno.md"]
source: ["src/lib/supabase/", "src/proxy.ts", "documentación de Supabase (Next.js server-side auth, consultada con el MCP el 2026-10-23)", "node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md"]
estado: "vigente"
---

# Guía: integrar Supabase

> **Úsalo cuando:** vas a usar Supabase desde el código, o a terminar la fase 1 (esquema y tipos).

## Estado

| Paso | Estado |
|---|---|
| Paquetes `@supabase/supabase-js` `^2.118.0` y `@supabase/ssr` `^0.12.7` | ✅ |
| Variables en `.env.local` / `.env.example` | ✅ Las tres, incluida `SUPABASE_SECRET_KEY` (la agregó el usuario; el MCP no puede leerla) |
| Clientes público, de usuario y admin | ✅ `src/lib/supabase/` |
| `src/proxy.ts` (refresco de la sesión) | ✅ Probado con `next start`: 200 en `/`, 404 en rutas inexistentes, cookie inválida sin errores |
| Esquema aplicado en `nswchmyzgcutyehhuche` | ✅ Aplicado por el usuario desde el SQL Editor (23-10-2026). Verificado: 17 tablas con RLS, 29 políticas en `public` + 3 en Storage, 10 funciones, 17 triggers + `on_auth_user_created`, vista, bucket, 5 enums, `pg_trgm` en `extensions` |
| Tipos en `src/types/database.ts` | ✅ Generados con el MCP; los 3 clientes y el proxy usan `<Database>` |
| `/` lee categorías desde Supabase | ✅ `getCategories()` en `src/lib/catalog/queries.ts` (`'use cache'`, `cacheLife('days')`, tag `categories`). `/` se prerenderiza con revalidación de 1 día |
| Seed de Almacén (M6) | ✅ Aplicado y verificado: 4 categorías, 4 marcas, 12 productos, 20 variantes, 12 imágenes 4:5, 2 cupones. `/` muestra Cerámica, Textiles, Velas y aromas, Cocina |
| Advisors | ✅ Sin errores. Solo quedan los avisos aceptados (abajo) |

## Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://nswchmyzgcutyehhuche.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # MCP: get_publishable_keys
SUPABASE_SECRET_KEY=sb_secret_...                         # Dashboard → Project Settings → API Keys
```

- Supabase recomienda las llaves nuevas: **publishable** (`sb_publishable_…`) en vez de la `anon` JWT, y **secret** (`sb_secret_…`) en vez de `service_role`. Las legacy siguen funcionando con el mismo código.
- La secreta salta RLS: solo en el servidor y nunca con `NEXT_PUBLIC_`.

## Archivos

| Archivo | Exporta | Uso |
|---|---|---|
| `src/lib/supabase/config.ts` | `supabaseUrl()`, `supabasePublishableKey()` | Lee las variables y falla con un mensaje claro si faltan (tiene tests) |
| `src/lib/supabase/public.ts` | `createSupabasePublic()` | Rol `anon`, sin cookies. **Para el catálogo dentro de `'use cache'`** |
| `src/lib/supabase/server.ts` | `createSupabaseServer()` (async) | Sesión del usuario por cookies. Server Components, Server Actions y Route Handlers. **No usar en `'use cache'`** |
| `src/lib/supabase/admin.ts` | `createSupabaseAdmin()` | Llave secreta: salta RLS y `auth.uid()` es null. Pasarelas, crons y administración |
| `src/lib/supabase/proxy.ts` | `updateSession(request)` | Refresca el token con `getClaims()` y propaga las cookies al request y a la respuesta |
| `src/proxy.ts` | `proxy`, `config.matcher` | Llama a `updateSession` en todo menos `_next/static`, `_next/image`, `favicon.ico` e imágenes |

Todos son funciones (no instancias creadas al importar), así que un import no falla en el build si falta una variable.

## Reglas de uso

- **Verificar al usuario: `supabase.auth.getClaims()`.** Valida el JWT (localmente con las llaves asimétricas del proyecto). `getUser()` solo si necesitas el registro actualizado del usuario desde el servidor de Auth. **No uses `getSession()`** para decidir permisos.
- En el proxy no se agrega código entre `createServerClient` y `getClaims()` (lo advierte Supabase: puede cerrar sesiones al azar).
- `createSupabaseServer()` en un Server Component no puede escribir cookies; el `try/catch` de `setAll` lo ignora porque el proxy ya refrescó la sesión.
- El proxy no autoriza. Cada página, acción y Route Handler vuelve a verificar con `getClaims()`.

```ts
// Ejemplo: catálogo cacheado (fase 3)
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabasePublic } from "@/lib/supabase/public";

export async function getCategories() {
  "use cache";
  cacheLife("days");
  cacheTag("categories");
  const { data, error } = await createSupabasePublic()
    .from("categories")
    .select("id, name, slug, image_url")
    .order("sort_order");
  if (error) throw error;
  return data;
}
```

## Esquema y advisors

El esquema lo aplicó el usuario desde el SQL Editor, porque `apply_migration` volvía `cancelled` desde Claude Code (ver la trampa 46). También cargó el seed genérico (`ecommerce_seed.sql`).

Resultado de los advisors (23-10-2026), sin errores:

| Tipo | Aviso | Qué se hace |
|---|---|---|
| Seguridad (WARN) | `handle_new_user` y `sync_order_on_payment` (SECURITY DEFINER) se pueden llamar por `/rest/v1/rpc` | Se revoca `EXECUTE` (los triggers no lo necesitan) → ✅ aplicado |
| Seguridad (WARN) | `is_admin` ejecutable por `anon` y `authenticated` | **Se acepta**: las políticas RLS la llaman también para `anon`. Revocarla rompería la lectura del catálogo |
| Seguridad (WARN) | `place_order` y `cancel_order` ejecutables por `authenticated` | **Se acepta**: son la API del checkout y validan dentro |
| Rendimiento (WARN) | Varias políticas permisivas en `SELECT` (6 tablas con "admin gestiona" `FOR ALL` + `addresses`) | Se separan en insert/update/delete → ✅ aplicado |
| Rendimiento (INFO) | 3 claves foráneas sin índice | Índices nuevos → ✅ aplicado |
| Rendimiento (INFO) | 23 índices sin uso | **Se ignora**: la base todavía no tiene tráfico |

Las correcciones se aplicaron el 2026-10-23 y se integraron en `ecommerce_schema.sql`. Al volver a correr `get_advisors` solo quedan los avisos aceptados (`is_admin`, `place_order`, `cancel_order`) y los índices sin uso.

## Tipos

`src/types/database.ts` lo genera el MCP (`generate_typescript_types`). No lo edites a mano: regenéralo después de cada migración que cambie tablas, vistas o funciones. Los clientes ya usan `createClient<Database>` / `createServerClient<Database>`.
