-- Backend-managed Vibra administrator and a maximum of three registered concurrent sessions.
begin;
create table if not exists public.vibra_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now(), granted_by text not null,
 revoked_at timestamptz, revoked_by text
);
create table if not exists public.vibra_admin_sessions (
 session_id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 expires_at timestamptz not null, revoked_at timestamptz, user_agent_hash text
);
create index if not exists vibra_admin_sessions_user_active_idx on public.vibra_admin_sessions(user_id, expires_at) where revoked_at is null;
create table if not exists public.vibra_admin_audit (
 id bigint generated always as identity primary key, user_id uuid, session_id uuid,
 event text not null check(event in ('session_granted','session_denied_limit','session_released','admin_granted','admin_revoked')),
 detail jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.vibra_admins enable row level security;
alter table public.vibra_admin_sessions enable row level security;
alter table public.vibra_admin_audit enable row level security;
revoke all on public.vibra_admins, public.vibra_admin_sessions, public.vibra_admin_audit from public, anon, authenticated;

create or replace function public.vibra_is_current_admin() returns boolean
language sql stable security definer set search_path=public,auth,pg_temp as $$
 select exists(select 1 from public.vibra_admins a join public.vibra_admin_sessions s on s.user_id=a.user_id
 where a.user_id=auth.uid() and a.revoked_at is null
 and s.session_id::text=(auth.jwt()->>'session_id') and s.revoked_at is null and s.expires_at>now());
$$;
revoke all on function public.vibra_is_current_admin() from public,anon;
grant execute on function public.vibra_is_current_admin() to authenticated;

create or replace function public.vibra_has_active_subscription() returns boolean
language sql stable security definer set search_path=public,auth,pg_temp as $$
 select public.vibra_is_current_admin() or exists(
  select 1 from (select status,current_period_end from public.vibra_subscriptions where user_id=auth.uid() order by updated_at desc limit 1) latest
  where latest.status='active' and (latest.current_period_end is null or latest.current_period_end>now()));
$$;
revoke all on function public.vibra_has_active_subscription() from public,anon;
grant execute on function public.vibra_has_active_subscription() to authenticated;

create or replace function public.vibra_claim_admin_session(p_user_id uuid,p_session_id uuid,p_expires_at timestamptz,p_user_agent_hash text default null)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,934817));
 if not exists(select 1 from public.vibra_admins where user_id=p_user_id and revoked_at is null)
 then return jsonb_build_object('admin',false,'allowed',false); end if;
 delete from public.vibra_admin_sessions where expires_at<=now() or revoked_at is not null;
 if exists(select 1 from public.vibra_admin_sessions where session_id=p_session_id and user_id=p_user_id and revoked_at is null and expires_at>now()) then
  update public.vibra_admin_sessions set last_seen_at=now() where session_id=p_session_id;
  return jsonb_build_object('admin',true,'allowed',true);
 end if;
 select count(*) into n from public.vibra_admin_sessions where user_id=p_user_id and revoked_at is null and expires_at>now();
 if n>=3 then
  insert into public.vibra_admin_audit(user_id,session_id,event,detail) values(p_user_id,p_session_id,'session_denied_limit',jsonb_build_object('active_count',n));
  return jsonb_build_object('admin',true,'allowed',false,'reason','session_limit');
 end if;
 insert into public.vibra_admin_sessions(session_id,user_id,expires_at,user_agent_hash)
 values(p_session_id,p_user_id,least(p_expires_at,now()+interval '12 hours'),p_user_agent_hash);
 insert into public.vibra_admin_audit(user_id,session_id,event) values(p_user_id,p_session_id,'session_granted');
 return jsonb_build_object('admin',true,'allowed',true,'active_count',n+1);
end; $$;
create or replace function public.vibra_release_admin_session(p_user_id uuid,p_session_id uuid)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,934817));
 update public.vibra_admin_sessions set revoked_at=now() where user_id=p_user_id and session_id=p_session_id and revoked_at is null;
 insert into public.vibra_admin_audit(user_id,session_id,event) values(p_user_id,p_session_id,'session_released');
end; $$;
revoke all on function public.vibra_claim_admin_session(uuid,uuid,timestamptz,text) from public,anon,authenticated;
revoke all on function public.vibra_release_admin_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.vibra_claim_admin_session(uuid,uuid,timestamptz,text) to service_role;
grant execute on function public.vibra_release_admin_session(uuid,uuid) to service_role;
commit;
