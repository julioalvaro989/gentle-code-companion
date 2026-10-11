# Vibra — payment gate, fitness profile, and AI context

## What is implemented in this branch

- Public plan selection before account creation; the selected plan is stored as signup intent in the URL and browser storage.
- Basic (R$ 29,90/month) and Premium (R$ 49,90/month) use the shared catalog in `src/lib/plans.ts`.
- Signup/login continue using the existing Supabase Auth methods. Signup does not create a completed fitness profile or grant entitlement.
- `/checkout` is a fail-closed status/refresh screen. It does not simulate a payment or pretend to start a checkout.
- `/fitness-profile` requires a valid Supabase session and an active subscription record. It loads/saves the user's profile by the authenticated user ID.
- Dashboard entry routes through subscription and profile checks.
- Migration `20261011090000_vibra_paid_access_and_fitness_profile.sql` adds fitness fields, a subscription ledger, own-row read policy for subscription status, and restrictive paid-access RLS policies for fitness profile/progress.
- The `fitness-chat` Edge Function validates the authenticated user server-side, requires an active Premium subscription and a completed profile, fetches profile context using service-role access, and conditionally includes physical limitations only when the latest message is about exercise/training/safety.
- OpenAI calls remain server-side and require `OPENAI_API_KEY`; no key is included in frontend code.

## Explicit integration blocker

The inspected repository contains no verified checkout provider integration, no provider webhook, and no trusted payment confirmation handler. Therefore this branch intentionally **does not create an active subscription**. Until a provider is selected/configured and a signed webhook or equivalent server-to-server verification is implemented, newly registered users will remain on `/checkout` and paid routes/data/chat remain blocked.

Before activation, the project owner must provide/confirm:
1. Payment provider and official checkout API documentation.
2. Server-side provider credentials in Supabase Edge Function secrets.
3. The provider's webhook signature verification requirements and event types for paid, failed, refunded, canceled, and recurring subscription states.
4. A deployment plan for the migration after establishing/validating the database migration baseline.
5. Staging test credentials and a test purchase/refund/cancellation cycle.

Do not set `vibra_subscriptions.status = 'active'` from a browser request, URL parameter, checkout return page, or client-side callback. Only trusted server-side code may write subscription rows.

## Supabase Edge Function secrets

The chat function requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or existing `SUPABASE_ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `ALLOWED_ORIGINS`. Keep all secret values in Supabase secrets, never in Vite `VITE_*` variables or source control.

## AI context

The service constructs context from the authenticated user's profile in Supabase, not from profile fields supplied by the browser. It does not load cross-user history or store chat history. Profile changes are read again on subsequent requests. Weight, height, goal, age when available, experience, frequency, training location, and preferences are passed as a compact object; physical limitations are added only for relevant exercise/safety questions.

## Validation status

The implementation has been inspected statically through GitHub file contents. Build, lint, SQL execution, Edge Function deployment, browser/console testing, real Supabase RLS tests, and payment provider/webhook tests have not been run in this environment. The migration is prepared only; it has not been applied to any database.
