-- =====================================================================
--  Fase 6 · Pagos (2026-10-25): M4 + intentos de pago + alertas
--  Idempotente. También está en ecommerce_schema.sql (§7, §11 y §13).
-- =====================================================================

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

alter table public.payment_alerts enable row level security;
drop policy if exists "payment_alerts: admin lee" on public.payment_alerts;
create policy "payment_alerts: admin lee" on public.payment_alerts
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "payment_alerts: admin resuelve" on public.payment_alerts;
create policy "payment_alerts: admin resuelve" on public.payment_alerts
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

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
language plpgsql security definer set search_path = '' as $$
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
end $$;

-- Toma el lock de confirmación de un intento pending (D-005, respaldo del lock de Redis).
-- true = este proceso confirma; false = ya no está pending o alguien lo está confirmando.
create or replace function public.claim_payment(p_payment_id uuid, p_seconds int default 60)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.payments p
     set confirming_until = now() + make_interval(secs => greatest(p_seconds, 1))
   where p.id = p_payment_id and p.status = 'pending'
     and (p.confirming_until is null or p.confirming_until < now());
  return found;
end $$;

-- Registra el resultado de un intento (idempotente). Transiciones:
--   pending → paid | failed  ·  failed → paid (Flow puede cobrar un intento reemplazado)
-- Si el pago queda paid, el trigger sync_order_on_payment pasa el pedido pending a paid.
-- Devuelve si cambió, el estado del pago, el del pedido después del trigger y si el pedido ya
-- tenía otro pago paid: con eso la app detecta B13 (pedido anulado) y el doble pago.
create or replace function public.settle_payment(p_payment_id uuid, p_status public.payment_status, p_raw jsonb)
returns table (changed boolean, payment_state public.payment_status, order_state public.order_status,
               other_paid boolean)
language plpgsql security definer set search_path = '' as $$
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
end $$;

revoke execute on function public.start_payment_attempt(uuid, text) from public, anon, authenticated;
revoke execute on function public.claim_payment(uuid, int) from public, anon, authenticated;
revoke execute on function public.settle_payment(uuid, public.payment_status, jsonb) from public, anon, authenticated;
grant  execute on function public.start_payment_attempt(uuid, text) to service_role;
grant  execute on function public.claim_payment(uuid, int) to service_role;
grant  execute on function public.settle_payment(uuid, public.payment_status, jsonb) to service_role;
