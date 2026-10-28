---
title: "Tablas de usuarios y carro: profiles, addresses, carts, cart_items, wishlist_items"
description: "Columnas y reglas de profiles, addresses, carts, cart_items y wishlist_items, y cómo se relacionan con los campos del checkout y con el carro de Zustand."
keywords: ["profiles", "addresses", "carts", "cart_items", "wishlist_items", "favoritos", "dirección", "comuna", "región", "is_default", "handle_new_user", "role"]
related: ["02-arquitectura/autenticacion-y-autorizacion.md", "02-arquitectura/estado-del-cliente.md", "03-base-de-datos/seguridad-rls.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql §3, §5, §10"]
estado: "vigente"
---

# Tablas de usuarios y carro

> **Úsalo cuando:** trabajas con la cuenta, las direcciones, el carro en la base de datos o los favoritos.

## `profiles`

Hay una fila por usuario de `auth.users`, que crea el trigger **`handle_new_user`** al registrarse (también crea su `carts`).

| Columna | Notas |
|---|---|
| `id` | = `auth.users.id` (`cascade`) |
| `full_name`, `avatar_url` | Se copian de `raw_user_meta_data` al registrarse. Envía `options.data.full_name` en `signUp`. `full_name` es *nombre apellido*: lo usan el saludo *Hola, <nombre>* (si no hay `first_name`), la conversión del invitado (destinatario del pedido, D-027) y la 7.6 |
| `first_name`, `last_name` | ✅ M10 (7.5, D-030). Los escribe Datos personales (y a la vez `full_name`). Vacías en las cuentas que nunca guardaron Datos personales: el formulario parte `full_name` (primera palabra = nombre) y el saludo usa la primera palabra de `full_name`. Máx. 80 caracteres |
| `phone` | Celular en E.164 (`+56912345678`, check `profiles_phone_format`, M10). Lo edita Datos personales; el checkout lo precarga si no hay dirección guardada |
| `rut` | ✅ M10, opcional (decisión 7a): `12345678-5` (check `profiles_rut_format`; el dígito verificador lo valida la app con `isValidRut`). Lo edita Datos personales; el checkout lo **precarga** y **no lo escribe** (el RUT del pedido queda en `orders.customer_rut`) |
| `newsletter_opt_in_at` | ✅ M10 (decisión 7b): desde cuándo acepta novedades; vacía = no. Desde un cliente la fecha la pone el trigger `stamp_newsletter_opt_in` (`now()` al activar, se conserva mientras siga activa). Crear cuenta: `handle_new_user` la llena si los metadatos traen `newsletter: true`; la conversión del invitado y *Correos de la tienda* la escriben directo. No se envía nada todavía (7c) |
| `role` | `customer` (por defecto) o `admin`. El cliente no puede actualizar esta columna (grant por columna, M10) y el trigger `protect_profile_role` impide que un no admin la cambie. El rol se cambia con SQL |

**Columnas que puede actualizar un cliente** (`grant update (…) to authenticated`, M10): `full_name`, `first_name`, `last_name`, `phone`, `rut`, `avatar_url`, `newsletter_opt_in_at`. Un `update` que incluya otra columna (`role`, `created_at`) responde *permission denied for table profiles*.

## `addresses`

| Columna | Campo del checkout | Notas |
|---|---|---|
| `user_id` | — | `cascade` |
| `label` | — | "Casa", "Oficina" |
| `recipient_name` | Nombre + Apellido | El diseño los pide por separado; se concatenan |
| `phone` | Teléfono | Formato `+56 9 XXXX XXXX` ([formatos](../05-dominio/formatos-chile.md)) |
| `line1` | Calle y número | El diseño exige el número |
| `line2` | Depto./casa/oficina | Opcional |
| `city` | **Comuna** | Ojo: se llama `city` pero guarda la comuna |
| `region` | Región | |
| `postal_code` | — | No se usa en Chile en la práctica |
| `country` | — | `'CL'` |
| `is_default` | — | Una sola por usuario (índice único parcial + el trigger `ensure_single_default_address`, que desmarca las demás) |

El **RUT** no va en la dirección: el del pedido queda en `orders.customer_rut` y el del cliente, opcional, en `profiles.rut` (7.5).

**Direcciones (7.5, D-030):** `/cuenta/direcciones` agrega, edita, marca como principal (`is_default`) y elimina, con las validaciones del paso Despacho. `label` es libre (máx. 40, opcional; sin él la tarjeta muestra la comuna). Hasta 10 por cliente (en la app). La primera es la principal; si se elimina la principal, la más reciente de las que quedan pasa a serlo. El checkout precarga la principal (o la última); editarla o borrarla no cambia los pedidos (`orders.shipping_address` es una copia).

`place_order` copia la dirección elegida a `orders.shipping_address` (jsonb) con estas claves: `recipient_name`, `phone`, `line1`, `line2`, `city`, `region`, `postal_code`, `country`.

## `carts` y `cart_items`

| Tabla | Columnas clave | Reglas |
|---|---|---|
| `carts` | `user_id` **unique** | Un carro por usuario. Lo crea `handle_new_user` |
| `cart_items` | `cart_id`, `variant_id`, `quantity > 0` | **unique** (`cart_id`, `variant_id`). Usa `upsert` con `onConflict: 'cart_id,variant_id'` |

- No guarda precios: `place_order` los calcula al crear el pedido.
- `place_order` vacía `cart_items` al terminar.
- Relación con el carro de Zustand: [02-arquitectura/estado-del-cliente.md](../02-arquitectura/estado-del-cliente.md#sincronización-con-la-base-de-datos-fase-5).

## `wishlist_items`

PK (`user_id`, `product_id`). Los favoritos son **por producto**, no por variante. `IconButton` corazón con `pressed`. ✅ 7.5 (D-030): solo con cuenta. El corazón de la Ficha y de `ProductCard` lee los favoritos en el navegador después de hidratar (Server Action `getWishlistState`) y guarda o quita con `setWishlisted`; un invitado o alguien sin sesión va a Ingresar con `volver` y `favorito=<id>`, y el producto se guarda al ingresar (B23). `/cuenta/favoritos` lista los productos (catálogo cacheado por ids).
