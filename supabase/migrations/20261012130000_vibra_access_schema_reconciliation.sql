-- Reconcile the deployed Vibra database with the authorization code.
-- Safe to apply after the older onboarding/admin migrations: all objects are guarded
-- or replaced, and client privileges remain least-privilege.
begin;

-- The deployed database initially had only the legacy fitness profile columns.
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
  on public.vibra_subscriptions(user_id,status,current_period_end desc);

create table if not exists public.vibra_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by text not null,
  revoked_at timestamptz,
  revoked_by text
);
create table if not exists public.vibra_admin_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent_hash text
);
create index if not exists vibra_admin_sessions_user_active_idx
  on public.vibra_admin_sessions(user_id,expires_at) where revoked_at is null;
create table if not exists public.vibra_admin_audit (
  id bigint generated always as identity primary key,
  user_id uuid,
  session_id uuid,
  event text not null check(event in ('session_granted','session_denied_limit','session_released','admin_granted','admin_revoked')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.vibra_admins enable row level security;
alter table public.vibra_admin_sessions enable row level security;
alter table public.vibra_admin_audit enable row level security;
revoke all on public.vibra_admins, public.vibra_admin_sessions, public.vibra_admin_audit from public, anon, authenticated;

create or replace function public.vibra_is_current_admin()
returns boolean language sql stable security definer
set search_path=public,auth,pg_temp as $$
  select exists (
    select 1 from public.vibra_admins a
    join public.vibra_admin_sessions s on s.user_id=a.user_id
    where a.user_id=auth.uid() and a.revoked_at is null
      and s.session_id::text=(auth.jwt()->>'session_id')
      and s.revoked_at is null and s.expires_at>now()
  );
$$;
revoke all on function public.vibra_is_current_admin() from public,anon;
grant execute on function public.vibra_is_current_admin() to authenticated;

create or replace function public.vibra_has_active_subscription()
returns boolean language sql stable security definer
set search_path=public,auth,pg_temp as $$
  select public.vibra_is_current_admin() or exists (
    select 1 from (
      select status,current_period_end from public.vibra_subscriptions
      where user_id=auth.uid() order by updated_at desc limit 1
    ) latest
    where latest.status='active'
      and (latest.current_period_end is null or latest.current_period_end>now())
  );
$$;
revoke all on function public.vibra_has_active_subscription() from public,anon;
grant execute on function public.vibra_has_active_subscription() to authenticated;

create or replace function public.vibra_claim_admin_session(
  p_user_id uuid,p_session_id uuid,p_expires_at timestamptz,p_user_agent_hash text default null
) returns jsonb language plpgsql security definer
set search_path=public,auth,pg_temp as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,934817));
  if not exists(select 1 from public.vibra_admins where user_id=p_user_id and revoked_at is null)
  then return jsonb_build_object('admin',false,'allowed',false); end if;

  delete from public.vibra_admin_sessions where expires_at<=now() or revoked_at is not null;
  if exists(select 1 from public.vibra_admin_sessions where session_id=p_session_id and user_id=p_user_id and revoked_at is null and expires_at>now()) then
    update public.vibra_admin_sessions
      set last_seen_at=now(),expires_at=least(p_expires_at,now()+interval '12 hours')
      where session_id=p_session_id;
    return jsonb_build_object('admin',true,'allowed',true);
  end if;

  select count(*) into n from public.vibra_admin_sessions
    where user_id=p_user_id and revoked_at is null and expires_at>now();
  if n>=3 then
    insert into public.vibra_admin_audit(user_id,session_id,event,detail)
      values(p_user_id,p_session_id,'session_denied_limit',jsonb_build_object('active_count',n));
    return jsonb_build_object('admin',true,'allowed',false,'reason','session_limit');
  end if;

  insert into public.vibra_admin_sessions(session_id,user_id,expires_at,user_agent_hash)
    values(p_session_id,p_user_id,least(p_expires_at,now()+interval '12 hours'),p_user_agent_hash);
  insert into public.vibra_admin_audit(user_id,session_id,event)
    values(p_user_id,p_session_id,'session_granted');
  return jsonb_build_object('admin',true,'allowed',true,'active_count',n+1);
end;
$$;

create or replace function public.vibra_release_admin_session(p_user_id uuid,p_session_id uuid)
returns void language plpgsql security definer
set search_path=public,auth,pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,934817));
  update public.vibra_admin_sessions set revoked_at=now()
    where user_id=p_user_id and session_id=p_session_id and revoked_at is null;
  insert into public.vibra_admin_audit(user_id,session_id,event)
    values(p_user_id,p_session_id,'session_released');
end;
$$;
revoke all on function public.vibra_claim_admin_session(uuid,uuid,timestamptz,text) from public,anon,authenticated;
revoke all on function public.vibra_release_admin_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.vibra_claim_admin_session(uuid,uuid,timestamptz,text) to service_role;
grant execute on function public.vibra_release_admin_session(uuid,uuid) to service_role;

-- Derive completion server-side; never trust a browser's completion flag alone.
create or replace function public.set_vibra_profile_completion()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  new.profile_completed :=
    char_length(trim(coalesce(new.username,'')))>=2
    and new.weight_kg is not null and new.height_cm is not null
    and new.primary_goal is not null and new.experience_level is not null
    and new.weekly_frequency is not null and new.training_location is not null;
  return new;
end;
$$;
drop trigger if exists set_vibra_profile_completion on public.fitness_profiles;
create trigger set_vibra_profile_completion
  before insert or update of username,weight_kg,height_cm,primary_goal,experience_level,
    weekly_frequency,training_location,profile_completed
  on public.fitness_profiles for each row execute function public.set_vibra_profile_completion();
revoke all on function public.set_vibra_profile_completion() from public,anon,authenticated;

alter table public.vibra_subscriptions enable row level security;
drop policy if exists vibra_subscriptions_select_own on public.vibra_subscriptions;
create policy vibra_subscriptions_select_own on public.vibra_subscriptions
  for select to authenticated using (user_id=(select auth.uid()));
revoke all privileges on table public.vibra_subscriptions from public,anon,authenticated;
grant select on table public.vibra_subscriptions to authenticated;
revoke insert,update,delete,truncate on public.vibra_subscriptions from anon,authenticated;

-- Keep the existing owner/admin policies and add a restrictive paid-access gate.
drop policy if exists fitness_profiles_requires_active_subscription on public.fitness_profiles;
create policy fitness_profiles_requires_active_subscription on public.fitness_profiles
  as restrictive for all to authenticated
  using (public.vibra_has_active_subscription())
  with check (public.vibra_has_active_subscription());
drop policy if exists fitness_progress_requires_active_subscription on public.fitness_progress;
create policy fitness_progress_requires_active_subscription on public.fitness_progress
  as restrictive for all to authenticated
  using (public.vibra_has_active_subscription())
  with check (public.vibra_has_active_subscription());

grant select on public.fitness_profiles,public.fitness_progress to authenticated;
revoke insert,update on public.fitness_profiles from anon,authenticated;
grant insert (id,username,email,goal,updated_at,birth_date,weight_kg,height_cm,primary_goal,
  experience_level,weekly_frequency,training_location,preferences,physical_limitations,profile_completed)
  on public.fitness_profiles to authenticated;
grant update (id,username,email,goal,updated_at,birth_date,weight_kg,height_cm,primary_goal,
  experience_level,weekly_frequency,training_location,preferences,physical_limitations,profile_completed)
  on public.fitness_profiles to authenticated;
grant insert (user_id,completed_exercises,water_glasses,goal,updated_at)
  on public.fitness_progress to authenticated;
grant update (completed_exercises,water_glasses,goal,updated_at)
  on public.fitness_progress to authenticated;

-- The deployed profiles table allowed authenticated users to update is_admin.
-- Remove table-wide write grants and only allow ordinary profile fields.
revoke insert,update,delete on public.profiles from public,anon,authenticated;
grant select on public.profiles to authenticated;
grant insert (id,full_name,email) on public.profiles to authenticated;
grant update (full_name,email) on public.profiles to authenticated;

commit;
