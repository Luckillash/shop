-- M12 · best_selling_products_m12 (fase 7.7, D-032): ranking de *Los más vendidos* del Inicio.
-- Idempotente (create or replace + revoke/grant). Aplicada con apply_migration el 28-10-2026.
--
-- - Fecha de inicio (decisión del dueño, 28-10-2026): la app pasa BEST_SELLERS_SINCE como p_since;
--   sin la variable no llama a la función y el Inicio muestra Destacados (los pedidos de hoy son
--   de prueba y la base es la misma para desarrollo y producción).
-- - El plan pedía security definer con EXECUTE para anon; se dejó security invoker solo para
--   service_role: nadie la puede llamar desde el cliente y no hay aviso nuevo en los advisors.
-- - Probada: con service_role devuelve Frasco 5, Paños 3, Taza 2, Florero 1, Difusor 1 (desde
--   2026-01-01); desde 2026-10-27, solo Frasco 2; con fecha futura, nada. anon y authenticated:
--   permission denied for function best_selling_products.

-- Los más vendidos del Inicio (M12, fase 7.7, D-032). Devuelve solo ids de producto y unidades.
-- Cuenta order_items de pedidos paid/processing/shipped/delivered pagados (paid_at) desde p_since
-- y dentro de los últimos p_window_days; solo productos activos con alguna variante activa con stock.
-- security invoker con EXECUTE solo para service_role (que salta RLS): anon y authenticated no la
-- pueden llamar por /rest/v1/rpc (el RLS tampoco les deja leer order_items ni orders).
create or replace function public.best_selling_products(
  p_since timestamptz,
  p_limit integer default 4,
  p_window_days integer default 90
)
returns table (product_id uuid, units bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select oi.product_id, sum(oi.quantity)::bigint as units
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where o.status in ('paid', 'processing', 'shipped', 'delivered')
    and o.paid_at >= greatest(p_since, now() - make_interval(days => greatest(p_window_days, 1)))
    and p.is_active
    and exists (
      select 1 from public.product_variants v
      where v.product_id = p.id and v.is_active and v.stock > 0
    )
  group by oi.product_id
  order by units desc, max(o.paid_at) desc, oi.product_id
  limit least(greatest(p_limit, 0), 24);
$$;

revoke all on function public.best_selling_products(timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.best_selling_products(timestamptz, integer, integer) to service_role;

comment on function public.best_selling_products(timestamptz, integer, integer) is
  'Los más vendidos (M12, D-032): unidades de pedidos paid/processing/shipped/delivered pagados desde p_since y dentro de p_window_days; solo productos activos con stock. Solo service_role.';
