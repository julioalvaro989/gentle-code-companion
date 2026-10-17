-- Vibra profile avatars: private storage, user-scoped paths, and profile reference.
-- Apply manually only after reviewing the current remote schema and RLS policies.

alter table public.fitness_profiles
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 1048576,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users can read own avatar objects" on storage.objects;
create policy "Users can read own avatar objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload own avatar objects" on storage.objects;
create policy "Users can upload own avatar objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update own avatar objects" on storage.objects;
create policy "Users can update own avatar objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete own avatar objects" on storage.objects;
create policy "Users can delete own avatar objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
