---
title: "Tablas de usuarios y carro: profiles, addresses, carts, cart_items, wishlist_items"
description: "Columnas y reglas de profiles, addresses, carts, cart_items y wishlist_items, y cómo se relacionan con los campos del checkout y con el carro de Zustand."
keywords: ["profiles", "addresses", "carts", "cart_items", "wishlist_items", "favoritos", "dirección", "comuna", "región", "is_default", "handle_new_user", "role"]
related: ["02-arquitectura/autenticacion-y-autorizacion.md", "02-arquitectura/estado-del-cliente.md", "03-base-de-datos/seguridad-rls.md"]
source: ["03-base-de-datos/sql/ecommerce_schema.sql §3, §5, §10"]
estado: "definido"
---

# Tablas de usuarios y carro

> **Úsalo cuando:** trabajas con la cuenta, las direcciones, el carro en la base de datos o los favoritos.

## `profiles`

Hay una fila por usuario de `auth.users`, que crea el trigger **`handle_new_user`** al registrarse (también crea su `carts`).

| Columna | Notas |
|---|---|
| `id` | = `auth.users.id` (`cascade`) |
| `full_name`, `avatar_url` | Se copian de `raw_user_meta_data` al registrarse. Envía `options.data.full_name` en `signUp` |
| `phone` | |
| `role` | `customer` (por defecto) o `admin`. El trigger `protect_profile_role` impide que un no admin cambie su propio rol |

No tiene columna `rut` ni de suscripción al newsletter (el diseño tiene *Recibir novedades* al crear la cuenta).

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

El **RUT** del checkout no tiene dónde guardarse (ver [brechas](../07-referencia/brechas-diseno-vs-datos.md)).

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

PK (`user_id`, `product_id`). Los favoritos son **por producto**, no por variante. `IconButton` corazón con `pressed`. Solo con sesión: a un invitado se le puede pedir que ingrese, o guardarlo localmente (no está definido).
