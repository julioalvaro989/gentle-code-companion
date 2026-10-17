-- Vibra user avatars: review-only migration.
-- This file is committed for review and is NOT applied to any remote Supabase project.
-- Avatars remain private; access is restricted to the authenticated owner folder.
begin;

do $preflight$
declare
  v_table oid := to_regclass('public.fitness_profiles');
  v_id_type text;
begin
  if v_table is null then
    raise exception 'Required table public.fitness_profiles does not exist';
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into v_id_type
    from pg_attribute a
   where a.attrelid = v_table
     and a.attname = 'id'
     and a.attnum > 0
     and not a.attisdropped;

  if v_id_type is distinct from 'uuid' then
    raise exception 'public.fitness_profiles.id must be uuid; found %', coalesce(v_id_type, 'missing');
  end if;

  if not exists (
    select 1 from pg_class c
    where c.oid = v_table and c.relrowsecurity
  ) then
    raise exception 'RLS must remain enabled on public.fitness_profiles';
  end if;
end
$preflight$;

alter table public.fitness_profiles
  add column if not exists avatar_path text;

-- Private bucket. Re-running this migration does not make an existing bucket public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', false, 1048576, array['image/webp']::text[])
on conflict (id) do update
  set public = false,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/webp']::text[];

-- Each account has one fixed object path: <auth.uid()>/avatar.webp.
-- A user cannot list, read, insert, replace, or delete another account's avatar.
drop policy if exists "Users can read their own avatar" on storage.objects;
create policy "Users can read their own avatar"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) = 'avatar.webp'
  );

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) = 'avatar.webp'
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) = 'avatar.webp'
  )
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) = 'avatar.webp'
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) = 'avatar.webp'
  );

commit;
