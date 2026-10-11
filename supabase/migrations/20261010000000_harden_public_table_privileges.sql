-- Vibra / Supabase security audit
-- Prepared from read-only inspection of the configured database.
-- REVIEW ONLY: do not apply until the migration baseline and staging test plan are approved.
-- This migration changes privileges only; it does not create/drop tables or change data.

DO $$
DECLARE
  required_table text;
  table_oid oid;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'profiles',
    'fitness_profiles',
    'fitness_progress',
    'site_settings'
  ] LOOP
    table_oid := to_regclass(format('public.%I', required_table));
    IF table_oid IS NULL THEN
      RAISE EXCEPTION 'Required table public.% is missing; refusing to apply privilege changes', required_table;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      WHERE c.oid = table_oid
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled on public.%; refusing to apply this migration', required_table;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_admin'
      AND data_type = 'boolean'
  ) THEN
    RAISE EXCEPTION 'Expected public.profiles.is_admin boolean column; refusing to apply';
  END IF;

  -- Remove any explicit column-level grants first, since table-level REVOKE
  -- alone does not remove column-specific privileges.
  FOR required_table, table_oid IN
    SELECT c.relname, c.oid
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = ANY (ARRAY[
        'profiles',
        'fitness_profiles',
        'fitness_progress',
        'site_settings'
      ])
      AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES (%s) ON TABLE public.%I FROM anon, authenticated',
      (
        SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum)
        FROM pg_attribute a
        WHERE a.attrelid = table_oid
          AND a.attnum > 0
          AND NOT a.attisdropped
      ),
      required_table
    );
  END LOOP;
END
$$;

-- RLS remains enabled. These revokes remove unnecessary table-level privileges,
-- including TRUNCATE, which is not governed by row-level security.
REVOKE ALL PRIVILEGES ON TABLE
  public.profiles,
  public.fitness_profiles,
  public.fitness_progress,
  public.site_settings
FROM anon, authenticated;

-- Profiles: users can read their own profile, create a basic profile, and edit
-- ordinary profile fields. They must never be able to write is_admin.
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT INSERT (id, full_name, email)
  ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, email)
  ON TABLE public.profiles TO authenticated;

-- Fitness data: authenticated users receive only the operations used by the
-- app. Existing RLS policies still restrict rows to auth.uid() or fitness admins.
GRANT SELECT ON TABLE public.fitness_profiles TO authenticated;
GRANT INSERT (id, username, email, goal, updated_at)
  ON TABLE public.fitness_profiles TO authenticated;
GRANT UPDATE (id, username, email, goal, updated_at)
  ON TABLE public.fitness_profiles TO authenticated;

GRANT SELECT ON TABLE public.fitness_progress TO authenticated;
GRANT INSERT (user_id, completed_exercises, water_glasses, goal, updated_at)
  ON TABLE public.fitness_progress TO authenticated;
GRANT UPDATE (user_id, completed_exercises, water_glasses, goal, updated_at)
  ON TABLE public.fitness_progress TO authenticated;

-- Site settings are public-readable, but only authenticated admins can write
-- because the existing INSERT/UPDATE RLS policies call is_admin().
GRANT SELECT ON TABLE public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.site_settings TO authenticated;

-- Intentionally no DELETE grants for anon/authenticated on these four tables.
-- service_role and database-owner privileges are unchanged.
