-- Proposed migration: secure, validated, optimistic-concurrency updates for onboarding answers.
-- Review before applying. This migration is NOT executed by committing this file.
begin;

create or replace function public.update_own_fitness_onboarding_answers(
  p_patch jsonb,
  p_expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_expected_updated_at is null
     or p_patch is null
     or jsonb_typeof(p_patch) <> 'object'
     or p_patch = '{}'::jsonb then
    raise exception 'Invalid update payload' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if v_key not in ('sessionMinutes', 'equipment', 'foodBudget', 'dietaryRestrictions', 'preferredFoods', 'allergies', 'dislikedFoods') then
      raise exception 'Field is not editable: %', v_key using errcode = '22023';
    end if;
    v_value := p_patch -> v_key;

    if v_value = 'null'::jsonb then
      continue;
    end if;

    if v_key = 'sessionMinutes' then
      if jsonb_typeof(v_value) <> 'number' then
        raise exception 'sessionMinutes must be an integer between 10 and 240' using errcode = '22023';
      end if;
      if (v_value #>> '{}') !~ '^[0-9]+$' then
        raise exception 'sessionMinutes must be an integer between 10 and 240' using errcode = '22023';
      end if;
      if (v_value #>> '{}')::numeric < 10 or (v_value #>> '{}')::numeric > 240 then
        raise exception 'sessionMinutes must be an integer between 10 and 240' using errcode = '22023';
      end if;
    elsif v_key = 'foodBudget' then
      if jsonb_typeof(v_value) <> 'number' then
        raise exception 'foodBudget must be between 0 and 100000' using errcode = '22023';
      end if;
      if (v_value #>> '{}')::numeric < 0 or (v_value #>> '{}')::numeric > 100000 then
        raise exception 'foodBudget must be between 0 and 100000' using errcode = '22023';
      end if;
    elsif v_key in ('equipment', 'dietaryRestrictions', 'preferredFoods', 'allergies', 'dislikedFoods') then
      if jsonb_typeof(v_value) <> 'array' then
        raise exception '% must be an array of up to 30 strings, each 1 to 100 characters', v_key using errcode = '22023';
      end if;
      if jsonb_array_length(v_value) > 30 then
        raise exception '% must be an array of up to 30 strings, each 1 to 100 characters', v_key using errcode = '22023';
      end if;
      if exists (
        select 1
        from jsonb_array_elements(v_value) as elements(item)
        where jsonb_typeof(item) <> 'string'
           or length(btrim(item #>> '{}')) < 1
           or length(btrim(item #>> '{}')) > 100
      ) then
        raise exception '% must be an array of up to 30 strings, each 1 to 100 characters', v_key using errcode = '22023';
      end if;
    end if;
  end loop;

  -- Atomic JSONB merge plus optimistic concurrency. No user_id is accepted
  -- from the caller; the authenticated UUID is the only row selector.
  update public.fitness_onboarding_profiles
     set answers = coalesce(answers, '{}'::jsonb) || p_patch,
         updated_at = clock_timestamp()
   where user_id = v_user_id
     and updated_at = p_expected_updated_at
  returning updated_at into v_updated_at;

  if v_updated_at is null then
    raise exception 'Profile changed or no onboarding row exists; reload and retry' using errcode = '40001';
  end if;

  return v_updated_at;
end;
$$;

-- The definer function checks auth.uid() explicitly and writes only that user's row.
-- Remove direct table UPDATE so clients cannot bypass validation/optimistic concurrency.
revoke update on table public.fitness_onboarding_profiles from anon, authenticated;
revoke all on function public.update_own_fitness_onboarding_answers(jsonb, timestamptz) from public, anon;
grant execute on function public.update_own_fitness_onboarding_answers(jsonb, timestamptz) to authenticated;

commit;

-- Rollback (only after coordinating clients; restoring direct UPDATE reopens bypass):
-- begin;
-- revoke execute on function public.update_own_fitness_onboarding_answers(jsonb, timestamptz) from authenticated;
-- drop function if exists public.update_own_fitness_onboarding_answers(jsonb, timestamptz);
-- grant update on table public.fitness_onboarding_profiles to authenticated;
-- commit;
