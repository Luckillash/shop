---
title: "Autenticación y autorización (Supabase Auth + RLS)"
description: "Los tres clientes de Supabase (anónimo, usuario, admin), cómo se maneja la sesión con cookies y proxy.ts, roles customer/admin, cómo resolver la compra como invitado y dónde se verifica el permiso."
keywords: ["auth", "autenticación", "autorización", "supabase", "@supabase/ssr", "cookies", "proxy", "service_role", "anon key", "RLS", "admin", "invitado", "anonymous sign-in", "is_admin"]
related: ["03-base-de-datos/seguridad-rls.md", "06-implementacion/integrar-supabase.md", "02-arquitectura/decisiones.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql §3, §9, §10, §11, §13", "_archivo/diseno-almacen.md §4.2, §5.3", "node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md"]
estado: "vigente (fase 5)"
---

# Autenticación y autorización

> **Úsalo cuando:** implementas el login, proteges una ruta o una acción, o decides con qué cliente de Supabase consultar.

## Tres clientes de Supabase

| Cliente | Archivo (✅ implementado) | Llave | Cookies | Úsalo para | Respeta RLS |
|---|---|---|---|---|---|
| **Público** | `src/lib/supabase/public.ts` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No | Leer el catálogo dentro de `'use cache'` | Sí (como `anon`) |
| **Usuario** | `src/lib/supabase/server.ts` (`createSupabaseServer()`: `createServerClient` de `@supabase/ssr` + `await cookies()`) | publishable + JWT del usuario | Sí | Carro, direcciones, `place_order`, pedidos propios, reseñas | Sí (como `authenticated`) |
| **Admin** | `src/lib/supabase/admin.ts` (`server-only`) | `SUPABASE_SECRET_KEY` | No | Registrar pagos, cambiar estados desde las pasarelas, crons | **No**: salta RLS |

Reglas:

- El cliente **admin** solo se usa en Route Handlers de pasarelas, crons y acciones de administración. Nunca con IDs que vengan del cliente sin verificar antes que el pedido pertenece a esa sesión.
- `auth.uid()` es `null` con el cliente admin. Por eso `cancel_order` lo trata como "staff" (ver [03-base-de-datos/funciones-y-triggers.md](../03-base-de-datos/funciones-y-triggers.md)).
- En el navegador, si hace falta (por ejemplo, para el login con OAuth), se usa `createBrowserClient` con la anon key. Toda escritura de negocio pasa por Server Actions.

## Sesión con cookies y `proxy.ts`

- `@supabase/ssr` guarda la sesión en cookies. En Next 16 el refresco del token se hace en **`src/proxy.ts`** (antes `middleware.ts`), con un `matcher` que excluye los assets estáticos.
- El proxy solo hace **chequeos optimistas**: sin cookie de sesión → redirige `/cuenta/*` a `/ingresar`. **No consulta la base de datos** ni decide permisos.
- Cada página y cada Server Action vuelve a verificar al usuario con `supabase.auth.getClaims()`, que valida el JWT. Usa `getUser()` solo si necesitas el registro actualizado desde Auth. No confíes en `getSession()` en el servidor.
- Las páginas que leen la sesión lo hacen dentro de `<Suspense>` (Cache Components). Ver `authentication-with-cache-components.md` en la doc de Next.

## Roles

| Rol | Dónde | Cómo se asigna | Qué puede |
|---|---|---|---|
| `anon` (sin sesión) | Rol de Postgres | — | Leer el catálogo activo, las marcas, las imágenes y las reseñas publicadas |
| `customer` | `profiles.role` (por defecto) | Trigger `handle_new_user` al registrarse | Lo suyo: perfil, direcciones, carro, favoritos, pedidos, pagos (solo lectura), reseñas de productos comprados |
| `admin` | `profiles.role = 'admin'` | A mano en la BD. El trigger `protect_profile_role` impide que un usuario se lo asigne a sí mismo | Todo: catálogo, cupones, inventario, pedidos, pagos, ocultar reseñas, subir imágenes |
| `service_role` | Llave de servicio | — | Salta RLS. Puede ejecutar `place_order` y `cancel_order` |

`public.is_admin()` (`security definer`) es la única forma de comprobar si alguien es admin dentro de las políticas.

## Implementado (fase 5, 2026-10-24)

| Pieza | Archivo |
|---|---|
| `getSessionUser()`: `{ id, email, isAnonymous }` con `getClaims()` | `src/lib/auth/session.ts` |
| `signIn`, `signUp`, `startGuestCheckout`, `signOut` (Server Actions; rate limiting LOGIN, SIGNUP y GUEST por IP). Al entrar, fusionan el carro con `cart_items` | `src/lib/auth/actions.ts` |
| `useAuthAction`: agrega el carro al `FormData`, reemplaza el store con el carro fusionado y navega a `?volver=` | `src/components/auth/use-auth-action.ts` |
| `/ingresar` (Ingresar · Crear cuenta · *Comprar como invitado* si hay productos), `/cuenta` (→ `/cuenta/pedidos` desde la 7.1: Mis pedidos y Detalle; sesión no anónima, el proxy da el código HTTP del Detalle, D-026), `/auth/confirm` (enlace del correo: `token_hash` o `code`) | `src/app/` |
| *¿Olvidaste tu contraseña?*: `/ingresar/recuperar` (`requestPasswordReset`, rate limiting RESET por IP, misma respuesta exista o no la cuenta) → enlace del correo → `/auth/confirm` (sesión de recuperación) → `/ingresar/nueva-contrasena` (`updatePassword`: 8 caracteres, repetida, distinta a la anterior). Enlace vencido o reutilizado → `/ingresar/recuperar?error=enlace` | `src/lib/auth/actions.ts`, `src/components/auth/password-forms.tsx` |

- `createSupabaseServer()` llama a `await connection()` (trampa 58).
- Confirmación de correo **activada** en el proyecto: `signUp` muestra *Revisa tu correo*. `/auth/confirm` ya está en *Redirect URLs* (dueño, 2026-10-24).
- Inicios anónimos **activados** (dueño, 2026-10-24). Un invitado que entra a `/cuenta` va a `/ingresar?volver=/cuenta`.
- `/cuenta` redirige a `/ingresar?volver=/cuenta` sin sesión o con una anónima. El proxy todavía no hace la redirección optimista.
- Pendiente: convertir al invitado en cuenta (Confirmación, fase 6).
- Plantilla recomendada para *Reset password* en Supabase (Authentication → Email Templates), que funciona aunque el enlace se abra en otro navegador: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&volver=/ingresar/nueva-contrasena`. Con la plantilla por defecto (`{{ .ConfirmationURL }}`) también funciona, pero solo en el mismo navegador donde se pidió (PKCE).

## Compra como invitado (D-008 ✅, dueño 2026-10-24)

**Conflicto:** el diseño permite comprar como invitado (*comprar como invitado* en Ingresar). Pero `place_order` exige `auth.uid()` (*Debes iniciar sesión para comprar*) y una dirección en `addresses` del mismo usuario.

**Decisión:** usar los **inicios de sesión anónimos de Supabase** (`supabase.auth.signInAnonymously()`):

1. Al entrar a `/checkout` sin sesión, una Server Action crea una sesión anónima. El trigger `handle_new_user` crea su `profile` y su `cart`.
2. El correo del paso Contacto se guarda en el pedido. **Falta la columna**: ver [brechas](../07-referencia/brechas-diseno-vs-datos.md).
3. La dirección del paso Despacho se inserta en `addresses` del usuario anónimo. `place_order` funciona sin cambios, y RLS protege el pedido.
4. Si después crea una cuenta (con el `Notice` de la Confirmación), se vincula la identidad (`updateUser` con email y contraseña) y conserva sus pedidos.

Requisitos:

- Activar *Anonymous sign-ins* en Supabase Auth.
- Agregar captcha o rate limiting (Redis) a la creación de sesiones anónimas.
- Si un usuario anónimo nunca se convierte, se puede limpiar después de N días, **salvo** que tenga pedidos.
- En las políticas, `auth.jwt() ->> 'is_anonymous'` permite diferenciarlos si hace falta (por ejemplo, que un anónimo no pueda escribir reseñas).

Alternativa descartada por ahora: crear el pedido con el cliente admin desde el servidor. Obligaría a reescribir `place_order`, que depende de `auth.uid()`.

## Checklist por acción

- [ ] La Server Action verifica al usuario con `getClaims()` y falla si no hay sesión.
- [ ] Usa el cliente **usuario** salvo que la operación necesite saltar RLS.
- [ ] Si usa el cliente **admin**, primero verifica que el recurso (por ejemplo, el pedido) pertenece al usuario o que la petición viene de la pasarela o el cron.
- [ ] No acepta del cliente montos, precios, estados ni `user_id`.
