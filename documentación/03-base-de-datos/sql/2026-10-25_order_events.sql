-- =====================================================================
--  Fase 7.0 · Base de la postcompra (2026-10-25): M8
--  Historial del pedido (order_events), motivo de anulación y cancel_order con motivo.
--  Idempotente. También está en ecommerce_schema.sql (§7, §10, §11 y §13).
-- =====================================================================

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

alter table public.order_events enable row level security;

drop policy if exists "order_events: admin lee" on public.order_events;
create policy "order_events: admin lee" on public.order_events
  for select to authenticated using ((select public.is_admin()));

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

revoke execute on function public.cancel_order(uuid, text, text) from public, anon;
grant  execute on function public.cancel_order(uuid, text, text) to authenticated, service_role;
