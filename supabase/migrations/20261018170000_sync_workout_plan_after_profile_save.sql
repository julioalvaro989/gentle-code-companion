-- Regenerate a user's weekly plan after saving their profile while preserving
-- completed sessions. This migration is committed for review and is not applied remotely.
create or replace function public.sync_own_workout_plan_week(
  p_week_start date,
  p_profile_snapshot jsonb,
  p_days jsonb,
  p_generation_version integer default 1
)
returns public.workout_plan_weeks
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  plan_row public.workout_plan_weeks;
  merged_days jsonb;
  day_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_week_start is null or extract(isodow from p_week_start) <> 1 then
    raise exception 'A semana precisa começar na segunda-feira.' using errcode = '22023';
  end if;
  if p_profile_snapshot is null or jsonb_typeof(p_profile_snapshot) <> 'object' then
    raise exception 'O resumo do perfil é inválido.' using errcode = '22023';
  end if;
  if p_days is null or jsonb_typeof(p_days) <> 'array' then
    raise exception 'Os dias do plano são inválidos.' using errcode = '22023';
  end if;
  select count(*) into day_count from jsonb_array_elements(p_days);
  if day_count <> 7 then
    raise exception 'O plano semanal precisa conter sete dias.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_days) with ordinality d(value, ordinality)
    where d.value->>'date' is null
       or (d.value->>'date')::date <> p_week_start + (d.ordinality - 1)::integer
       or d.value->>'status' is null
       or d.value->>'status' not in ('planned', 'rest')
       or jsonb_typeof(d.value->'exercises') <> 'array'
  ) then
    raise exception 'O plano contém dias ou exercícios inválidos.' using errcode = '22023';
  end if;

  select * into plan_row
  from public.workout_plan_weeks
  where user_id = current_user_id and week_start = p_week_start
  for update;

  if not found then
    insert into public.workout_plan_weeks
      (user_id, week_start, profile_snapshot, days, generation_version)
    values
      (current_user_id, p_week_start, p_profile_snapshot, p_days, greatest(coalesce(p_generation_version, 1), 1))
    returning * into plan_row;
    return plan_row;
  end if;

  -- Keep any day that already has a completion record exactly as it was saved.
  select jsonb_agg(
    case when exists (
      select 1
      from public.workout_plan_completions c
      where c.plan_week_id = plan_row.id
        and c.user_id = current_user_id
        and c.planned_date = (incoming.value->>'date')::date
    ) then (
      select previous.value
      from jsonb_array_elements(plan_row.days) previous(value)
      where previous.value->>'date' = incoming.value->>'date'
      limit 1
    ) else incoming.value end
    order by incoming.ordinality
  )
  into merged_days
  from jsonb_array_elements(p_days) with ordinality incoming(value, ordinality);

  update public.workout_plan_weeks
  set profile_snapshot = p_profile_snapshot,
      days = merged_days,
      generation_version = greatest(coalesce(p_generation_version, 1), 1),
      updated_at = now()
  where id = plan_row.id and user_id = current_user_id
  returning * into plan_row;

  return plan_row;
end;
$$;

revoke all on function public.sync_own_workout_plan_week(date, jsonb, jsonb, integer) from public, anon;
grant execute on function public.sync_own_workout_plan_week(date, jsonb, jsonb, integer) to authenticated;

notify pgrst, 'reload schema';
