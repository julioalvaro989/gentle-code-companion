-- Versioned proposal. Apply only after review and staging validation.
-- Removes client write grants that could permit self-promotion via profiles.is_admin.
-- Does not change rows, RLS policies, functions, triggers, owners, or service_role grants.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES (id, full_name, email, created_at, is_admin)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

-- Keep authenticated profile reads; existing RLS policies still constrain rows.
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Do not grant INSERT/UPDATE to browser roles. The existing SECURITY DEFINER
-- handle_new_user trigger creates profile rows. Profile editing in the app uses
-- fitness-profile tables, not public.profiles.

DO $$
DECLARE
  role_name text;
  privilege_name text;
  column_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.profiles'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'public.profiles must exist with RLS enabled';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH privilege_name IN ARRAY ARRAY[
      'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ] LOOP
      IF has_table_privilege(role_name, 'public.profiles', privilege_name) THEN
        RAISE EXCEPTION
          'Unexpected inherited/table privilege % for % on public.profiles; review memberships and PUBLIC grants',
          privilege_name, role_name;
      END IF;
    END LOOP;

    FOR column_name IN
      SELECT attname FROM pg_attribute
      WHERE attrelid = 'public.profiles'::regclass
        AND attnum > 0 AND NOT attisdropped
    LOOP
      FOREACH privilege_name IN ARRAY ARRAY['INSERT', 'UPDATE', 'REFERENCES'] LOOP
        IF has_column_privilege(role_name, 'public.profiles', column_name, privilege_name) THEN
          RAISE EXCEPTION
            'Unexpected inherited column privilege % for % on public.profiles.%; review memberships and PUBLIC grants',
            privilege_name, role_name, column_name;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END
$$;

COMMIT;
