-- Safe rollback guard; not an executable permission-restoration script.
-- Exact prior table/column grants and inherited memberships were not captured.
-- Restoring broad grants by assumption could re-open profiles.is_admin escalation.
DO $$
BEGIN
  RAISE EXCEPTION 'Rollback refused: capture and review exact prior ACLs and role memberships before restoring grants';
END
$$;
