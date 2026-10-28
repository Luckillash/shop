-- M13 · anon_cleanup_m13 (fase 7.8, D-033): limpieza de usuarios anónimos (invitados, D-008) sin
-- pedidos y sin actividad desde hace más de p_inactive_days. La llama el cron diario
-- (/api/cron/expirar-pedidos) con service_role. Idempotente (create or replace + revoke/grant).
-- Aplicada con apply_migration el 28-10-2026.
--
-- - SQL y no auth.admin.deleteUser (D-033): una sola transacción por ejecución (o se borran todos
--   los del lote o ninguno), sin una llamada HTTP por usuario, y la condición se vuelve a comprobar
--   en el mismo DELETE. Borrar de auth.users cae en cascada a identities, sessions, profiles y, desde
--   profiles, a addresses, carts (cart_items), wishlist_items y reviews.
-- - Nunca borra: una cuenta con correo, teléfono o un cambio de correo pendiente (el invitado que
--   pidió crear su cuenta, 7.2), un perfil que no sea customer (admin), ni a alguien que figure en
--   orders, coupon_redemptions, order_events (actor) o inventory_movements: esas FK quedan en null
--   al borrar y se perdería a quién pertenece un registro histórico.
-- - Actividad = la fecha más reciente entre created_at, last_sign_in_at y el último refresco de
--   alguna de sus sesiones (un invitado con el carro abierto renueva el token cada hora).
-- - Carrera con place_order: insertar un pedido toma FOR KEY SHARE sobre la fila de profiles. Antes
--   de borrar se bloquean esos perfiles (FOR UPDATE) y el DELETE vuelve a comprobar orders con una
--   foto nueva: un pedido que se estaba creando espera o deja al usuario fuera.
-- - p_dry_run: solo cuenta (el cron lo usa mientras ANON_CLEANUP_ENABLED no sea true).
-- - Probada en una transacción revertida: borra solo el anónimo inactivo sin pedidos; deja al
--   anónimo con pedido, al reciente, al activo por sesión, al de correo pendiente, al cliente con
--   correo y al admin. anon y authenticated: permission denied for function.

create or replace function public.delete_stale_anonymous_users(
  p_inactive_days integer default 30,
  p_limit integer default 500,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_deleted integer := 0;
begin
  if p_inactive_days is null or p_inactive_days < 1 then
    raise exception 'p_inactive_days debe ser 1 o más';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'p_limit debe estar entre 1 y 1000';
  end if;

  select coalesce(array_agg(c.id), '{}') into v_ids
  from (
    select u.id
    from auth.users u
    where u.is_anonymous is true
      and u.email is null
      and u.phone is null
      and coalesce(u.email_change, '') = ''
      and greatest(
            u.created_at,
            u.last_sign_in_at,
            (select max(greatest(s.updated_at, s.refreshed_at at time zone 'UTC'))
             from auth.sessions s where s.user_id = u.id)
          ) < now() - make_interval(days => p_inactive_days)
      and not exists (select 1 from public.profiles p where p.id = u.id and p.role <> 'customer')
      and not exists (select 1 from public.orders o where o.user_id = u.id)
      and not exists (select 1 from public.coupon_redemptions r where r.user_id = u.id)
      and not exists (select 1 from public.order_events e where e.actor_id = u.id)
      and not exists (select 1 from public.inventory_movements m where m.created_by = u.id)
    order by u.created_at
    limit p_limit
    for update of u skip locked
  ) c;

  if p_dry_run or cardinality(v_ids) = 0 then
    return jsonb_build_object('checked', cardinality(v_ids), 'deleted', 0);
  end if;

  -- Espera a los pedidos que se estén creando para estos perfiles (ver la carrera, arriba)
  perform 1 from public.profiles p where p.id = any(v_ids) for update;

  delete from auth.users u
  where u.id = any(v_ids)
    and u.is_anonymous is true
    and not exists (select 1 from public.orders o where o.user_id = u.id)
    and not exists (select 1 from public.coupon_redemptions r where r.user_id = u.id);
  get diagnostics v_deleted = row_count;

  return jsonb_build_object('checked', cardinality(v_ids), 'deleted', v_deleted);
end;
$$;

revoke all on function public.delete_stale_anonymous_users(integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.delete_stale_anonymous_users(integer, integer, boolean) to service_role;

comment on function public.delete_stale_anonymous_users(integer, integer, boolean) is
  'Limpieza de anónimos (M13, D-033): borra hasta p_limit usuarios anónimos sin correo, sin pedidos ni registros históricos y sin actividad desde hace p_inactive_days. Devuelve { checked, deleted }. Solo service_role (cron diario).';
