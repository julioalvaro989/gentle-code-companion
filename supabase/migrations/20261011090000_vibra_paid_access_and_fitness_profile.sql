-- Vibra: paid-access gate and reusable fitness onboarding profile.
-- This migration creates no paid entitlements. Only a verified server-side payment
-- integration using service_role may set status = 'active'.
begin;

alter table public.fitness_profiles
  add column if not exists birth_date date,
  add column if not exists weight_kg numeric(5,2),
  add column if not exists height_cm numeric(5,2),
  add column if not exists primary_goal text,
  add column if not exists experience_level text,
  add column if not exists weekly_frequency integer,
  add column if not exists training_location text,
  add column if not exists preferences text,
  add column if not exists physical_limitations text,
  add column if not exists profile_completed boolean not null default false;

alter table public.fitness_profiles
  add constraint fitness_profiles_primary_goal_check
    check (primary_goal is null or primary_goal in ('emagrecimento','hipertrofia','condicionamento','saude_geral')) not valid,
  add constraint fitness_profiles_experience_level_check
    check (experience_level is null or experience_level in ('iniciante','intermediario','avancado')) not valid,
  add constraint fitness_profiles_weekly_frequency_check
    check (weekly_frequency is null or weekly_frequency between 1 and 7) not valid,
  add constraint fitness_profiles_weight_kg_check
    check (weight_kg is null or weight_kg between 20 and 500) not valid,
  add constraint fitness_profiles_height_cm_check
    check (height_cm is null or height_cm between 80 and 250) not valid,
  add constraint fitness_profiles_training_location_check
    check (training_location is null or training_location in ('academia','casa','outro')) not valid,
  add constraint fitness_profiles_preferences_length_check
    check (preferences is null or char_length(preferences) <= 1500) not valid,
  add constraint fitness_profiles_limitations_length_check
    check (physical_limitations is null or char_length(physical_limitations) <= 1000) not valid;

create table if not exists public.vibra_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('basic','premium')),
  status text not null default 'pending'
    check (status in ('pending','active','past_due','canceled','refunded','failed')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  paid_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index if not exists vibra_subscriptions_user_status_idx
  on public.vibra_subscriptions (user_id, status, current_period_end desc);

-- Completion is derived in the database rather than trusted from a browser flag.
create or replace function public.set_vibra_profile_completion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $profile$
begin
  new.profile_completed :=
    char_length(trim(coalesce(new.username, ''))) >= 2
    and new.weight_kg is not null
    and new.height_cm is not null
    and new.primary_goal is not null
    and new.experience_level is not null
    and new.weekly_frequency is not null
    and new.training_location is not null;
  return new;
end;
$profile$;

drop trigger if exists set_vibra_profile_completion on public.fitness_profiles;
create trigger set_vibra_profile_completion
  before insert or update of username, weight_kg, height_cm, primary_goal,
    experience_level, weekly_frequency, training_location, profile_completed
  on public.fitness_profiles
  for each row execute function public.set_vibra_profile_completion();

revoke all on function public.set_vibra_profile_completion() from public, anon, authenticated;

alter table public.fitness_profiles enable row level security;
alter table public.vibra_subscriptions enable row level security;

-- A user may read only their own subscription status. Client roles cannot create
-- or mutate entitlements, even for their own user_id.
drop policy if exists vibra_subscriptions_select_own on public.vibra_subscriptions;
create policy vibra_subscriptions_select_own
  on public.vibra_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges on table public.vibra_subscriptions from anon, authenticated;
grant select on table public.vibra_subscriptions to authenticated;
revoke insert, update, delete, truncate on table public.vibra_subscriptions from anon, authenticated;

-- These column grants complement existing self-row RLS policies. They do not
-- grant access to another user's row and do not let clients edit subscription state.
grant select on table public.fitness_profiles, public.fitness_progress to authenticated;
grant insert (
  id, username, email, goal, updated_at, birth_date, weight_kg, height_cm,
  primary_goal, experience_level, weekly_frequency, training_location,
  preferences, physical_limitations, profile_completed
) on table public.fitness_profiles to authenticated;
grant update (
  id, username, email, goal, updated_at, birth_date, weight_kg, height_cm,
  primary_goal, experience_level, weekly_frequency, training_location,
  preferences, physical_limitations, profile_completed
) on table public.fitness_profiles to authenticated;

grant insert (user_id, completed_exercises, water_glasses, goal, updated_at)
  on table public.fitness_progress to authenticated;
grant update (user_id, completed_exercises, water_glasses, goal, updated_at)
  on table public.fitness_progress to authenticated;


-- A restrictive policy is ANDed with existing self/admin policies, so it can
-- enforce payment without replacing the project's existing row-ownership rules.
create or replace function public.vibra_has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $vibra$
  select exists (
    select 1
    from (
      select s.status, s.current_period_end
      from public.vibra_subscriptions s
      where s.user_id = auth.uid()
      order by s.updated_at desc
      limit 1
    ) latest
    where latest.status = 'active'
      and (latest.current_period_end is null or latest.current_period_end > now())
  );
$vibra$;

revoke all on function public.vibra_has_active_subscription() from public, anon;
grant execute on function public.vibra_has_active_subscription() to authenticated;

drop policy if exists fitness_profiles_requires_active_subscription on public.fitness_profiles;
create policy fitness_profiles_requires_active_subscription
  on public.fitness_profiles as restrictive for all to authenticated
  using (public.vibra_has_active_subscription())
  with check (public.vibra_has_active_subscription());

drop policy if exists fitness_progress_requires_active_subscription on public.fitness_progress;
create policy fitness_progress_requires_active_subscription
  on public.fitness_progress as restrictive for all to authenticated
  using (public.vibra_has_active_subscription())
  with check (public.vibra_has_active_subscription());

commit;
