-- Weekly workout plans: versioned, user-owned plan snapshots.
-- This migration is committed for review only; it has NOT been applied to the remote database.
create table if not exists public.workout_plan_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  profile_snapshot jsonb not null default '{}'::jsonb,
  days jsonb not null,
  generation_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_plan_weeks_monday check (extract(isodow from week_start) = 1),
  constraint workout_plan_weeks_days_array check (jsonb_typeof(days) = 'array' and jsonb_array_length(days) = 7),
  constraint workout_plan_weeks_profile_object check (jsonb_typeof(profile_snapshot) = 'object'),
  constraint workout_plan_weeks_one_per_user_week unique (user_id, week_start)
);

create index if not exists workout_plan_weeks_user_week_idx
  on public.workout_plan_weeks (user_id, week_start desc);

alter table public.workout_plan_weeks enable row level security;
revoke all on public.workout_plan_weeks from anon, public, authenticated;
grant select, insert on public.workout_plan_weeks to authenticated;

drop policy if exists "Users can read own workout plans" on public.workout_plan_weeks;
create policy "Users can read own workout plans"
  on public.workout_plan_weeks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own workout plans" on public.workout_plan_weeks;
create policy "Users can create own workout plans"
  on public.workout_plan_weeks for insert to authenticated
  with check (auth.uid() = user_id);

create or replace function public.set_workout_plan_week_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists workout_plan_weeks_updated_at on public.workout_plan_weeks;
create trigger workout_plan_weeks_updated_at
before update on public.workout_plan_weeks
for each row execute function public.set_workout_plan_week_updated_at();

-- Plans are immutable once created. Regeneration creates a new version only after
-- an explicit replacement flow is implemented; direct UPDATE/DELETE is intentionally unavailable.
revoke all on function public.set_workout_plan_week_updated_at() from public, anon, authenticated;
