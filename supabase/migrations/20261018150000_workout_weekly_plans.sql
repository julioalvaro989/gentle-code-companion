-- Existing frontend code already calls public.workout_sessions, but the remote schema
-- has no such table. Create the intended per-user history table before adding the
-- planned-session relation. fitness_progress is an aggregate (water/goal/JSON), not
-- a workout-session history, so it is not repurposed.
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  status text not null default 'completed' check (status in ('planned','completed','partial','missed')),
  planned_for date,
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 600),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc nulls last, created_at desc);
alter table public.workout_sessions enable row level security;
revoke all on public.workout_sessions from anon, public, authenticated;
grant select, insert on public.workout_sessions to authenticated;
drop policy if exists "Users can read own workout sessions" on public.workout_sessions;
create policy "Users can read own workout sessions" on public.workout_sessions
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own workout sessions" on public.workout_sessions;
create policy "Users can insert own workout sessions" on public.workout_sessions
  for insert to authenticated with check (auth.uid() = user_id);

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

-- A completion is unique for each planned date and links back to the existing
-- workout_sessions history instead of creating a second history system.
create table if not exists public.workout_plan_completions (
  id uuid primary key default gen_random_uuid(),
  plan_week_id uuid not null references public.workout_plan_weeks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_date date not null,
  workout_session_id uuid not null references public.workout_sessions(id) on delete restrict,
  completed_at timestamptz not null default now(),
  constraint workout_plan_completions_one_per_day unique (plan_week_id, planned_date),
  constraint workout_plan_completions_user_id_unique unique (user_id, workout_session_id)
);

alter table public.workout_plan_completions enable row level security;
revoke all on public.workout_plan_completions from anon, public, authenticated;
grant select on public.workout_plan_completions to authenticated;
drop policy if exists "Users can read own workout plan completions" on public.workout_plan_completions;
create policy "Users can read own workout plan completions"
  on public.workout_plan_completions for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.complete_workout_plan_day(p_plan_week_id uuid, p_planned_date date)
returns public.workout_plan_completions
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_row public.workout_plan_weeks;
  day_row jsonb;
  inserted_session public.workout_sessions;
  completion public.workout_plan_completions;
  day_title text;
  planned_minutes integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into plan_row
  from public.workout_plan_weeks
  where id = p_plan_week_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Plano não encontrado para esta conta.' using errcode = 'P0002';
  end if;

  select value into day_row
  from jsonb_array_elements(plan_row.days)
  where value->>'date' = p_planned_date::text;

  if day_row is null then
    raise exception 'Data não pertence a este plano semanal.' using errcode = '22023';
  end if;
  if day_row->>'status' = 'rest' then
    raise exception 'Dia de descanso não pode ser concluído como treino.' using errcode = '22023';
  end if;

  select * into completion
  from public.workout_plan_completions
  where plan_week_id = p_plan_week_id and planned_date = p_planned_date and user_id = auth.uid();

  if found then return completion; end if;

  day_title := left(coalesce(nullif(day_row->>'title',''), 'Treino planejado'), 160);
  planned_minutes := greatest(1, least(600, coalesce((day_row->>'estimatedMinutes')::integer, 1)));

  insert into public.workout_sessions
    (user_id, title, status, planned_for, started_at, completed_at, duration_minutes, notes)
  values
    (auth.uid(), day_title, 'completed', p_planned_date, null, now(), planned_minutes, 'Conclusão declarada da sessão planejada; séries, cargas e repetições realizadas não foram informadas.')
  returning * into inserted_session;

  insert into public.workout_plan_completions
    (plan_week_id, user_id, planned_date, workout_session_id)
  values
    (p_plan_week_id, auth.uid(), p_planned_date, inserted_session.id)
  returning * into completion;

  update public.workout_plan_weeks
  set days = (
    select jsonb_agg(
      case when value->>'date' = p_planned_date::text
        then jsonb_set(jsonb_set(value, '{status}', '"completed"'::jsonb), '{completedAt}', to_jsonb(now()::text), true)
        else value
      end order by ordinality
    )
    from jsonb_array_elements(plan_row.days) with ordinality
  )
  where id = p_plan_week_id and user_id = auth.uid();

  return completion;
end;
$$;

revoke all on function public.complete_workout_plan_day(uuid, date) from public, anon;
grant execute on function public.complete_workout_plan_day(uuid, date) to authenticated;

-- Ensure PostgREST refreshes its API schema after this migration is applied.
notify pgrst, 'reload schema';
