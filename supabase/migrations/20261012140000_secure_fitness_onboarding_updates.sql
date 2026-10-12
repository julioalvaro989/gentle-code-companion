-- Secure onboarding profile writes through a validated RPC.
-- REVIEW ONLY: committing this file does not apply it to Supabase.
-- Assumptions are checked before privileges are changed. Existing rows and JSONB
-- keys are preserved; creation is allowed only when p_expected_updated_at is NULL.
begin;

do $preflight$
declare
  v_table oid := to_regclass('public.fitness_onboarding_profiles');
  v_missing text;
begin
  if v_table is null then
    raise exception 'Required table public.fitness_onboarding_profiles does not exist';
  end if;

  select string_agg(required.column_name, ', ')
    into v_missing
  from (values ('user_id'), ('answers'), ('updated_at')) as required(column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'fitness_onboarding_profiles'
      and c.column_name = required.column_name
  );

  if v_missing is not null then
    raise exception 'Missing required columns on fitness_onboarding_profiles: %', v_missing;
  end if;

  if not exists (
    select 1 from pg_index i
    where i.indrelid = v_table
      and i.indisunique
      and i.indisvalid
      and i.indpred is null
      and i.indexprs is null
      and (select array_agg(a.attname::text order by k.ordinality)
           from unnest(i.indkey) with ordinality as k(attnum, ordinality)
           join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
           where k.ordinality <= i.indnkeyatts) = array['user_id']::text[]
  ) then
    raise exception 'fitness_onboarding_profiles requires a valid unique constraint/index on user_id for safe single-profile creation';
  end if;

  if not exists (
    select 1 from pg_class c where c.oid = v_table and c.relrowsecurity
  ) then
    raise exception 'RLS must remain enabled on fitness_onboarding_profiles';
  end if;
end
$preflight$;

create or replace function public.update_own_fitness_onboarding_answers(
  p_patch jsonb,
  p_expected_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
set row_security = on
as $function$
declare
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_current_updated_at timestamptz;
  v_new_updated_at timestamptz := clock_timestamp();
  v_found boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_patch is null
     or pg_catalog.jsonb_typeof(p_patch) <> 'object'
     or p_patch = '{}'::jsonb
     or pg_catalog.pg_column_size(p_patch) > 16384 then
    raise exception 'Invalid update payload' using errcode = '22023';
  end if;

  for v_key in select pg_catalog.jsonb_object_keys(p_patch)
  loop
    if v_key not in ('sessionMinutes', 'equipment', 'foodBudget', 'dietaryRestrictions', 'preferredFoods', 'allergies', 'dislikedFoods') then
      raise exception 'Field is not editable: %', v_key using errcode = '22023';
    end if;
    v_value := p_patch -> v_key;

    if v_value = 'null'::jsonb then
      continue;
    end if;

    if v_key = 'sessionMinutes' then
      if pg_catalog.jsonb_typeof(v_value) <> 'number'
         or (v_value #>> '{}') !~ '^[0-9]+$'
         or (v_value #>> '{}')::numeric < 10
         or (v_value #>> '{}')::numeric > 240 then
        raise exception 'sessionMinutes must be an integer between 10 and 240 or null' using errcode = '22023';
      end if;
    elsif v_key = 'foodBudget' then
      if pg_catalog.jsonb_typeof(v_value) <> 'number'
         or (v_value #>> '{}')::numeric < 0
         or (v_value #>> '{}')::numeric > 100000 then
        raise exception 'foodBudget must be between 0 and 100000 or null' using errcode = '22023';
      end if;
    elsif v_key in ('equipment', 'dietaryRestrictions', 'preferredFoods', 'allergies', 'dislikedFoods') then
      if pg_catalog.jsonb_typeof(v_value) <> 'array'
         or pg_catalog.jsonb_array_length(v_value) > 30
         or exists (
           select 1
           from pg_catalog.jsonb_array_elements(v_value) as elements(item)
           where pg_catalog.jsonb_typeof(item) <> 'string'
              or pg_catalog.length(pg_catalog.btrim(item #>> '{}')) < 1
              or pg_catalog.length(pg_catalog.btrim(item #>> '{}')) > 100
         ) then
        raise exception '% must be an array of up to 30 strings, each 1 to 100 characters, or null', v_key using errcode = '22023';
      end if;
    end if;
  end loop;

  -- Lock the authenticated user's row before checking its version.
  select p.updated_at
    into v_current_updated_at
    from public.fitness_onboarding_profiles as p
   where p.user_id = v_user_id
   for update;
  v_found := found;

  if not v_found then
    if p_expected_updated_at is not null then
      raise exception 'Onboarding profile does not exist; reload the profile' using errcode = 'P0002';
    end if;

    begin
      insert into public.fitness_onboarding_profiles (user_id, answers, updated_at)
      values (v_user_id, p_patch, v_new_updated_at);
    exception when unique_violation then
      -- Another request created this user's row after our SELECT.
      raise exception 'Profile was created concurrently; reload and retry' using errcode = '40001';
    end;
    return v_new_updated_at;
  end if;

  if p_expected_updated_at is null then
    raise exception 'Profile already exists; reload before updating' using errcode = '40001';
  end if;

  if v_current_updated_at is distinct from p_expected_updated_at then
    raise exception 'Profile changed; reload and retry' using errcode = '40001';
  end if;

  update public.fitness_onboarding_profiles as p
     set answers = coalesce(p.answers, '{}'::jsonb) || p_patch,
         updated_at = v_new_updated_at
   where p.user_id = v_user_id;

  return v_new_updated_at;
end;
$function$;

-- Supabase migrations normally execute as postgres. Fail rather than leave the
-- SECURITY DEFINER function owned by an unexpected, potentially overprivileged role.
alter function public.update_own_fitness_onboarding_answers(jsonb, timestamptz) owner to postgres;

revoke all on function public.update_own_fitness_onboarding_answers(jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.update_own_fitness_onboarding_answers(jsonb, timestamptz) to authenticated;

-- Remove client INSERT/UPDATE paths at both table and column level.
-- Revoke from PUBLIC as well as the API roles. Do not touch service_role or
-- database-owner grants. RLS policies remain intact but are not a substitute
-- for server-side payload validation.
revoke insert, update on table public.fitness_onboarding_profiles
  from public, anon, authenticated;

do $privileges$
declare
  v_columns text;
  v_table oid := 'public.fitness_onboarding_profiles'::regclass;
  v_column record;
begin
  select pg_catalog.string_agg(pg_catalog.format('%I', a.attname), ', ' order by a.attnum)
    into v_columns
    from pg_catalog.pg_attribute a
   where a.attrelid = v_table
     and a.attnum > 0
     and not a.attisdropped;

  if v_columns is not null then
    execute pg_catalog.format(
      'revoke insert (%1$s), update (%1$s) on table public.fitness_onboarding_profiles from public, anon, authenticated',
      v_columns
    );
  end if;

  -- Fail closed if authenticated still receives either privilege through a
  -- grant to a role it inherits. We deliberately do not revoke from arbitrary
  -- shared parent roles because that could break unrelated applications.
  if pg_catalog.has_table_privilege('authenticated', v_table, 'INSERT')
     or pg_catalog.has_table_privilege('authenticated', v_table, 'UPDATE') then
    raise exception 'Authenticated retains table-level INSERT/UPDATE through another grant; inspect inherited role grants before applying';
  end if;

  for v_column in
    select a.attname
      from pg_catalog.pg_attribute a
     where a.attrelid = v_table
       and a.attnum > 0
       and not a.attisdropped
  loop
    if pg_catalog.has_column_privilege('authenticated', v_table, v_column.attname, 'INSERT')
       or pg_catalog.has_column_privilege('authenticated', v_table, v_column.attname, 'UPDATE') then
      raise exception 'Authenticated retains INSERT/UPDATE on column % through another grant; inspect inherited role grants before applying', v_column.attname;
    end if;
  end loop;
end
$privileges$;

commit;

-- ROLLBACK PLAN (review before use; do not blindly grant table-wide UPDATE):
-- 1. Deploy a client version that does not call this RPC and has a reviewed,
--    server-validated write path. Do not roll back privileges while clients still
--    depend on the RPC.
-- 2. Revoke EXECUTE from authenticated and drop the function.
-- 3. Restore only the exact prior table/column privileges proven by a captured
--    pg_class/pg_attribute/role_table_grants/column_privileges snapshot.
--    This migration intentionally does not include a guessed GRANT UPDATE.
-- 4. Re-test RLS and direct REST writes in staging before any production rollback.
