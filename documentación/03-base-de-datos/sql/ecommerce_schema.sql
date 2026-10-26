-- =====================================================================
--  E-COMMERCE · Esquema para Supabase (PostgreSQL 15+)
--  Ejecutar completo en: Supabase Dashboard → SQL Editor → Run
--  Incluye: tablas, índices, triggers, RLS, funciones de checkout,
--           vista de catálogo y bucket de Storage para imágenes.
--  Idempotente: se puede volver a ejecutar sobre una base que ya lo tiene.
--  Incluye las correcciones de los advisors de Supabase del 2026-10-23
--  (permisos de funciones de trigger, índices de FK y políticas sin solapes).
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- 1. TIPOS
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role        as enum ('customer', 'admin');
  create type public.order_status     as enum ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
  create type public.payment_status   as enum ('pending', 'authorized', 'paid', 'failed', 'refunded');
  create type public.discount_type    as enum ('percentage', 'fixed');
  create type public.inventory_reason as enum ('restock', 'sale', 'return', 'cancellation', 'adjustment');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. UTILIDADES
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 3. USUARIOS
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  label           text,                         -- "Casa", "Oficina"
  recipient_name  text not null,
  phone           text,
  line1           text not null,
  line2           text,
  city            text not null,                -- comuna / ciudad
  region          text,
  postal_code     text,
  country         char(2) not null default 'CL',
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists addresses_user_id_idx on public.addresses (user_id);
create unique index if not exists addresses_one_default_per_user
  on public.addresses (user_id) where is_default;

-- ---------------------------------------------------------------------
-- 4. CATÁLOGO
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  parent_id    uuid references public.categories (id) on delete set null,
  name         text not null,
  slug         text not null unique,
  description  text,
  image_url    text,
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists categories_parent_id_idx on public.categories (parent_id);

create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid references public.categories (id) on delete set null,
  brand_id          uuid references public.brands (id) on delete set null,
  name              text not null,
  slug              text not null unique,
  description       text,
  base_price        numeric(12,2) not null check (base_price >= 0),
  compare_at_price  numeric(12,2) check (compare_at_price >= 0),   -- precio "antes" para ofertas
  currency          char(3) not null default 'CLP',
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  metadata          jsonb not null default '{}'::jsonb,
  search_vector     tsvector generated always as (
                      setweight(to_tsvector('spanish', coalesce(name, '')), 'A') ||
                      setweight(to_tsvector('spanish', coalesce(description, '')), 'B')
                    ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_brand_id_idx    on public.products (brand_id);
create index if not exists products_search_idx      on public.products using gin (search_vector);
create index if not exists products_name_trgm_idx   on public.products using gin (name extensions.gin_trgm_ops);

-- Cada producto se vende a través de variantes (talla, color, etc.).
-- Un producto sin opciones tiene una sola variante "Única".
create table if not exists public.product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  sku           text not null unique,
  name          text not null default 'Única',
  attributes    jsonb not null default '{}'::jsonb,       -- {"talla":"M","color":"Negro"}
  price         numeric(12,2) check (price >= 0),        -- null = usa base_price del producto
  stock         int not null default 0 check (stock >= 0),
  weight_grams  int check (weight_grams >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  variant_id  uuid references public.product_variants (id) on delete set null,
  url         text not null,
  alt         text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists product_images_product_id_idx on public.product_images (product_id, sort_order);
create index if not exists product_images_variant_id_idx on public.product_images (variant_id);

create table if not exists public.inventory_movements (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  quantity    int not null check (quantity <> 0),          -- positivo entra, negativo sale
  reason      public.inventory_reason not null,
  order_id    uuid,                                        -- FK se agrega tras crear orders
  note        text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists inventory_movements_variant_id_idx on public.inventory_movements (variant_id);
create index if not exists inventory_movements_created_by_idx on public.inventory_movements (created_by);

-- ---------------------------------------------------------------------
-- 5. CARRITO Y FAVORITOS
-- ---------------------------------------------------------------------
create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts (id) on delete cascade,
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  quantity    int not null check (quantity > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cart_id, variant_id)
);
create index if not exists cart_items_variant_id_idx on public.cart_items (variant_id);

create table if not exists public.wishlist_items (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists wishlist_items_product_id_idx on public.wishlist_items (product_id);

-- ---------------------------------------------------------------------
-- 6. CUPONES
-- ---------------------------------------------------------------------
create table if not exists public.coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null,
  description        text,
  discount_type      public.discount_type not null,
  value              numeric(12,2) not null check (value > 0),
  min_order_amount   numeric(12,2) not null default 0 check (min_order_amount >= 0),
  max_uses           int check (max_uses > 0),
  max_uses_per_user  int check (max_uses_per_user > 0),
  used_count         int not null default 0 check (used_count >= 0),
  starts_at          timestamptz,
  ends_at            timestamptz,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (discount_type <> 'percentage' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index if not exists coupons_code_lower_idx on public.coupons (lower(code));

-- ---------------------------------------------------------------------
-- 7. PEDIDOS Y PAGOS
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      bigint generated always as identity (start with 1001) unique,
  user_id           uuid references public.profiles (id) on delete set null,
  status            public.order_status not null default 'pending',
  subtotal          numeric(12,2) not null check (subtotal >= 0),
  discount_total    numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total    numeric(12,2) not null default 0 check (shipping_total >= 0),
  tax_total         numeric(12,2) not null default 0 check (tax_total >= 0),
  total             numeric(12,2) not null check (total >= 0),
  currency          char(3) not null default 'CLP',
  coupon_id         uuid references public.coupons (id) on delete set null,
  shipping_address  jsonb not null,           -- copia de la dirección al momento de comprar
  billing_address   jsonb,
  notes             text,
  carrier           text,
  tracking_number   text,
  placed_at         timestamptz not null default now(),
  paid_at           timestamptz,
  shipped_at        timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Datos del checkout (M1, fase 5, 2026-10-24). Las escribe solo place_order.
--   shipping_method: standard · express · pickup (retiro: shipping_address = la tienda, D-014)
--   payment_method:  webpay · flow · transfer (define expires_at, D-010)
--   document_type:   boleta · factura; invoice_details = { business_name, rut, activity } (D-012)
--   expires_at:      límite para pagar; después el cron lo anula con cancel_order (fase 6)
alter table public.orders
  add column if not exists contact_email   text,
  add column if not exists customer_rut    text,
  add column if not exists shipping_method text,
  add column if not exists payment_method  text,
  add column if not exists document_type   text not null default 'boleta',
  add column if not exists invoice_details jsonb,
  add column if not exists expires_at      timestamptz;

do $$ begin
  alter table public.orders add constraint orders_shipping_method_check
    check (shipping_method in ('standard', 'express', 'pickup'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.orders add constraint orders_payment_method_check
    check (payment_method in ('webpay', 'flow', 'transfer'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.orders add constraint orders_document_type_check
    check (document_type in ('boleta', 'factura')
           and (document_type = 'boleta' or invoice_details is not null));
exception when duplicate_object then null; end $$;

create index if not exists orders_user_id_idx on public.orders (user_id, placed_at desc);
create index if not exists orders_status_idx  on public.orders (status);
create index if not exists orders_coupon_id_idx on public.orders (coupon_id);

do $$ begin
  alter table public.inventory_movements
    add constraint inventory_movements_order_id_fkey
    foreign key (order_id) references public.orders (id) on delete set null;
exception when duplicate_object then null; end $$;
create index if not exists inventory_movements_order_id_idx on public.inventory_movements (order_id);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_name  text not null,               -- copias para que el pedido no cambie si se edita el catálogo
  variant_name  text,
  sku           text,
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  quantity      int not null check (quantity > 0),
  line_total    numeric(12,2) generated always as (unit_price * quantity) stored,
  created_at    timestamptz not null default now()
);
create index if not exists order_items_order_id_idx   on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists order_items_variant_id_idx on public.order_items (variant_id);

create table if not exists public.payments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete cascade,
  provider             text not null,          -- 'webpay', 'mercadopago', 'stripe', 'flow'...
  provider_payment_id  text,
  status               public.payment_status not null default 'pending',
  amount               numeric(12,2) not null check (amount >= 0),
  currency             char(3) not null default 'CLP',
  raw_response         jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index if not exists payments_order_id_idx on public.payments (order_id);

-- Fase 6 (2026-10-25, migración payments_attempts_m4).
-- M4: el cron de vencimiento busca los pendientes vencidos
create index if not exists orders_pending_expires_idx
  on public.orders (status, expires_at) where status = 'pending';

-- Un pedido tiene N intentos (D-013): attempt = n, reference = "<order_number>-<n>"
-- (buy_order de Webpay, commerceOrder de Flow, referencia de la transferencia).
-- confirming_until: lock en la BD mientras se confirma el intento (commit de Webpay, getStatus
-- de Flow). Respalda al lock de Redis (D-005), que es fail-open.
alter table public.payments
  add column if not exists attempt          int,
  add column if not exists reference        text,
  add column if not exists confirming_until timestamptz;
create unique index if not exists payments_reference_idx     on public.payments (reference);
create unique index if not exists payments_order_attempt_idx on public.payments (order_id, attempt);

-- Alertas para el admin (B13): pago aprobado sobre un pedido anulado, doble pago,
-- monto distinto o reembolso fallido. Solo el admin las lee; las escribe el backend.
create table if not exists public.payment_alerts (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  payment_id  uuid references public.payments (id) on delete set null,
  kind        text not null check (kind in ('paid_after_cancel', 'double_payment', 'amount_mismatch', 'refund_failed')),
  detail      jsonb,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists payment_alerts_order_id_idx   on public.payment_alerts (order_id);
create index if not exists payment_alerts_payment_id_idx on public.payment_alerts (payment_id);
create index if not exists payment_alerts_open_idx       on public.payment_alerts (created_at) where resolved_at is null;

-- Fase 7.0 (2026-10-25, migración order_events_m8): M8
-- Motivo de anulación (CorreoAnulacion, tweak motivo). cancel_note es el texto que ve el cliente
-- (*Motivo: sin stock*); lo escribe solo cancel_order.
alter table public.orders
  add column if not exists cancel_reason text,
  add column if not exists cancel_note   text;

do $$ begin
  alter table public.orders add constraint orders_cancel_reason_check
    check (cancel_reason in ('vencio', 'tienda', 'cliente'));
exception when duplicate_object then null; end $$;

-- Historial del pedido (AdminPedido: cuándo, qué, quién). Lo escribe el trigger de abajo al
-- crear el pedido y en cada cambio de estado; el backend agrega los eventos sin cambio de estado
-- (correos) con la llave secreta. Solo el admin lo lee. Los pedidos anteriores a esta migración
-- no tienen eventos: su historial se arma con las fechas del pedido y los intentos de pago.
--   kind:  placed · un order_status (incluido pending: la BD no restringe las transiciones y el
--          historial nunca debe impedir un cambio de estado) · email
--   actor: customer (dueño del pedido, también el invitado) · admin · system (cron, pasarelas)
create table if not exists public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  kind        text not null,
  actor       text not null check (actor in ('customer', 'admin', 'system')),
  actor_id    uuid references public.profiles (id) on delete set null,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
alter table public.order_events drop constraint if exists order_events_kind_check;
alter table public.order_events add constraint order_events_kind_check
  check (kind in ('placed', 'pending', 'paid', 'processing', 'shipped', 'delivered',
                  'cancelled', 'refunded', 'email'));
create index if not exists order_events_order_id_idx on public.order_events (order_id, created_at);
create index if not exists order_events_actor_id_idx on public.order_events (actor_id);

create table if not exists public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.coupons (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  order_id    uuid not null references public.orders (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (coupon_id, order_id)
);
create index if not exists coupon_redemptions_user_idx  on public.coupon_redemptions (coupon_id, user_id);
create index if not exists coupon_redemptions_order_idx on public.coupon_redemptions (order_id);
create index if not exists coupon_redemptions_user_id_idx on public.coupon_redemptions (user_id);

-- ---------------------------------------------------------------------
-- 8. RESEÑAS
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  title         text,
  body          text,
  is_published  boolean not null default true,    -- un admin puede ocultarla
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_id_idx on public.reviews (product_id) where is_published;
create index if not exists reviews_user_id_idx    on public.reviews (user_id);

-- ---------------------------------------------------------------------
-- 9. FUNCIONES DE SEGURIDAD
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 10. TRIGGERS
-- ---------------------------------------------------------------------
-- updated_at automático
do $$
declare t text;
begin
  foreach t in array array['profiles','addresses','categories','brands','products',
                           'product_variants','carts','cart_items','coupons','orders',
                           'payments','reviews']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Al registrarse un usuario: crear perfil y carrito
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id,
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  insert into public.carts (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un cliente no puede cambiarse el rol a sí mismo
create or replace function public.protect_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception 'No tienes permiso para cambiar el rol';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Solo una dirección por defecto por usuario
create or replace function public.ensure_single_default_address()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_default then
    update public.addresses
       set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;

drop trigger if exists ensure_single_default_address on public.addresses;
create trigger ensure_single_default_address
  before insert or update of is_default on public.addresses
  for each row execute function public.ensure_single_default_address();

-- Fechas de estado del pedido
create or replace function public.set_order_status_timestamps()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'paid'      then new.paid_at      := coalesce(new.paid_at, now());
      when 'shipped'   then new.shipped_at   := coalesce(new.shipped_at, now());
      when 'delivered' then new.delivered_at := coalesce(new.delivered_at, now());
      when 'cancelled' then new.cancelled_at := coalesce(new.cancelled_at, now());
      else null;
    end case;
  end if;
  return new;
end $$;

drop trigger if exists set_order_status_timestamps on public.orders;
create trigger set_order_status_timestamps
  before update of status on public.orders
  for each row execute function public.set_order_status_timestamps();

-- Historial del pedido (M8, fase 7.0)
-- Quién hizo el cambio: el admin que llama con el cliente admin lo indica con
-- set_config('shop.actor_id', <uuid>, true) en la misma transacción (funciones de la 7.4);
-- si no, auth.uid(). Sin ninguno de los dos (cron, pasarelas) es 'system'.
create or replace function public.log_order_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := coalesce(nullif(current_setting('shop.actor_id', true), '')::uuid, auth.uid());
  v_actor    text := 'system';
  v_kind     text;
  v_data     jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    v_kind := 'placed';
    v_data := jsonb_build_object('payment_method', new.payment_method);
  elsif new.status is distinct from old.status then
    v_kind := new.status::text;
    case new.status
      when 'paid' then
        select jsonb_build_object('provider', p.provider, 'reference', p.reference)
          into v_data
          from public.payments p
         where p.order_id = new.id and p.status = 'paid'
         order by p.updated_at desc
         limit 1;
      when 'shipped' then
        v_data := jsonb_build_object('carrier', new.carrier, 'tracking_number', new.tracking_number);
      when 'cancelled' then
        v_data := jsonb_build_object('reason', new.cancel_reason, 'note', new.cancel_note);
      else null;
    end case;
  else
    return new;
  end if;

  if v_actor_id is not null then
    select case when pr.role = 'admin' then 'admin' else 'customer' end
      into v_actor
      from public.profiles pr
     where pr.id = v_actor_id;
    if v_actor is null then
      v_actor := 'system';
      v_actor_id := null;
    end if;
  end if;

  insert into public.order_events (order_id, kind, actor, actor_id, data)
  values (new.id, v_kind, v_actor, v_actor_id, coalesce(v_data, '{}'::jsonb));
  return new;
end $$;

drop trigger if exists log_order_event on public.orders;
create trigger log_order_event
  after insert or update of status on public.orders
  for each row execute function public.log_order_event();

revoke execute on function public.log_order_event() from public, anon, authenticated;

-- Cuando un pago queda 'paid', el pedido pendiente pasa a 'paid'
create or replace function public.sync_order_on_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    update public.orders set status = 'paid'
     where id = new.order_id and status = 'pending';
  end if;
  return new;
end $$;

drop trigger if exists sync_order_on_payment on public.payments;
create trigger sync_order_on_payment
  after insert or update of status on public.payments
  for each row execute function public.sync_order_on_payment();

-- Reseñas: el cliente no controla la visibilidad
create or replace function public.guard_review_publication()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_published := true;
    else
      new.is_published := old.is_published;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_review_publication on public.reviews;
create trigger guard_review_publication
  before insert or update on public.reviews
  for each row execute function public.guard_review_publication();

-- ---------------------------------------------------------------------
-- 11. CHECKOUT (RPC)
-- ---------------------------------------------------------------------
-- Crea el pedido desde el carrito del usuario en una sola transacción:
-- valida stock y cupón, calcula el despacho, copia la dirección, descuenta inventario
-- y vacía el carrito. Antes hay que sincronizar cart_items (syncCart en la app).
-- M2 (fase 5, 2026-10-24): método de despacho y de pago, datos de contacto y documento,
-- despacho calculado aquí (D-011), descuento redondeado a pesos, IVA incluido (D-012)
-- y expires_at (D-010). La firma cambió: se borra la anterior para no dejar una sobrecarga.
-- Los errores llevan un hint estable para que la app elija el mensaje:
--   auth · input · address · express_region · empty_cart · unavailable · stock (detail = producto)
--   invalid · exhausted · used · min_order (detail = compra mínima en CLP), como validate_coupon.
-- Uso: supabase.rpc('place_order', { p_shipping_method, p_payment_method, p_contact_email,
--        p_customer_rut, p_shipping_address_id | p_recipient_name + p_recipient_phone, ... })
-- Despacho (reglas-de-negocio.md): retiro 0 · express 4.990 (solo RM) · domicilio gratis si
-- subtotal − descuento ≥ 39.990, si no 3.990 en la RM y 6.990 en regiones.
drop function if exists public.place_order(uuid, text, text);

create or replace function public.place_order(
  p_shipping_method     text,
  p_payment_method      text,
  p_contact_email       text,
  p_customer_rut        text,
  p_shipping_address_id uuid  default null,   -- obligatorio salvo en retiro
  p_recipient_name      text  default null,   -- solo retiro: quién retira
  p_recipient_phone     text  default null,
  p_document_type       text  default 'boleta',
  p_invoice             jsonb default null,   -- factura: { business_name, rut, activity }
  p_coupon_code         text  default null,
  p_notes               text  default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c_free_shipping_from constant numeric := 39990;
  c_rm                 constant text    := 'Metropolitana de Santiago';
  v_user_id   uuid := auth.uid();
  v_cart_id   uuid;
  v_address   public.addresses%rowtype;
  v_ship_to   jsonb;
  v_coupon    public.coupons%rowtype;
  v_item      record;
  v_subtotal  numeric(12,2) := 0;
  v_discount  numeric(12,2) := 0;
  v_shipping  numeric(12,2) := 0;
  v_total     numeric(12,2);
  v_user_uses int;
  v_order_id  uuid;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para comprar' using hint = 'auth';
  end if;

  if p_shipping_method is null or p_shipping_method not in ('standard', 'express', 'pickup')
     or p_payment_method is null or p_payment_method not in ('webpay', 'flow', 'transfer')
     or coalesce(p_document_type, '') not in ('boleta', 'factura')
     or coalesce(trim(p_contact_email), '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or nullif(trim(p_customer_rut), '') is null then
    raise exception 'Datos del pedido incompletos' using hint = 'input';
  end if;
  if p_document_type = 'factura'
     and (nullif(trim(p_invoice ->> 'business_name'), '') is null
          or nullif(trim(p_invoice ->> 'rut'), '') is null
          or nullif(trim(p_invoice ->> 'activity'), '') is null) then
    raise exception 'Faltan los datos de la factura' using hint = 'input';
  end if;

  if p_shipping_method = 'pickup' then
    if nullif(trim(p_recipient_name), '') is null or nullif(trim(p_recipient_phone), '') is null then
      raise exception 'Faltan los datos de quien retira' using hint = 'input';
    end if;
    -- Retiro en tienda (D-014): la dirección del pedido es la de la tienda. Datos reales
    -- (2026-10-25); deben coincidir con STORE.pickup de src/lib/store.ts
    v_ship_to := jsonb_build_object(
      'type',           'pickup',
      'store',          'Local Tajamar',
      'recipient_name', trim(p_recipient_name),
      'phone',          trim(p_recipient_phone),
      'line1',          'Tajamar 223',
      'line2',          'Departamento 302',
      'city',           'Las Condes',
      'region',         c_rm,
      'postal_code',    null,
      'country',        'CL');
  else
    select * into v_address
      from public.addresses
     where id = p_shipping_address_id and user_id = v_user_id;
    if not found then
      raise exception 'Dirección de despacho no válida' using hint = 'address';
    end if;
    -- El express es solo para la Región Metropolitana (dueño, 2026-10-24)
    if p_shipping_method = 'express' and v_address.region is distinct from c_rm then
      raise exception 'El despacho express es solo para la Región Metropolitana' using hint = 'express_region';
    end if;
    v_ship_to := jsonb_build_object(
      'type',           'delivery',
      'recipient_name', v_address.recipient_name,
      'phone',          v_address.phone,
      'line1',          v_address.line1,
      'line2',          v_address.line2,
      'city',           v_address.city,
      'region',         v_address.region,
      'postal_code',    v_address.postal_code,
      'country',        v_address.country);
  end if;

  select id into v_cart_id from public.carts where user_id = v_user_id;
  if v_cart_id is null or not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception 'El carrito está vacío' using hint = 'empty_cart';
  end if;

  -- Bloquea las variantes para evitar sobreventa entre compras simultáneas
  for v_item in
    select ci.quantity, v.sku, v.stock, v.is_active as variant_active,
           p.is_active as product_active, p.name as product_name,
           coalesce(v.price, p.base_price) as unit_price
      from public.cart_items ci
      join public.product_variants v on v.id = ci.variant_id
      join public.products p        on p.id = v.product_id
     where ci.cart_id = v_cart_id
     order by v.id
       for update of v
  loop
    if not (v_item.variant_active and v_item.product_active) then
      raise exception '"%" ya no está disponible', v_item.product_name
        using hint = 'unavailable', detail = v_item.product_name;
    end if;
    if v_item.stock < v_item.quantity then
      raise exception 'Stock insuficiente para "%" (SKU %, disponibles: %)',
        v_item.product_name, v_item.sku, v_item.stock
        using hint = 'stock', detail = v_item.product_name;
    end if;
    v_subtotal := v_subtotal + v_item.unit_price * v_item.quantity;
  end loop;

  -- Cupón (mismas reglas que validate_coupon)
  if nullif(trim(p_coupon_code), '') is not null then
    select * into v_coupon
      from public.coupons
     where lower(code) = lower(trim(p_coupon_code))
       for update;

    if not found or not v_coupon.is_active
       or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
       or (v_coupon.ends_at   is not null and v_coupon.ends_at   < now()) then
      raise exception 'Cupón no válido o expirado' using hint = 'invalid';
    end if;
    if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
      raise exception 'Este cupón ya alcanzó su límite de usos' using hint = 'exhausted';
    end if;
    if v_coupon.max_uses_per_user is not null then
      select count(*) into v_user_uses
        from public.coupon_redemptions
       where coupon_id = v_coupon.id and user_id = v_user_id;
      if v_user_uses >= v_coupon.max_uses_per_user then
        raise exception 'Ya usaste este cupón' using hint = 'used';
      end if;
    end if;
    if v_subtotal < v_coupon.min_order_amount then
      raise exception 'El cupón requiere una compra mínima de %', v_coupon.min_order_amount
        using hint = 'min_order', detail = round(v_coupon.min_order_amount)::text;
    end if;

    -- CLP sin decimales: Webpay y Flow rechazan montos con decimales (trampa 15)
    v_discount := case v_coupon.discount_type
                    when 'percentage' then round(v_subtotal * v_coupon.value / 100)
                    else round(least(v_coupon.value, v_subtotal))
                  end;
  end if;

  -- Despacho (D-011): el umbral se compara con el subtotal después del cupón
  v_shipping := case p_shipping_method
                  when 'pickup'  then 0
                  when 'express' then 4990
                  else case
                         when v_subtotal - v_discount >= c_free_shipping_from then 0
                         when v_address.region = c_rm then 3990
                         else 6990
                       end
                end;
  v_total := v_subtotal - v_discount + v_shipping;

  insert into public.orders (user_id, subtotal, discount_total, shipping_total, tax_total, total,
                             coupon_id, shipping_address, notes, contact_email, customer_rut,
                             shipping_method, payment_method, document_type, invoice_details,
                             expires_at)
  values (v_user_id, v_subtotal, v_discount, v_shipping,
          round(v_total * 19 / 119),            -- IVA incluido en el total, informativo (D-012)
          v_total,
          v_coupon.id,
          v_ship_to,
          nullif(trim(p_notes), ''),
          lower(trim(p_contact_email)),
          trim(p_customer_rut),
          p_shipping_method,
          p_payment_method,
          p_document_type,
          case when p_document_type = 'factura' then
            jsonb_build_object('business_name', trim(p_invoice ->> 'business_name'),
                               'rut',           trim(p_invoice ->> 'rut'),
                               'activity',      trim(p_invoice ->> 'activity'))
          end,
          -- Reserva del stock (D-010): 48 h para transferir, 30 min en Webpay y Flow
          now() + case when p_payment_method = 'transfer' then interval '48 hours'
                       else interval '30 minutes' end)
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, variant_id, product_name,
                                  variant_name, sku, unit_price, quantity)
  select v_order_id, p.id, v.id, p.name, v.name, v.sku,
         coalesce(v.price, p.base_price), ci.quantity
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p        on p.id = v.product_id
   where ci.cart_id = v_cart_id;

  update public.product_variants v
     set stock = v.stock - ci.quantity
    from public.cart_items ci
   where ci.cart_id = v_cart_id and ci.variant_id = v.id;

  insert into public.inventory_movements (variant_id, quantity, reason, order_id, created_by)
  select variant_id, -quantity, 'sale', v_order_id, v_user_id
    from public.cart_items where cart_id = v_cart_id;

  if v_coupon.id is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, order_id)
    values (v_coupon.id, v_user_id, v_order_id);
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  delete from public.cart_items where cart_id = v_cart_id;

  return v_order_id;
end $$;

-- cancel_order con motivo. Cliente: solo sus pedidos 'pending' y el motivo es siempre 'cliente'.
-- Admin / service_role: 'pending', 'paid' o 'processing', con el motivo que indiquen
-- (el reembolso del dinero se gestiona aparte con la pasarela de pago).
drop function if exists public.cancel_order(uuid);

create or replace function public.cancel_order(p_order_id uuid, p_reason text default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_order    public.orders%rowtype;
  v_is_staff boolean := (auth.uid() is null) or public.is_admin();
  v_reason   text := p_reason;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado';
  end if;

  if not v_is_staff then
    if v_order.user_id is distinct from auth.uid() then
      raise exception 'Pedido no encontrado';
    end if;
    if v_order.status <> 'pending' then
      raise exception 'Solo puedes cancelar pedidos pendientes de pago';
    end if;
    v_reason := 'cliente';
  elsif v_order.status not in ('pending', 'paid', 'processing') then
    raise exception 'Un pedido en estado % no se puede cancelar', v_order.status;
  end if;

  if v_reason is not null and v_reason not in ('vencio', 'tienda', 'cliente') then
    raise exception 'Motivo de anulación no válido: %', v_reason;
  end if;

  update public.product_variants v
     set stock = v.stock + oi.quantity
    from public.order_items oi
   where oi.order_id = p_order_id and oi.variant_id = v.id;

  insert into public.inventory_movements (variant_id, quantity, reason, order_id, created_by)
  select variant_id, quantity, 'cancellation', p_order_id, auth.uid()
    from public.order_items
   where order_id = p_order_id and variant_id is not null;

  if v_order.coupon_id is not null then
    delete from public.coupon_redemptions where order_id = p_order_id;
    update public.coupons set used_count = greatest(used_count - 1, 0)
     where id = v_order.coupon_id;
  end if;

  update public.orders
     set status = 'cancelled',
         cancel_reason = v_reason,
         cancel_note = nullif(btrim(p_note), '')
   where id = p_order_id;
end $$;
end $$;

revoke execute on function public.place_order(text, text, text, text, uuid, text, text, text, jsonb, text, text) from public, anon;
revoke execute on function public.cancel_order(uuid, text, text) from public, anon;
grant  execute on function public.place_order(text, text, text, text, uuid, text, text, text, jsonb, text, text) to authenticated, service_role;
grant  execute on function public.cancel_order(uuid, text, text) to authenticated, service_role;

-- Las funciones de trigger SECURITY DEFINER no deben quedar expuestas como RPC
-- (/rest/v1/rpc/...). Los triggers no necesitan EXECUTE del usuario que dispara el evento.
-- is_admin sigue ejecutable por anon y authenticated a propósito: la usan las políticas RLS.
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.sync_order_on_payment() from public, anon, authenticated;

-- Intentos de pago (fase 6, 2026-10-25, migración payments_attempts_m4)
-- Crea un intento de pago (el primero, un reintento o un cambio de medio).
-- En una transacción, con el pedido bloqueado: el pedido debe estar pending y sin vencer, sin un
-- pago paid (doble pago) y con menos de 10 intentos. Los intentos pending anteriores quedan
-- failed. Cambia payment_method y extiende expires_at según el medio (D-010):
--   transfer      → placed_at + 48 h
--   webpay / flow → al menos now() + 30 min, sin pasar de placed_at + 48 h
-- Errores con hint: input · not_found · not_pending · expired · already_paid · too_many.
-- Solo service_role: la app verifica antes que el pedido sea del usuario (RLS de orders).
create or replace function public.start_payment_attempt(p_order_id uuid, p_provider text)
returns table (payment_id uuid, reference text, attempt int, amount numeric, order_number bigint,
               contact_email text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $
declare
  v_order   public.orders%rowtype;
  v_attempt int;
  v_ref     text;
  v_expires timestamptz;
  v_id      uuid;
begin
  if p_provider is null or p_provider not in ('webpay', 'flow', 'transfer') then
    raise exception 'Medio de pago no válido' using hint = 'input';
  end if;

  select * into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado' using hint = 'not_found';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'El pedido no está pendiente de pago' using hint = 'not_pending';
  end if;
  if v_order.expires_at is not null and v_order.expires_at <= now() then
    raise exception 'El plazo para pagar el pedido venció' using hint = 'expired';
  end if;
  if exists (select 1 from public.payments p where p.order_id = p_order_id and p.status = 'paid') then
    raise exception 'El pedido ya está pagado' using hint = 'already_paid';
  end if;

  select coalesce(max(p.attempt), 0) + 1 into v_attempt from public.payments p where p.order_id = p_order_id;
  if v_attempt > 10 then
    raise exception 'Demasiados intentos de pago' using hint = 'too_many';
  end if;

  update public.payments p
     set status = 'failed',
         raw_response = coalesce(p.raw_response, '{}'::jsonb) || jsonb_build_object('superseded_by', v_attempt)
   where p.order_id = p_order_id and p.status = 'pending';

  v_expires := case
    when p_provider = 'transfer' then v_order.placed_at + interval '48 hours'
    else least(v_order.placed_at + interval '48 hours',
               greatest(coalesce(v_order.expires_at, now()), now() + interval '30 minutes'))
  end;
  update public.orders o set payment_method = p_provider, expires_at = v_expires where o.id = p_order_id;

  v_ref := v_order.order_number::text || '-' || v_attempt::text;
  insert into public.payments (order_id, provider, provider_payment_id, status, amount, currency, attempt, reference)
  values (p_order_id, p_provider, case when p_provider = 'transfer' then v_ref end, 'pending',
          v_order.total, v_order.currency, v_attempt, v_ref)
  returning id into v_id;

  return query select v_id, v_ref, v_attempt, v_order.total, v_order.order_number, v_order.contact_email, v_expires;
end $;

-- Toma el lock de confirmación de un intento pending (D-005, respaldo del lock de Redis).
-- true = este proceso confirma; false = ya no está pending o alguien lo está confirmando.
create or replace function public.claim_payment(p_payment_id uuid, p_seconds int default 60)
returns boolean language plpgsql security definer set search_path = '' as $
begin
  update public.payments p
     set confirming_until = now() + make_interval(secs => greatest(p_seconds, 1))
   where p.id = p_payment_id and p.status = 'pending'
     and (p.confirming_until is null or p.confirming_until < now());
  return found;
end $;

-- Registra el resultado de un intento (idempotente). Transiciones:
--   pending → paid | failed  ·  failed → paid (Flow puede cobrar un intento reemplazado)
-- Si el pago queda paid, el trigger sync_order_on_payment pasa el pedido pending a paid.
-- Devuelve si cambió, el estado del pago, el del pedido después del trigger y si el pedido ya
-- tenía otro pago paid: con eso la app detecta B13 (pedido anulado) y el doble pago.
create or replace function public.settle_payment(p_payment_id uuid, p_status public.payment_status, p_raw jsonb)
returns table (changed boolean, payment_state public.payment_status, order_state public.order_status,
               other_paid boolean)
language plpgsql security definer set search_path = '' as $
declare
  v_pay     public.payments%rowtype;
  v_changed boolean := false;
begin
  if p_status is null or p_status not in ('paid', 'failed') then
    raise exception 'Estado de pago no permitido' using hint = 'input';
  end if;

  select * into v_pay from public.payments p where p.id = p_payment_id for update;
  if not found then
    raise exception 'Pago no encontrado' using hint = 'not_found';
  end if;

  if v_pay.status = 'pending' or (v_pay.status = 'failed' and p_status = 'paid') then
    update public.payments p
       set status = p_status, raw_response = coalesce(p_raw, p.raw_response), confirming_until = null
     where p.id = p_payment_id;
    v_changed := true;
    v_pay.status := p_status;
  else
    update public.payments p set confirming_until = null where p.id = p_payment_id;
  end if;

  return query
    select v_changed, v_pay.status, o.status,
           exists (select 1 from public.payments x
                    where x.order_id = o.id and x.status = 'paid' and x.id <> p_payment_id)
      from public.orders o where o.id = v_pay.order_id;
end $;

revoke execute on function public.start_payment_attempt(uuid, text) from public, anon, authenticated;
revoke execute on function public.claim_payment(uuid, int) from public, anon, authenticated;
revoke execute on function public.settle_payment(uuid, public.payment_status, jsonb) from public, anon, authenticated;
grant  execute on function public.start_payment_attempt(uuid, text) to service_role;
grant  execute on function public.claim_payment(uuid, int) to service_role;
grant  execute on function public.settle_payment(uuid, public.payment_status, jsonb) to service_role;

-- Valida un cupón para el carro (M3, fase 4, 2026-10-24) con las mismas reglas que place_order:
-- vigencia, max_uses, max_uses_per_user y min_order_amount. Devuelve el descuento en CLP entero.
-- Los errores llevan un hint estable para que la app elija el mensaje:
--   invalid · exhausted · used · min_order (detail = compra mínima en CLP).
-- Solo service_role: la llama la Server Action applyCoupon, que calcula el subtotal con los
-- precios de la BD y aplica el rate limiting (Redis). Con EXECUTE para anon, cualquiera podría
-- probar códigos por /rest/v1/rpc sin pasar por ese límite.
-- p_user_id: el usuario de la sesión (verificado en el servidor); null = sin sesión, y entonces
-- no se revisa el límite por usuario (place_order lo vuelve a revisar al crear el pedido).
create or replace function public.validate_coupon(
  p_code     text,
  p_subtotal numeric,
  p_user_id  uuid default null
)
returns table (code text, discount numeric, description text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_coupon    public.coupons%rowtype;
  v_subtotal  numeric(12,2) := greatest(coalesce(p_subtotal, 0), 0);
  v_user_uses int;
begin
  if nullif(trim(p_code), '') is null then
    raise exception 'Cupón no válido o expirado' using hint = 'invalid';
  end if;

  select * into v_coupon
    from public.coupons c
   where lower(c.code) = lower(trim(p_code));

  if not found or not v_coupon.is_active
     or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
     or (v_coupon.ends_at   is not null and v_coupon.ends_at   < now()) then
    raise exception 'Cupón no válido o expirado' using hint = 'invalid';
  end if;
  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    raise exception 'Este cupón ya alcanzó su límite de usos' using hint = 'exhausted';
  end if;
  if v_coupon.max_uses_per_user is not null and p_user_id is not null then
    select count(*) into v_user_uses
      from public.coupon_redemptions r
     where r.coupon_id = v_coupon.id and r.user_id = p_user_id;
    if v_user_uses >= v_coupon.max_uses_per_user then
      raise exception 'Ya usaste este cupón' using hint = 'used';
    end if;
  end if;
  if v_subtotal < v_coupon.min_order_amount then
    raise exception 'El cupón requiere una compra mínima de %', v_coupon.min_order_amount
      using hint = 'min_order', detail = round(v_coupon.min_order_amount)::text;
  end if;

  return query
    select v_coupon.code,
           case v_coupon.discount_type
             when 'percentage' then round(v_subtotal * v_coupon.value / 100)
             else round(least(v_coupon.value, v_subtotal))
           end,
           v_coupon.description;
end;
$$;

revoke execute on function public.validate_coupon(text, numeric, uuid) from public, anon, authenticated;
grant  execute on function public.validate_coupon(text, numeric, uuid) to service_role;

-- ---------------------------------------------------------------------
-- 12. VISTA DE CATÁLOGO (respeta RLS del usuario que consulta)
-- ---------------------------------------------------------------------
create or replace view public.product_catalog
with (security_invoker = true) as
select
  p.id, p.slug, p.name, p.description, p.base_price, p.compare_at_price,
  p.currency, p.is_featured, p.category_id,
  c.slug  as category_slug,
  c.name  as category_name,
  b.name  as brand_name,
  agg.min_price,
  agg.total_stock,
  img.url as cover_image,
  rv.avg_rating,
  coalesce(rv.review_count, 0) as review_count,
  p.created_at
from public.products p
left join public.categories c on c.id = p.category_id
left join public.brands     b on b.id = p.brand_id
left join lateral (
  select min(coalesce(v.price, p.base_price)) as min_price,
         coalesce(sum(v.stock), 0)::int      as total_stock
    from public.product_variants v
   where v.product_id = p.id and v.is_active
) agg on true
left join lateral (
  select i.url from public.product_images i
   where i.product_id = p.id
   order by i.sort_order limit 1
) img on true
left join lateral (
  select round(avg(r.rating)::numeric, 1) as avg_rating,
         count(*)::int                     as review_count
    from public.reviews r
   where r.product_id = p.id and r.is_published
) rv on true
where p.is_active;

-- Búsqueda del catálogo (fase 3, 2026-10-24) en dos pasos:
-- 1. Full-text en español sobre products.search_vector (nombre A + descripción B).
-- 2. Solo si no hay resultados: trigramas sin tildes sobre el nombre y la categoría
--    (tolera errores de tipeo, palabras incompletas y "ceramica" sin tilde).
--    Con el mismo word_similarity ("tasa" ≈ taza, tapa, tabla) desempata similarity.
-- security invoker: respeta el RLS de products y de la vista product_catalog.
create or replace function public.search_products(q text, max_results int default 24)
returns setof public.product_catalog
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select websearch_to_tsquery('spanish', q) as ts,
           translate(lower(trim(q)), 'áéíóúüñ', 'aeiouun') as term,
           least(greatest(max_results, 1), 48) as max_rows
  ),
  full_text as (
    select c.*, ts_rank(p.search_vector, query.ts) as score, 0::real as tiebreak
      from public.product_catalog c
      join public.products p on p.id = c.id
      cross join query
     where length(query.term) > 0
       and p.search_vector @@ query.ts
  ),
  fuzzy as (
    select c.*,
           greatest(
             extensions.word_similarity(query.term, translate(lower(c.name), 'áéíóúüñ', 'aeiouun')),
             extensions.word_similarity(query.term, translate(lower(coalesce(c.category_name, '')), 'áéíóúüñ', 'aeiouun'))
           ) as score,
           extensions.similarity(query.term, translate(lower(c.name), 'áéíóúüñ', 'aeiouun')) as tiebreak
      from public.product_catalog c
      cross join query
     where length(query.term) > 1
       and not exists (select 1 from full_text)
  )
  select id, slug, name, description, base_price, compare_at_price, currency, is_featured,
         category_id, category_slug, category_name, brand_name, min_price, total_stock,
         cover_image, avg_rating, review_count, created_at
    from (
      select * from full_text
      union all
      select * from fuzzy where score >= 0.4
    ) r
   order by score desc, tiebreak desc, name
   limit (select max_rows from query);
$$;

revoke execute on function public.search_products(text, int) from public;
grant execute on function public.search_products(text, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.addresses           enable row level security;
alter table public.categories          enable row level security;
alter table public.brands              enable row level security;
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.product_images      enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.carts               enable row level security;
alter table public.cart_items          enable row level security;
alter table public.wishlist_items      enable row level security;
alter table public.coupons             enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.payments            enable row level security;
alter table public.coupon_redemptions  enable row level security;
alter table public.reviews             enable row level security;
alter table public.payment_alerts      enable row level security;
alter table public.order_events        enable row level security;

-- Perfiles
drop policy if exists "profiles: ver el propio o admin" on public.profiles;
create policy "profiles: ver el propio o admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles: editar el propio o admin" on public.profiles;
create policy "profiles: editar el propio o admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Direcciones: una sola política de lectura (dueño o admin) y escritura solo del dueño.
-- (Una política FOR ALL + otra de lectura se evaluaban las dos en cada SELECT.)
drop policy if exists "addresses: dueño"     on public.addresses;  -- versión anterior
drop policy if exists "addresses: admin lee" on public.addresses;  -- versión anterior

drop policy if exists "addresses: dueño o admin lee" on public.addresses;
create policy "addresses: dueño o admin lee" on public.addresses
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "addresses: dueño inserta" on public.addresses;
create policy "addresses: dueño inserta" on public.addresses
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "addresses: dueño actualiza" on public.addresses;
create policy "addresses: dueño actualiza" on public.addresses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "addresses: dueño borra" on public.addresses;
create policy "addresses: dueño borra" on public.addresses
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Catálogo público (lectura)
drop policy if exists "categories: lectura pública" on public.categories;
create policy "categories: lectura pública" on public.categories
  for select to anon, authenticated using (is_active or (select public.is_admin()));

drop policy if exists "brands: lectura pública" on public.brands;
create policy "brands: lectura pública" on public.brands
  for select to anon, authenticated using (true);

drop policy if exists "products: lectura pública" on public.products;
create policy "products: lectura pública" on public.products
  for select to anon, authenticated using (is_active or (select public.is_admin()));

drop policy if exists "variants: lectura pública" on public.product_variants;
create policy "variants: lectura pública" on public.product_variants
  for select to anon, authenticated using (is_active or (select public.is_admin()));

drop policy if exists "images: lectura pública" on public.product_images;
create policy "images: lectura pública" on public.product_images
  for select to anon, authenticated using (true);

-- Gestión de admin en catálogo y pagos: insert/update/delete por separado.
-- La lectura del admin ya la cubre la política de lectura de cada tabla; una política
-- FOR ALL agregaría una segunda política permisiva en cada SELECT.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('categories',       'categories: admin gestiona', 'categories: admin'),
      ('brands',           'brands: admin gestiona',     'brands: admin'),
      ('products',         'products: admin gestiona',   'products: admin'),
      ('product_variants', 'variants: admin gestiona',   'variants: admin'),
      ('product_images',   'images: admin gestiona',     'images: admin'),
      ('payments',         'payments: admin gestiona',   'payments: admin')
    ) as t(tbl, old_name, prefix)
  loop
    execute format('drop policy if exists %I on public.%I', r.old_name, r.tbl);  -- versión anterior

    execute format('drop policy if exists %I on public.%I', r.prefix || ' inserta', r.tbl);
    execute format('create policy %I on public.%I for insert to authenticated
                    with check ((select public.is_admin()))', r.prefix || ' inserta', r.tbl);

    execute format('drop policy if exists %I on public.%I', r.prefix || ' actualiza', r.tbl);
    execute format('create policy %I on public.%I for update to authenticated
                    using ((select public.is_admin())) with check ((select public.is_admin()))',
                   r.prefix || ' actualiza', r.tbl);

    execute format('drop policy if exists %I on public.%I', r.prefix || ' borra', r.tbl);
    execute format('create policy %I on public.%I for delete to authenticated
                    using ((select public.is_admin()))', r.prefix || ' borra', r.tbl);
  end loop;
end $$;

drop policy if exists "inventory: admin" on public.inventory_movements;
create policy "inventory: admin" on public.inventory_movements
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Carrito
drop policy if exists "carts: dueño" on public.carts;
create policy "carts: dueño" on public.carts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "cart_items: dueño" on public.cart_items;
create policy "cart_items: dueño" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c
                  where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c
                       where c.id = cart_id and c.user_id = (select auth.uid())));

-- Favoritos
drop policy if exists "wishlist: dueño" on public.wishlist_items;
create policy "wishlist: dueño" on public.wishlist_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Cupones (se validan dentro de place_order; los clientes no los listan)
drop policy if exists "coupons: admin" on public.coupons;
create policy "coupons: admin" on public.coupons
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "coupon_redemptions: admin lee" on public.coupon_redemptions;
create policy "coupon_redemptions: admin lee" on public.coupon_redemptions
  for select to authenticated using ((select public.is_admin()));

-- Pedidos: se crean solo con place_order(); el cliente solo lee los suyos
drop policy if exists "orders: dueño o admin lee" on public.orders;
create policy "orders: dueño o admin lee" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "orders: admin actualiza" on public.orders;
create policy "orders: admin actualiza" on public.orders
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "order_items: dueño o admin lee" on public.order_items;
create policy "order_items: dueño o admin lee" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o
                  where o.id = order_id
                    and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

-- Pagos: los registra el backend con la llave secreta (salta RLS).
-- La escritura del admin está en el bloque "Gestión de admin" de arriba.
drop policy if exists "payments: dueño o admin lee" on public.payments;
create policy "payments: dueño o admin lee" on public.payments
  for select to authenticated
  using (exists (select 1 from public.orders o
                  where o.id = order_id
                    and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

-- Alertas de pago (fase 6): las escribe el backend con la llave secreta; el admin las lee y resuelve
drop policy if exists "payment_alerts: admin lee" on public.payment_alerts;
create policy "payment_alerts: admin lee" on public.payment_alerts
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "payment_alerts: admin resuelve" on public.payment_alerts;
create policy "payment_alerts: admin resuelve" on public.payment_alerts
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Historial del pedido (M8, fase 7.0): solo el admin lo lee; lo escribe el trigger log_order_event
drop policy if exists "order_events: admin lee" on public.order_events;
create policy "order_events: admin lee" on public.order_events
  for select to authenticated using ((select public.is_admin()));

-- Reseñas: solo quien compró el producto puede reseñarlo
drop policy if exists "reviews: lectura pública" on public.reviews;
create policy "reviews: lectura pública" on public.reviews
  for select to anon, authenticated
  using (is_published or user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "reviews: compradores crean" on public.reviews;
create policy "reviews: compradores crean" on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.user_id = (select auth.uid())
        and o.status in ('paid', 'processing', 'shipped', 'delivered')
    )
  );

drop policy if exists "reviews: autor edita" on public.reviews;
create policy "reviews: autor edita" on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "reviews: autor o admin borra" on public.reviews;
create policy "reviews: autor o admin borra" on public.reviews
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------
-- 14. STORAGE: bucket público para imágenes de productos
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

drop policy if exists "product-images: admin sube" on storage.objects;
create policy "product-images: admin sube" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product-images: admin edita" on storage.objects;
create policy "product-images: admin edita" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product-images: admin borra" on storage.objects;
create policy "product-images: admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
