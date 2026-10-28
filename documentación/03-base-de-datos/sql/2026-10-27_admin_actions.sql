-- M9 (fase 7.4, 2026-10-27): acciones de la administración. Aplicada con apply_migration como
-- `admin_actions_m9`. Idempotente.
--
-- Una función por acción, todas security definer y solo para service_role: la Server Action ya
-- verificó la sesión (getAdminUser) y la transición (canTransition); aquí se vuelve a comprobar que
-- p_admin_id sea admin, que el pedido siga en el estado que vio la página (p_from) y la transición.
-- Cada una indica al admin con set_config('shop.actor_id', …, true) en la misma transacción, así el
-- trigger log_order_event lo registra como actor (D-025).
--
-- Tipos de evento nuevos en order_events: `refund` (un pago devuelto en la pasarela o a mano) y
-- `alert_resolved` (una alerta de pago marcada como resuelta).

alter table public.order_events drop constraint if exists order_events_kind_check;
alter table public.order_events add constraint order_events_kind_check check (kind = any (array[
  'placed', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'email',
  'refund', 'alert_resolved'
]));

-- ----- Comprobar que quien actúa es admin y dejarlo como actor del historial -----
create or replace function public.admin_act_as(p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_admin_id is null or not exists (
    select 1 from public.profiles where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'No tienes permiso para administrar pedidos' using hint = 'forbidden';
  end if;
  perform set_config('shop.actor_id', p_admin_id::text, true);
end $$;

-- ----- Confirmar una transferencia: settle_payment(…, 'paid', …) sobre su intento pendiente -----
create or replace function public.admin_confirm_transfer(p_order_id uuid, p_admin_id uuid, p_operation text default null)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order     public.orders%rowtype;
  v_pay       public.payments%rowtype;
  v_operation text := nullif(btrim(p_operation), '');
  v_state     public.order_status;
begin
  perform public.admin_act_as(p_admin_id);

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado' using hint = 'not_found';
  end if;
  if v_order.status <> 'pending' or v_order.payment_method is distinct from 'transfer' then
    raise exception 'El pedido no tiene una transferencia por confirmar' using hint = 'stale';
  end if;

  select * into v_pay from public.payments
   where order_id = p_order_id and provider = 'transfer' and status = 'pending'
   order by attempt desc
   limit 1
   for update;
  if not found then
    raise exception 'El pedido no tiene una transferencia pendiente' using hint = 'stale';
  end if;

  select s.order_state into v_state
    from public.settle_payment(
      v_pay.id,
      'paid',
      coalesce(v_pay.raw_response, '{}'::jsonb)
        || jsonb_build_object('confirmed_by', p_admin_id, 'confirmed_at', now(), 'operation_number', v_operation)
    ) s;

  -- El N.º de operación también en el evento `paid` que acaba de escribir el trigger
  if v_operation is not null then
    update public.order_events
       set data = data || jsonb_build_object('operation_number', v_operation)
     where id = (select id from public.order_events
                  where order_id = p_order_id and kind = 'paid'
                  order by created_at desc limit 1);
  end if;
  return v_state;
end $$;

-- ----- Empezar a preparar, marcar como enviado y marcar como entregado -----
create or replace function public.admin_advance_order(
  p_order_id uuid,
  p_admin_id uuid,
  p_from public.order_status,
  p_to public.order_status,
  p_carrier text default null,
  p_tracking text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  perform public.admin_act_as(p_admin_id);

  if not ((p_from = 'paid' and p_to = 'processing')
       or (p_from = 'processing' and p_to = 'shipped')
       or (p_from = 'shipped' and p_to = 'delivered')) then
    raise exception 'Cambio de estado no permitido: % → %', p_from, p_to using hint = 'transition';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado' using hint = 'not_found';
  end if;
  if v_order.status <> p_from then
    raise exception 'El pedido ya está en %', v_order.status using hint = 'stale';
  end if;

  if p_to = 'shipped' then
    update public.orders
       set status = 'shipped', carrier = nullif(btrim(p_carrier), ''), tracking_number = nullif(btrim(p_tracking), '')
     where id = p_order_id;
  else
    update public.orders set status = p_to where id = p_order_id;
  end if;
end $$;

-- ----- Anular desde la tienda: los intentos pendientes quedan failed y cancel_order('tienda') -----
create or replace function public.admin_cancel_order(p_order_id uuid, p_admin_id uuid, p_from public.order_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.order_status;
begin
  perform public.admin_act_as(p_admin_id);

  select status into v_status from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado' using hint = 'not_found';
  end if;
  if v_status <> p_from then
    raise exception 'El pedido ya está en %', v_status using hint = 'stale';
  end if;

  update public.payments
     set status = 'failed', raw_response = coalesce(raw_response, '{}'::jsonb) || '{"shop_reason": "cancelled"}'::jsonb
   where order_id = p_order_id and status = 'pending';

  -- service_role: auth.uid() es null, cancel_order lo trata como staff (pending, paid o processing)
  perform public.cancel_order(p_order_id, 'tienda', p_note);
end $$;

-- ----- Anulado → Reembolsado -----
-- p_manual = true: la transferencia que el admin devolvió a mano (decisión 5 del dueño): el intento
-- paid pasa a refunded. false: el reembolso ya se hizo en la pasarela y no queda ningún pago sin devolver.
create or replace function public.admin_mark_refunded(p_order_id uuid, p_admin_id uuid, p_manual boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_pay   public.payments%rowtype;
begin
  perform public.admin_act_as(p_admin_id);

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado' using hint = 'not_found';
  end if;
  if v_order.status <> 'cancelled' or v_order.paid_at is null then
    raise exception 'El pedido no está anulado con un pago' using hint = 'stale';
  end if;

  if p_manual then
    select * into v_pay from public.payments
     where order_id = p_order_id and provider = 'transfer' and status = 'paid'
     order by attempt desc limit 1
     for update;
    if not found then
      raise exception 'El pedido no tiene una transferencia pagada' using hint = 'stale';
    end if;
    update public.payments
       set status = 'refunded',
           raw_response = coalesce(raw_response, '{}'::jsonb)
             || jsonb_build_object('refund', jsonb_build_object('manual', true, 'by', p_admin_id, 'at', now()))
     where id = v_pay.id;
    insert into public.order_events (order_id, kind, actor, actor_id, data)
    values (p_order_id, 'refund', 'admin', p_admin_id,
            jsonb_build_object('provider', 'transfer', 'amount', v_pay.amount, 'reference', v_pay.reference, 'manual', true));
  else
    if exists (select 1 from public.payments where order_id = p_order_id and status = 'paid') then
      raise exception 'Todavía hay un pago sin devolver' using hint = 'stale';
    end if;
    if not exists (select 1 from public.payments where order_id = p_order_id and status = 'refunded') then
      raise exception 'El pedido no tiene un pago devuelto' using hint = 'stale';
    end if;
  end if;

  update public.orders set status = 'refunded' where id = p_order_id;
end $$;

-- ----- Marcar una alerta de pago como resuelta (queda en el historial del pedido) -----
create or replace function public.admin_resolve_alert(p_alert_id uuid, p_admin_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alert public.payment_alerts%rowtype;
begin
  perform public.admin_act_as(p_admin_id);

  update public.payment_alerts set resolved_at = now()
   where id = p_alert_id and resolved_at is null
  returning * into v_alert;
  if not found then
    return false;
  end if;

  if v_alert.order_id is not null then
    insert into public.order_events (order_id, kind, actor, actor_id, data)
    values (v_alert.order_id, 'alert_resolved', 'admin', p_admin_id,
            jsonb_build_object('alert_id', v_alert.id, 'alert_kind', v_alert.kind));
  end if;
  return true;
end $$;

-- Solo el backend (service_role); ni anon ni authenticated las pueden llamar como RPC
revoke all on function public.admin_act_as(uuid) from public, anon, authenticated;
revoke all on function public.admin_confirm_transfer(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_advance_order(uuid, uuid, public.order_status, public.order_status, text, text) from public, anon, authenticated;
revoke all on function public.admin_cancel_order(uuid, uuid, public.order_status, text) from public, anon, authenticated;
revoke all on function public.admin_mark_refunded(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.admin_resolve_alert(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_act_as(uuid) to service_role;
grant execute on function public.admin_confirm_transfer(uuid, uuid, text) to service_role;
grant execute on function public.admin_advance_order(uuid, uuid, public.order_status, public.order_status, text, text) to service_role;
grant execute on function public.admin_cancel_order(uuid, uuid, public.order_status, text) to service_role;
grant execute on function public.admin_mark_refunded(uuid, uuid, boolean) to service_role;
grant execute on function public.admin_resolve_alert(uuid, uuid) to service_role;
