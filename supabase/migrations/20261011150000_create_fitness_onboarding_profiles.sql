-- Private per-user onboarding profile. Apply after reviewing against the active Supabase schema.
BEGIN;

CREATE TABLE IF NOT EXISTS public.fitness_onboarding_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT fitness_onboarding_completed_at_consistent CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status = 'pending' AND completed_at IS NULL)
  )
);

ALTER TABLE public.fitness_onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_onboarding_profiles FORCE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.fitness_onboarding_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.fitness_onboarding_profiles TO authenticated;

DROP POLICY IF EXISTS fitness_onboarding_select_own ON public.fitness_onboarding_profiles;
CREATE POLICY fitness_onboarding_select_own
  ON public.fitness_onboarding_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS fitness_onboarding_insert_own ON public.fitness_onboarding_profiles;
CREATE POLICY fitness_onboarding_insert_own
  ON public.fitness_onboarding_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fitness_onboarding_update_own ON public.fitness_onboarding_profiles;
CREATE POLICY fitness_onboarding_update_own
  ON public.fitness_onboarding_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
