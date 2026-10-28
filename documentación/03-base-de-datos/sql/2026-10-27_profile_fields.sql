-- M10 · profile_fields_m10 (fase 7.5, D-030): datos personales, RUT y novedades en profiles.
-- Idempotente. Aplicada con apply_migration el 27-10-2026.
--
-- - first_name / last_name: Datos personales pide nombre y apellido por separado; full_name se
--   mantiene (lo usan el saludo, la conversión del invitado y la 7.6) y la app lo escribe como
--   "nombre apellido" al guardar.
-- - rut: opcional (decisión 7a), normalizado como el checkout ("12345678-5"). El check solo valida
--   el formato; el dígito verificador lo valida la app (src/lib/format/rut.ts).
-- - phone: celular en E.164 ("+56912345678"), como addresses.phone.
-- - newsletter_opt_in_at: fecha en que aceptó recibir novedades; vacía = no (decisión 7b).
--   Desde un cliente (auth.uid() no nulo) la fecha la pone la BD: now() al activar y se conserva
--   mientras siga activa, así nadie puede escribir una fecha inventada.
-- - El cliente solo puede actualizar las columnas editables (grant por columna): no role, id ni
--   fechas. protect_profile_role sigue como segunda barrera.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists rut text,
  add column if not exists newsletter_opt_in_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_rut_format') then
    alter table public.profiles
      add constraint profiles_rut_format check (rut is null or rut ~ '^[1-9][0-9]{0,8}-[0-9K]$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_phone_format') then
    alter table public.profiles
      add constraint profiles_phone_format check (phone is null or phone ~ '^\+569[0-9]{8}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_name_length') then
    alter table public.profiles
      add constraint profiles_name_length check (
        coalesce(char_length(first_name), 0) <= 80
        and coalesce(char_length(last_name), 0) <= 80
        and coalesce(char_length(full_name), 0) <= 161
      );
  end if;
end $$;

-- Fecha de las novedades: la pone la BD cuando escribe un cliente
create or replace function public.stamp_newsletter_opt_in()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if new.newsletter_opt_in_at is null then
      return new;
    elsif tg_op = 'UPDATE' and old.newsletter_opt_in_at is not null then
      new.newsletter_opt_in_at := old.newsletter_opt_in_at;
    else
      new.newsletter_opt_in_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists stamp_newsletter_opt_in on public.profiles;
create trigger stamp_newsletter_opt_in
  before update of newsletter_opt_in_at on public.profiles
  for each row execute function public.stamp_newsletter_opt_in();

-- Crear cuenta: sin sesión hasta confirmar el correo, así que *Recibir novedades* viaja en los
-- metadatos del registro y se copia aquí una sola vez (la app no vuelve a leerlo de ahí)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, newsletter_opt_in_at)
  values (new.id,
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'avatar_url',
          case when new.raw_user_meta_data ->> 'newsletter' = 'true' then now() end)
  on conflict (id) do nothing;

  insert into public.carts (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

-- Lo que había en user_metadata.newsletter = true (7.2), con la fecha de creación de la cuenta
update public.profiles p
   set newsletter_opt_in_at = u.created_at
  from auth.users u
 where u.id = p.id
   and u.raw_user_meta_data ->> 'newsletter' = 'true'
   and p.newsletter_opt_in_at is null;

-- Columnas que puede editar un cliente (el RLS sigue limitando a su propia fila, o admin)
revoke update on public.profiles from anon, authenticated;
grant update (full_name, first_name, last_name, phone, rut, avatar_url, newsletter_opt_in_at)
  on public.profiles to authenticated;
