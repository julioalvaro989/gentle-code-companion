-- Vibra sleep tracker. Review and apply through the approved Supabase migration workflow.
-- This file is intentionally committed to GitHub only; it has NOT been applied to the remote database.

create table if not exists public.sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  quality_rating smallint,
  wake_feeling text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sleep_sessions_valid_interval check (ended_at is null or ended_at >= started_at),
  constraint sleep_sessions_duration_nonnegative check (duration_seconds is null or duration_seconds >= 0),
  constraint sleep_sessions_quality_range check (quality_rating is null or quality_rating between 1 and 5),
  constraint sleep_sessions_wake_feeling_valid check (wake_feeling is null or wake_feeling in ('refrescado','normal','cansado')),
  constraint sleep_sessions_notes_length check (notes is null or char_length(notes) <= 1000)
);

create index if not exists sleep_sessions_user_started_idx
  on public.sleep_sessions (user_id, started_at desc);
create unique index if not exists sleep_sessions_one_active_per_user_idx
  on public.sleep_sessions (user_id) where ended_at is null;

alter table public.sleep_sessions enable row level security;
revoke all on public.sleep_sessions from anon, public;
grant select, insert, update, delete on public.sleep_sessions to authenticated;

drop policy if exists "Users can read own sleep sessions" on public.sleep_sessions;
create policy "Users can read own sleep sessions"
  on public.sleep_sessions for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own sleep sessions" on public.sleep_sessions;
create policy "Users can insert own sleep sessions"
  on public.sleep_sessions for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own sleep sessions" on public.sleep_sessions;
create policy "Users can update own sleep sessions"
  on public.sleep_sessions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete own sleep sessions" on public.sleep_sessions;
create policy "Users can delete own sleep sessions"
  on public.sleep_sessions for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_sleep_session_duration()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.ended_at is null then
    new.duration_seconds := null;
  else
    new.duration_seconds := greatest(0, floor(extract(epoch from (new.ended_at - new.started_at)))::integer);
  end if;
  return new;
end;
$$;

drop trigger if exists sleep_sessions_calculate_duration on public.sleep_sessions;
create trigger sleep_sessions_calculate_duration
before insert or update of started_at, ended_at on public.sleep_sessions
for each row execute function public.set_sleep_session_duration();

create or replace function public.start_sleep_session()
returns public.sleep_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare created public.sleep_sessions;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.sleep_sessions (user_id, started_at)
  values (auth.uid(), now())
  returning * into created;
  return created;
exception
  when unique_violation then
    raise exception 'Já existe uma sessão de sono em andamento.' using errcode = '23505';
end;
$$;

create or replace function public.finish_sleep_session(
  p_session_id uuid,
  p_quality_rating smallint,
  p_wake_feeling text,
  p_notes text default null
)
returns public.sleep_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare finished public.sleep_sessions;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_quality_rating is not null and p_quality_rating not between 1 and 5 then
    raise exception 'Qualidade deve estar entre 1 e 5.' using errcode = '22023';
  end if;
  if p_wake_feeling is not null and p_wake_feeling not in ('refrescado','normal','cansado') then
    raise exception 'Opção de despertar inválida.' using errcode = '22023';
  end if;
  if p_notes is not null and char_length(p_notes) > 1000 then
    raise exception 'Observações excedem o limite.' using errcode = '22023';
  end if;

  update public.sleep_sessions
    set ended_at = now(),
        quality_rating = p_quality_rating,
        wake_feeling = p_wake_feeling,
        notes = nullif(p_notes, '')
    where id = p_session_id
      and user_id = auth.uid()
      and ended_at is null
  returning * into finished;

  if not found then
    raise exception 'Sessão ativa não encontrada para esta conta.' using errcode = 'P0002';
  end if;
  return finished;
end;
$$;

revoke all on function public.start_sleep_session() from public, anon;
revoke all on function public.finish_sleep_session(uuid, smallint, text, text) from public, anon;
grant execute on function public.start_sleep_session() to authenticated;
grant execute on function public.finish_sleep_session(uuid, smallint, text, text) to authenticated;
