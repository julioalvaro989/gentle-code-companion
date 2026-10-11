# Vibra test-admin access

## Server configuration

Set `VIBRA_TEST_ADMIN_USER_ID` as a server-only environment variable after confirming the intended account UUID through a trusted administrative procedure. Do not use a `VITE_` prefix and do not place it in browser storage, source code, URLs, or client-side config. No UUID is preconfigured. Missing or malformed values deny test access.

The server function uses the existing `requireSupabaseAuth` middleware to validate the Supabase access token and derive the user ID from validated claims. It then requires an exact match with the allowlisted UUID and confirms `profiles.is_admin = true` using the authenticated, RLS-scoped Supabase client. Any failure denies access. No service-role key is imported into the client bundle.

**Important:** do not configure the allowlist until the profile privilege migration has been reviewed and applied in a controlled environment; otherwise a pre-existing self-promotion path may undermine the admin flag.

## Navigation behavior

- Anonymous: `/` shows the landing/login; `/dashboard` and `/plans` redirect to `/?auth=login`.
- Signed-in non-allowlisted account: `/` and `/dashboard` redirect to `/plans`; `/plans` shows existing plan cards.
- Allowlisted account with `profiles.is_admin = true`: `/` shows the existing internal app; `/dashboard` and `/plans` redirect to `/`.

This route gate is not a substitute for server-side authorization/RLS on private data operations. The change does not create purchases, payments, subscriptions, or checkout access.

## Migration and rollback

The migration revokes table and column grants for `PUBLIC`, `anon`, and `authenticated`, then restores only `SELECT` for `authenticated`. It retains existing RLS policies, functions, and triggers and does not modify rows. The existing `handle_new_user` SECURITY DEFINER trigger is expected to create profiles; app profile edits use the separate fitness-profile tables. Validate signup and profile display in staging before production.

The prior full ACL/membership state has not been captured sufficiently to reconstruct an exact rollback. The rollback SQL therefore intentionally raises an exception instead of inventing broad grants. For a future rollback, first capture table ACLs, column ACLs, role memberships, PUBLIC grants, and effective privileges, then restore only grants confirmed by that snapshot.

No migration or rollback SQL has been executed.
