-- Vibra hydration history
-- REVIEW ONLY: do not apply until identity, RLS, and staging tests are approved.
-- Additive migration: preserves fitness_progress.water_glasses for compatibility.
begin;

create table if not exists public.hydration_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ml integer not null check (amount_ml between 1 and 5000),
  consumed_at timestamptz not null default now(),
  local_date date not null,
  timezone text not null,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hydration_entries_user_idempotency_unique unique (user_id, idempotency_key),
  constraint hydration_entries_timezone_length check (char_length(timezone) between 1 and 100)
);

create index if not exists hydration_entries_user_date_idx
  on public.hydration_entries (user_id, local_date, consumed_at desc);

alter table public.hydration_entries enable row level security;
alter table public.hydration_entries force row level security;

drop policy if exists hydration_entries_select_own on public.hydration_entries;
create policy hydration_entries_select_own
  on public.hydration_entries for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists hydration_entries_insert_own on public.hydration_entries;
create policy hydration_entries_insert_own
  on public.hydration_entries for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and amount_ml between 1 and 5000
    and local_date <= (now() at time zone timezone)::date
  );

drop policy if exists hydration_entries_update_own on public.hydration_entries;
create policy hydration_entries_update_own
  on public.hydration_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and amount_ml between 1 and 5000
    and char_length(timezone) between 1 and 100
  );

drop policy if exists hydration_entries_delete_own on public.hydration_entries;
create policy hydration_entries_delete_own
  on public.hydration_entries for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges on table public.hydration_entries from anon, authenticated;
grant select, insert, update, delete on table public.hydration_entries to authenticated;

commit;
