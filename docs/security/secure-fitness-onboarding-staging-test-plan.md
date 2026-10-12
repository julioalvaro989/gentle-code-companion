# Secure fitness onboarding writes — staging test plan

**Scope:** validate `supabase/migrations/20261012140000_secure_fitness_onboarding_updates.sql` and the client RPC integration in an isolated local Supabase stack or staging project only.

**Safety:** do not run against production. Use two disposable authenticated users (A and B), test-only profile rows, and remove those rows after testing. Never put real personal/health data in test fixtures.

## Preflight checks

1. Confirm the target project/ref and database environment explicitly.
2. Capture current table, column, sequence, function, and role grants; RLS flags and policies; table constraints/defaults; existing function owners/ACLs.
3. Confirm there are no other writers in deployed clients, scheduled jobs, scripts, or external integrations.
4. Confirm the migration file in Git is not being treated as proof that it was applied.
5. Apply the migration only after separate approval, to the disposable/local or staging environment.

## Test matrix

| Case | Setup / action | Expected result |
|---|---|---|
| Create profile | User A authenticated, no onboarding row; call RPC with an allowed patch and expected version `null` | One row created with `user_id = auth.uid()`; table defaults and constraints remain valid |
| Existing profile | User A has a row; call RPC with its exact `updated_at` | Allowed keys update and untouched JSONB keys remain unchanged |
| Unknown key | Include `user_id`, `status`, `completed_at`, or any unsupported key in patch | RPC rejects with invalid-parameter error; no row changes |
| Invalid values | Test wrong JSON types, session minutes below 10/above 240/fractional, budget below 0/above 100000, arrays over 30 entries, blank or >100-char strings, payload >16 KiB | RPC rejects; no partial changes |
| Unauthenticated | Call RPC without a valid JWT | Rejected with authorization error; no row created |
| Owner spoofing | Add `user_id` to patch or attempt REST insert/update with another user's UUID | RPC rejects unsupported key; direct REST write is denied |
| Optimistic conflict | Two sessions read same `updated_at`; first updates; second submits stale version | Second call returns serialization/conflict error and does not overwrite first update |
| Concurrent creation | Two sessions for User A call creation with expected version `null` simultaneously | At most one row; loser gets conflict and reloads |
| Missing vs stale | Existing row + null expected version; absent row + non-null expected version | Distinct conflict (`40001`) and missing-profile (`P0002`) outcomes |
| Isolation | User A and B each have distinct profile data; query/RPC from A tries to access B | A cannot read or mutate B; all writes remain scoped to `auth.uid()` |
| Direct INSERT | As `authenticated`, attempt REST `POST` to onboarding table, including allowed own `user_id` | Denied by database privileges after migration |
| Direct UPDATE | As `authenticated`, attempt REST `PATCH` on own row | Denied by database privileges after migration |
| Effective privileges | Inspect `has_table_privilege`, `has_column_privilege`, role memberships and grants to `PUBLIC` | Authenticated has no effective INSERT/UPDATE; if inherited grants remain, migration must fail closed |
| Privileged operations | Verify service_role and approved administrative workflows in isolated staging | Existing approved server-side flows still work; no new broad grants |
| Constraints/defaults | Create a row via RPC; inspect `status`, `created_at`, `completed_at`, `updated_at` | Defaults and check constraints are respected |
| Supabase failure | Temporarily simulate DB/network error in test environment | Client receives a safe error; no partial or cross-user write |
| Chat integration | With a Premium test user, send a request after profile change | Next response uses only that user's persisted profile; absent values remain unknown |
| Subscription | Repeat chat test with inactive/pending and active Premium test subscriptions | Existing subscription gate and usage limits remain unchanged |

## Privilege inspection queries

Run only in local/staging after applying the migration:

```sql
select
  has_table_privilege('authenticated', 'public.fitness_onboarding_profiles', 'INSERT') as can_insert_table,
  has_table_privilege('authenticated', 'public.fitness_onboarding_profiles', 'UPDATE') as can_update_table;

select a.attname,
       has_column_privilege('authenticated', 'public.fitness_onboarding_profiles', a.attname, 'INSERT') as can_insert_column,
       has_column_privilege('authenticated', 'public.fitness_onboarding_profiles', a.attname, 'UPDATE') as can_update_column
from pg_attribute a
where a.attrelid = 'public.fitness_onboarding_profiles'::regclass
  and a.attnum > 0 and not a.attisdropped
order by a.attnum;

select p.policyname, p.cmd, p.roles, p.qual, p.with_check
from pg_policies p
where p.schemaname = 'public'
  and p.tablename = 'fitness_onboarding_profiles';
```

Also inspect `pg_proc.proowner`, `prosecdef`, `proconfig`, `proacl`, inherited role memberships, and the migration history. The intended function owner is `postgres`, with a restricted search path and EXECUTE granted only to `authenticated` among API roles.

## Rollback

Do not restore broad table-wide grants by default. Coordinate rollback with a client version that no longer calls the RPC, revoke RPC EXECUTE, remove the function only after no clients depend on it, and restore only table/column grants captured before migration and explicitly approved. Re-test direct REST access and RLS in staging.

## Current execution status

This document is a test plan, not test evidence. No migration, deploy, or production data/permission change was performed while preparing it. Build/lint and these integration cases remain pending until an isolated local/staging runtime is available.
