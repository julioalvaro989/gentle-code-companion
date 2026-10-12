-- Proposed migration: structured, optional fitness and nutrition preferences.
-- Reviewed against the connected schema on 2026-10-12. NOT applied by this file.
-- Existing fitness_profiles.preferences remains the source for general free-form preferences.
begin;

alter table public.fitness_profiles
  add column if not exists training_session_minutes integer,
  add column if not exists available_equipment text[],
  add column if not exists monthly_food_budget_brl numeric(8,2),
  add column if not exists dietary_restrictions text[],
  add column if not exists dietary_preferences text[];

do $constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'fitness_profiles_session_minutes_check' and conrelid = 'public.fitness_profiles'::regclass) then
    alter table public.fitness_profiles add constraint fitness_profiles_session_minutes_check
      check (training_session_minutes is null or training_session_minutes between 10 and 240) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fitness_profiles_food_budget_check' and conrelid = 'public.fitness_profiles'::regclass) then
    alter table public.fitness_profiles add constraint fitness_profiles_food_budget_check
      check (monthly_food_budget_brl is null or monthly_food_budget_brl between 0 and 100000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fitness_profiles_equipment_array_check' and conrelid = 'public.fitness_profiles'::regclass) then
    alter table public.fitness_profiles add constraint fitness_profiles_equipment_array_check
      check (available_equipment is null or (cardinality(available_equipment) <= 30 and array_position(available_equipment, null) is null and array_to_string(available_equipment, '') is not null)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fitness_profiles_dietary_restrictions_check' and conrelid = 'public.fitness_profiles'::regclass) then
    alter table public.fitness_profiles add constraint fitness_profiles_dietary_restrictions_check
      check (dietary_restrictions is null or (cardinality(dietary_restrictions) <= 30 and array_position(dietary_restrictions, null) is null)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fitness_profiles_dietary_preferences_check' and conrelid = 'public.fitness_profiles'::regclass) then
    alter table public.fitness_profiles add constraint fitness_profiles_dietary_preferences_check
      check (dietary_preferences is null or (cardinality(dietary_preferences) <= 30 and array_position(dietary_preferences, null) is null)) not valid;
  end if;
end;
$constraints$;

-- Keep existing owner-based RLS policies unchanged. These fields live on the
-- same per-user profile row and inherit its existing auth.uid() checks.
commit;
