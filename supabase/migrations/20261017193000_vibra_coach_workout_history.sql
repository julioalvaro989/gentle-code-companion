-- Vibra Coach: dated workout history.
-- Review-only migration. Do not apply remotely without explicit approval.
begin;

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'completed'
    check (status in ('planned', 'completed', 'partial', 'missed')),
  planned_for date,
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 600),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_completed_time_check
    check (status <> 'completed' or completed_at is not null)
);

create index if not exists workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc)
  where status in ('completed', 'partial');

create index if not exists workout_sessions_user_planned_idx
  on public.workout_sessions (user_id, planned_for asc)
  where status = 'planned';

create table if not exists public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text,
  exercise_name text not null check (char_length(exercise_name) between 1 and 160),
  position integer not null default 0 check (position between 0 and 100),
  created_at timestamptz not null default now(),
  unique (session_id, position),
  unique (id, user_id)
);

create table if not exists public.workout_exercise_sets (
  id uuid primary key default gen_random_uuid(),
  exercise_record_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  set_number integer not null check (set_number between 1 and 50),
  repetitions integer check (repetitions is null or repetitions between 0 and 1000),
  load_kg numeric(7,2) check (load_kg is null or load_kg between 0 and 2000),
  created_at timestamptz not null default now(),
  constraint workout_sets_exercise_owner_fk
    foreign key (exercise_record_id, user_id)
    references public.workout_session_exercises(id, user_id) on delete cascade,
  unique (exercise_record_id, set_number)
);

alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_exercise_sets enable row level security;

revoke all on public.workout_sessions from anon, public;
revoke all on public.workout_session_exercises from anon, public;
revoke all on public.workout_exercise_sets from anon, public;

grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_session_exercises to authenticated;
grant select, insert, update, delete on public.workout_exercise_sets to authenticated;

drop policy if exists "Users manage their own workout sessions" on public.workout_sessions;
create policy "Users manage their own workout sessions"
  on public.workout_sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users manage their own workout exercises" on public.workout_session_exercises;
create policy "Users manage their own workout exercises"
  on public.workout_session_exercises for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage their own workout sets" on public.workout_exercise_sets;
create policy "Users manage their own workout sets"
  on public.workout_exercise_sets for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.workout_session_exercises e
      where e.id = exercise_record_id and e.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.workout_session_exercises e
      where e.id = exercise_record_id and e.user_id = (select auth.uid())
    )
  );

commit;
