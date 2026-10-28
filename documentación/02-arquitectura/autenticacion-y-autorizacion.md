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
- El proxy hace **chequeos optimistas** y da el código HTTP real, porque las páginas son de prerender parcial y su `redirect()` o `notFound()` salen con 200 (trampa 75). Lógica pura en `src/lib/supabase/proxy-routes.ts` (con tests):
  - **`/cuenta` y todo `/cuenta/*`** (7.8, D-033): sin sesión o con una sesión anónima → **307 a `/ingresar?volver=<ruta y query>`**. Solo usa el JWT que ya validó `getClaims()`: no consulta la BD.
  - **Detalle de pedido** (`/cuenta/pedidos/<n>`, D-026): además busca el pedido; ajeno, inválido o inexistente → 404 (rewrite a `/cuenta/pedido-no-encontrado`).
  - **`/admin/*`** (D-029): además llama `rpc("is_admin")`; sin el rol → 404 (rewrite a `/admin-no-encontrada`).
  - Las cookies refrescadas y su `Cache-Control` van también en el redirect o el 404 (`withSession`). No se agrega código entre `createServerClient` y `getClaims()` (trampa 44).
  - Corre también en los prefetch y las navegaciones: Next 16 le oculta la cabecera `rsc` al proxy (trampa 95).
  - `volver` sale de la URL pedida y Ingresar lo valida con `safeNext` (compara el origen después de parsear; `"/	/otro.cl"` vuelve al inicio).
- Cada página y cada Server Action vuelve a verificar al usuario con `supabase.auth.getClaims()`, que valida el JWT. Usa `getUser()` solo si necesitas el registro actualizado desde Auth. No confíes en `getSession()` en el servidor.
- Las páginas que leen la sesión lo hacen dentro de `<Suspense>` (Cache Components). Ver `authentication-with-cache-components.md` en la doc de Next.

## Roles

| Rol | Dónde | Cómo se asigna | Qué puede |
|---|---|---|---|
| `anon` (sin sesión) | Rol de Postgres | — | Leer el catálogo activo, las marcas, las imágenes y las reseñas publicadas |
| `customer` | `profiles.role` (por defecto) | Trigger `handle_new_user` al registrarse | Lo suyo: perfil, direcciones, carro, favoritos, pedidos, pagos (solo lectura), reseñas de productos comprados |
| `admin` | `profiles.role = 'admin'` | A mano en la BD. El trigger `protect_profile_role` impide que un usuario se lo asigne a sí mismo. Desde el 27-10-2026 (decisión 4 del dueño): `lucassalazarc@outlook.com` y, solo para probar la 7.4, `prueba.fase5@almacen.cl` | Todo: catálogo, cupones, inventario, pedidos, pagos, ocultar reseñas, subir imágenes |
| `service_role` | Llave de servicio | — | Salta RLS. Puede ejecutar `place_order` y `cancel_order` |

`public.is_admin()` (`security definer`) es la única forma de comprobar si alguien es admin dentro de las políticas.

**Administración (7.4, D-029):** `/admin/*` lo protege el proxy en la carga directa (sin sesión → Ingresar, sin rol → 404), `requireAdmin()` en el layout y cada página, y `getAdminUser()` en cada Server Action. Las lecturas van con la sesión del admin (RLS) y las escrituras con funciones `admin_*` (M9, solo `service_role`) que vuelven a comprobar que el id sea admin y lo registran como actor del historial.

## Implementado (fase 5, 2026-10-24)

| Pieza | Archivo |
|---|---|
| `getSessionUser()`: `{ id, email, isAnonymous }` con `getClaims()`. `getPendingEmail()` (correo que un invitado pidió y no confirma, con `getUser()`) y `getAccountView()` (qué ofrece la Confirmación sobre la cuenta), 7.2 | `src/lib/auth/session.ts` |
| `signIn`, `signUp`, `startGuestCheckout`, `signOut` (Server Actions; rate limiting LOGIN, SIGNUP y GUEST por IP). Al entrar, fusionan el carro con `cart_items` | `src/lib/auth/actions.ts` |
| `useAuthAction`: agrega el carro al `FormData`, reemplaza el store con el carro fusionado y navega a `?volver=` | `src/components/auth/use-auth-action.ts` |
| `/ingresar` (Ingresar · Crear cuenta · *Comprar como invitado* si hay productos), `/cuenta` (→ `/cuenta/pedidos` desde la 7.1: Mis pedidos y Detalle; sesión no anónima, el proxy da el código HTTP del Detalle, D-026), `/auth/confirm` (enlace del correo: `token_hash` o `code`) | `src/app/` |
| *¿Olvidaste tu contraseña?*: `/ingresar/recuperar` (`requestPasswordReset`, rate limiting RESET por IP, misma respuesta exista o no la cuenta) → enlace del correo → `/auth/confirm` (sesión de recuperación) → `/ingresar/nueva-contrasena` (`updatePassword`: 8 caracteres, repetida, distinta a la anterior). Enlace vencido o reutilizado → `/ingresar/recuperar?error=enlace` | `src/lib/auth/actions.ts`, `src/components/auth/password-forms.tsx` |

- `createSupabaseServer()` llama a `await connection()` (trampa 58).
- Confirmación de correo **activada** en el proyecto: `signUp` muestra *Revisa tu correo*. `/auth/confirm` ya está en *Redirect URLs* (dueño, 2026-10-24).
- Inicios anónimos **activados** (dueño, 2026-10-24). Un invitado que entra a `/cuenta` va a `/ingresar?volver=/cuenta`.
- `/cuenta` redirige a `/ingresar?volver=/cuenta` sin sesión o con una anónima: desde la 7.8 lo hace el proxy, con 307 (D-033). Las páginas lo vuelven a comprobar.
- ✅ Convertir al invitado en cuenta (7.2, 2026-10-26, D-027): ver abajo.
- ✅ **SMTP propio en Supabase Auth** (dueño, 26-10-2026): Resend, `smtp.resend.com:465`, remitente *Almacén* en `mail.audazia.dev`; límite de envíos de Auth 30 por hora (antes 2). Antes usaba el SMTP por defecto, que solo envía al equipo del proyecto (respondía 429 a cualquier otra dirección). Las plantillas están en español y con el estilo de la tienda desde el 26-10-2026 (`supabase/templates/`, con enlaces `token_hash`).
- ✅ **Plantillas de los correos en español** (`supabase/templates/`, pegadas por el dueño el 26-10-2026): enlaces a `/auth/confirm` con `token_hash`, que funcionan aunque el correo se abra en otro navegador. Las de Crear cuenta, contraseña nueva y cambio de correo usan `{{ .RedirectTo }}` (que arma `confirmUrl` con `?volver=`); verificadas con correos reales y el enlace abierto en otro navegador. Las plantillas por defecto (`{{ .ConfirmationURL }}`, PKCE) solo funcionaban en el mismo navegador.

## Compra como invitado (D-008 ✅, dueño 2026-10-24)

**Conflicto:** el diseño permite comprar como invitado (*comprar como invitado* en Ingresar). Pero `place_order` exige `auth.uid()` (*Debes iniciar sesión para comprar*) y una dirección en `addresses` del mismo usuario.

**Decisión:** usar los **inicios de sesión anónimos de Supabase** (`supabase.auth.signInAnonymously()`):

1. Al entrar a `/checkout` sin sesión, una Server Action crea una sesión anónima. El trigger `handle_new_user` crea su `profile` y su `cart`.
2. El correo del paso Contacto se guarda en el pedido. **Falta la columna**: ver [brechas](../07-referencia/brechas-diseno-vs-datos.md).
3. La dirección del paso Despacho se inserta en `addresses` del usuario anónimo. `place_order` funciona sin cambios, y RLS protege el pedido.
4. Si después crea una cuenta (con el aviso de la Confirmación), se vincula la identidad (`updateUser` con email y contraseña) y conserva sus pedidos. ✅ 7.2 (D-027):
   - `createGuestAccount` (Server Action): `getClaims()` con `is_anonymous`, pedido propio (`user_id`) y pagado, rate limiting `SIGNUP` por IP. El correo es `orders.contact_email`; del formulario solo se leen la contraseña (8 caracteres) y *Recibir novedades* (`user_metadata.newsletter`, decisión 7b ⏳).
   - Una sola llamada `updateUser({ email, password, data: { full_name, newsletter } }, { emailRedirectTo: /auth/confirm?volver=/cuenta/pedidos })`: Auth no acepta la contraseña de un anónimo sin correo, pero sí las dos juntas. Guarda la contraseña y envía el correo de confirmación; **hasta abrirlo, el usuario sigue siendo anónimo**. `profiles.full_name` = destinatario del pedido (si estaba vacío).
   - `email_exists` → aviso *Ya hay una cuenta con …* + *Ingresar*; no se fusionan pedidos.
   - Al abrir el enlace, `/auth/confirm` crea la sesión (ya no anónima, mismo `user_id`) y lleva a Mis pedidos.

Requisitos:

- Activar *Anonymous sign-ins* en Supabase Auth.
- Agregar captcha o rate limiting (Redis) a la creación de sesiones anónimas.
- ✅ Limpieza de anónimos (7.8, D-033, M13): el cron diario borra los invitados sin pedidos (ni registros históricos), sin correo y con **30 días sin actividad** (creación, último ingreso o último refresco de sesión), hasta 500 por ejecución, con `delete_stale_anonymous_users` (solo `service_role`). **Solo borra con `ANON_CLEANUP_ENABLED=true`**; sin la variable, solo cuenta.
- En las políticas, `auth.jwt() ->> 'is_anonymous'` permite diferenciarlos si hace falta (por ejemplo, que un anónimo no pueda escribir reseñas).

Alternativa descartada por ahora: crear el pedido con el cliente admin desde el servidor. Obligaría a reescribir `place_order`, que depende de `auth.uid()`.

## Cuenta: Direcciones, Favoritos y Datos personales (7.5, D-030)

- **Server Actions** (`src/lib/account/actions.ts`, `src/lib/wishlist/actions.ts`): `accountClient()` (`src/lib/wishlist/server.ts`) verifica con `getClaims()` una sesión **no anónima** y devuelve el cliente del usuario; cada consulta filtra además por `user_id` (el RLS de un admin deja ver las filas de todos). Sin la llave secreta.
- **`profiles`**: el cliente solo puede actualizar las columnas editables (grant por columna, M10); `role` se cambia con SQL. `newsletter_opt_in_at` la fecha la pone la BD.
- **Contraseña desde Datos personales:** `updateUser({ password })` con la sesión actual + `signOut({ scope: 'others' })`; rate limiting por usuario. Sin *Secure password change* no pide la contraseña actual (recomendación en T12). Las otras sesiones caen al renovar su token (trampa 86).
- **Favoritos:** solo con cuenta. Un invitado o alguien sin sesión va a `/ingresar?volver=…&favorito=<id>`; `signIn` guarda el producto pendiente (B23).

## Checklist por acción

- [ ] La Server Action verifica al usuario con `getClaims()` y falla si no hay sesión.
- [ ] Usa el cliente **usuario** salvo que la operación necesite saltar RLS.
- [ ] Si usa el cliente **admin**, primero verifica que el recurso (por ejemplo, el pedido) pertenece al usuario o que la petición viene de la pasarela o el cron.
- [ ] No acepta del cliente montos, precios, estados ni `user_id`.
