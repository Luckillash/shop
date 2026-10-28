-- M11 · reviews_m11 (fase 7.6, D-031): reseñas con firma *Nombre · Comuna*.
-- Idempotente. Aplicada con apply_migration el 28-10-2026.
--
-- - Política «reviews: compradores crean»: un pedido propio **entregado** con el producto
--   (decisión 3a; antes aceptaba paid, processing, shipped y delivered) y sin sesión anónima (3c).
-- - author_name / author_commune: la firma, copiada por un trigger security definer al publicar.
--   Nombre con la regla de greetingName (first_name o la primera palabra de full_name); comuna del
--   shipping_address del pedido entregado más reciente con el producto (null en el retiro en
--   tienda). El cliente no puede inventarlos y anon no necesita leer profiles. La firma queda la
--   del momento de publicar (no cambia si después cambia el nombre o se edita la reseña).
-- - Grant por columna (como M10): el cliente solo escribe product_id, rating, title y body;
--   user_id sale de auth.uid() (default) y la política lo exige; is_published sigue protegido por
--   guard_review_publication y además no tiene grant.
-- - Largo del texto en la BD: título opcional de hasta 80 caracteres, opinión de 20 a 2000.

alter table public.reviews
  add column if not exists author_name text,
  add column if not exists author_commune text;

alter table public.reviews alter column user_id set default auth.uid();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_title_length') then
    alter table public.reviews
      add constraint reviews_title_length check (title is null or char_length(btrim(title)) between 1 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_body_length') then
    alter table public.reviews
      add constraint reviews_body_length check (body is not null and char_length(btrim(body)) between 20 and 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_author_length') then
    alter table public.reviews
      add constraint reviews_author_length check (
        coalesce(char_length(author_name), 0) <= 80 and coalesce(char_length(author_commune), 0) <= 80
      );
  end if;
end $$;

-- Firma de la reseña. security definer: lee profiles y orders del autor sin depender del RLS.
-- Desde un cliente (auth.uid() no nulo) siempre la calcula la BD; sin nombre, no se publica
-- (el modal lo pide antes). Con service_role (SQL, sin auth.uid()) respeta lo que venga.
create or replace function public.set_review_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_commune text;
begin
  -- Una por usuario y producto (unique): con un mensaje claro en vez del de la restricción
  if exists (select 1 from public.reviews r where r.user_id = new.user_id and r.product_id = new.product_id) then
    raise exception 'Ya publicaste una opinión de este producto. Puedes editarla desde su ficha.'
      using errcode = '23505', constraint = 'reviews_product_id_user_id_key';
  end if;

  if (select auth.uid()) is null and new.author_name is not null then
    return new;
  end if;

  select (regexp_split_to_array(btrim(coalesce(nullif(btrim(p.first_name), ''), p.full_name, '')), '\s+'))[1]
    into v_name
    from public.profiles p
   where p.id = new.user_id;
  v_name := nullif(v_name, '');

  if v_name is null and (select auth.uid()) is not null then
    raise exception 'review_author_name_missing'
      using errcode = 'P0001', hint = 'Guarda tu nombre en Datos personales antes de publicar';
  end if;

  select case
           when o.shipping_method = 'pickup' or o.shipping_address ->> 'type' = 'pickup' then null
           else nullif(btrim(o.shipping_address ->> 'city'), '')
         end
    into v_commune
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
   where o.user_id = new.user_id
     and oi.product_id = new.product_id
     and o.status = 'delivered'
   order by coalesce(o.delivered_at, o.placed_at) desc, o.placed_at desc
   limit 1;

  new.author_name := left(v_name, 80);
  new.author_commune := left(v_commune, 80);
  return new;
end $$;

revoke execute on function public.set_review_author() from public, anon, authenticated;

drop trigger if exists set_review_author on public.reviews;
create trigger set_review_author
  before insert on public.reviews
  for each row execute function public.set_review_author();

-- Solo opina quien recibió el producto, con una cuenta (no invitado)
drop policy if exists "reviews: compradores crean" on public.reviews;
create policy "reviews: compradores crean" on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and ((select auth.jwt()) ->> 'is_anonymous')::boolean is not true
    and exists (
      select 1
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
       where oi.product_id = reviews.product_id
         and o.user_id = (select auth.uid())
         and o.status = 'delivered'
    )
  );

-- Columnas que puede escribir un cliente (el RLS sigue limitando a lo propio). «autor edita» y
-- «autor o admin borra» no cambian: con el grant, editar solo toca la calificación y el texto.
revoke insert, update on public.reviews from anon, authenticated;
revoke delete on public.reviews from anon;
grant insert (product_id, rating, title, body) on public.reviews to authenticated;
grant update (rating, title, body) on public.reviews to authenticated;
