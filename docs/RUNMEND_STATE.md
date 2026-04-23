# Runmend — Current State (as of 2026-04-23)

Runmend is an AI-powered automation health monitoring SaaS. It audits workflow configurations across **Make.com** and **n8n**, detects silent failures / expired credentials / broken webhooks / empty field mappings, and generates AI diagnostic reports via Claude. Built for agencies and ops teams running many client automations.

**Repo**: `/Users/dawidnawrocki/Desktop/runmend`
**Branch**: `main` (clean)
**Package name**: `runmend@0.1.0`
**Supabase project**: `hrcctyebejialsbdyyle` (US East)
**Test user**: `test@runmend.app` / `testpass123`

## Tech Stack (exact versions)

- **Framework**: Next.js 14.2.35 (App Router), React 18, TypeScript 5
- **Database/Auth**: Supabase — `@supabase/supabase-js@2.103.0`, `@supabase/ssr@0.10.2` (Postgres + Auth + RLS + Realtime)
- **AI**: `@anthropic-ai/sdk@0.80.0` — default model `claude-sonnet-4-5-20250929` (overridable via `CLAUDE_MODEL`)
- **Payments**: `stripe@22.0.1` (checkout, billing portal, webhooks, LTD)
- **Validation**: `zod@4.3.6`
- **Styling**: Tailwind `3.4.1` + shadcn `4.1.1` + `@base-ui/react@1.3.0` + `lucide-react`
- **Analytics**: PostHog (`posthog-js@1.364.1`)
- **Error tracking**: `@sentry/nextjs@10.48.0` (client config + `instrumentation.ts`)
- **Email**: `resend@6.10.0`
- **Testing**: Vitest `4.1.4` + `@vitest/coverage-v8@4.1.4` + Playwright `1.59.1`
- **CI/CD**: GitHub Actions → Vercel
- **Node default on Vercel**: 24 LTS (Fluid Compute)

## Scripts

`dev`, `build`, `start`, `lint`, `test`, `test:run`, `test:coverage`, `test:coverage:check` (CI-gate variant that disables threshold auto-update).

## Routing (App Router)

### Public

- `/` — Marketing homepage. Sections: Hero → LiveMonitor → Detectors → DiagnosticReport → DashboardTour → PlatformSync → Stats → HowItWorks → Pricing → Live demo (4 hardcoded profile cards) → CTA → Footer. Uses reduced-motion-aware primitives (FadeIn, CountUp, Sparkline, Typewriter, Shimmer).
- `/pricing` — PricingHero, PricingCards, ComparisonTable, PricingFAQ, PricingCTA.
- `/dashboard/[profileId]` — Public demo dashboards (4 hardcoded profiles, no auth). Fallback AI narratives used when `ANTHROPIC_API_KEY` absent.
- `/(auth)/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` — Email/password + Google + GitHub OAuth. No magic links.

### Authenticated — `/app/[workspaceSlug]/...`

- `/` — Workspace dashboard: Pulse metrics, detector strip (critical/warning/info rollup), worst-first profile cards (max 4), activity feed, first-time onboarding wizard, next-steps checklist.
- `/profiles` — Dense triage table with search + filters.
- `/profiles/[profileId]` — Profile dashboard (gauge, detector strip, grouped issues, Make.com deep-links, 2-column layout).
- `/profiles/new` — Create profile form.
- `/connections` — Health-focused catalog of Make.com/n8n connectors + interest voting on coming-soon platforms.
- `/billing` — Usage-first billing with invoice list + Stripe portal link.
- `/settings/{workspace,account,team,alerts,integrations,api,security,data,danger}` — 9-section left-rail IA.

### API Routes — `src/app/api/`

- `POST /api/billing/checkout` — Create Stripe checkout session
- `POST /api/billing/claim-ltd` — Claim LTD seat
- `GET /api/billing/invoices` — List user invoices
- `GET /api/billing/portal` — Redirect to Stripe billing portal
- `POST /api/billing/webhook` — Stripe webhook handler (idempotent via `stripe_webhook_events`)
- `GET|POST /api/connections`, `GET|POST|DELETE /api/connections/[connectionId]`, `POST /api/connections/[connectionId]/test`
- `POST /api/cron/sync` — Vercel Cron trigger (15-min cycle, 50s wall-clock budget, bearer-auth via `CRON_SECRET`, returns synced/failed/deferred counts)
- `POST /api/diagnostic/[profileId]` — Generate Claude diagnostic report
- `POST /api/issues/dismiss` — Dismiss an issue
- `GET /api/notifications`, `POST /api/notifications/[id]/read`, `POST /api/notifications/mark-all-read`
- `GET|POST /api/schedules/[profileId]` — Profile sync schedule
- `POST /api/sync/[profileId]` — Manual profile sync

## Data Layer

Four Supabase clients in `src/lib/supabase/`:
- `client.ts` (browser) · `server.ts` (SSR) · `admin.ts` (service role, bypasses RLS) · `middleware.ts` (session refresh)

Typed data access: `src/lib/queries/` — `workspaces`, `profiles`, `connections`, `diagnostics`, `notifications`, `schedules`, `subscriptions`. All DB access goes through here.

Types file: `src/lib/database.types.ts` (Supabase-generated, includes RPC function types).

## Database Schema (23 migrations under `supabase/migrations/`)

**Core**: `workspaces`, `users`, `workspace_members` (role)

**Profiles & issues**:
- `automation_profiles` (id, workspace_id, name, platform, health_score, **connection_id** [FK → platform_connections, NULLABLE for legacy], snoozed_until, industry, scenario_count)
- `automation_issues` (profile_id, name, type, severity, status, business_impact, recommendation, resolved_at)
- `profile_health_snapshots` (profile_id, captured_on, health_score, open_issue_count, critical_issue_count, automation_count) — daily trending

**Connections & automations**:
- `platform_connections` (workspace_id, platform [make|n8n], display_name, status, zone [us1/eu1/eu2/us2], team_id [Make], auth_type, access_token_encrypted, api_key_encrypted, refresh_token_encrypted, token_expires_at, instance_url [n8n])
- `automations` (profile_id, connection_id, external_id, name, status, trigger_type, total_runs, failed_runs, success_rate)
- `execution_logs` (automation_id, status, started_at, finished_at, data_in, data_out, error_message)

**Monitoring**: `notifications`, `notification_preferences` (JSON config), `audit_schedules` (cron_expression, next_run_at)

**Billing**: `subscriptions` (plan, status, **is_ltd**, ltd_purchased_at, billing_email/country/tax_id), `ltd_allocations` (total_seats, seats_sold), `stripe_webhook_events` (idempotency), `connection_interest`, `connection_requests`

**Diagnostics**: `diagnostic_reports` (model_used, overall_health, most_dangerous, recommendations, triggered_by, tokens_used)

**RLS helpers**: `get_user_workspace_ids()`, `get_user_admin_workspace_ids()` — gate all queries by membership.

**Key RPCs**: `update_automation_stats`, `update_profile_scenario_count`, `claim_ltd_seat`, `assert_profile_connection_match` (trigger).

**Highest-numbered migration on disk** is `20260425000001_stripe_webhook_events.sql` (webhook idempotency table). The **most recently committed** migration (commit `05330e9`, 2026-04-22) is `20260422000002_multi_connection_support.sql` — earlier number, shipped later. It added `automation_profiles.connection_id` FK with same-workspace + same-platform enforcement trigger, backfilled existing profiles to the first matching connection per platform/workspace, and **switched sync and fan-out to use `connection_id` explicitly instead of implicit platform-match.**

## Platform Integration Layer (`src/lib/platform-adapters/`)

Interface: `PlatformAdapter { testConnection(), fetchAutomations(), fetchExecutionLogs(since) }` — produced by `createAdapter(platform, credentials)`.

- **Make.com** (`make.ts`): Zones `us1` (default), `eu1`, `eu2`, `us2` baked into `https://{zone}.make.com/api/v2`. Org → team → scenario hierarchy; `discoverTeamId()` resolves from first org.
- **n8n** (`n8n.ts`): Self-hosted `instance_url` required (validated, trailing slash stripped). Auth via `X-N8N-API-KEY`. Cursor pagination (5 pages max, 250/page).
- **Zapier**: **Removed from v1** (unstable API). Legacy webhook_token columns exist in migrations 8–9 but are inert.
- **Retry**: all external calls wrapped in `fetchWithRetry()` (3 retries, exponential backoff + jitter) from `retry.ts`.

## Business Logic

### Sync engine (`src/lib/sync/engine.ts`) — per-profile

1. Load profile → resolve connection (prefer `connection_id`, fall back to platform-match for legacy; reject if ambiguous).
2. Decrypt credentials, instantiate adapter.
3. Fetch automations → bulk upsert on `(connection_id, external_id)` → `update_profile_scenario_count` RPC.
4. Fetch executions since `last_synced_at` → map external→DB IDs → bulk upsert on `(automation_id, external_id)`.
5. Compute health score.
6. Run issue detectors.
7. Persist `health_score`, `last_audit_at`, daily health snapshot, connection `last_synced_at`; call `update_automation_stats` RPC.

### Health score (`src/lib/sync/health-calculator.ts`)

Weighted 0–100: **error rate 40% · inactive ratio 20% · failure trend 20% · coverage 20%**.

### Issue detector (`src/lib/sync/issue-detector.ts`) — 6 rules

1. **Silent failure** — enabled automation with no executions
2. **High error rate** — >30% failures in last 24h
3. **Error spike** — 2× recent-vs-baseline
4. **Consecutive failures** — 5+ in a row
5. **Zombie automation** — long-inactive
6. **Credential expiration** — 7-day warning or already expired

### AI diagnostic (`src/lib/diagnostic/enhanced-prompt.ts`, `src/lib/queries/diagnostics.ts`)

Builds Claude prompt with execution stats + error patterns. Returns plain-text paragraphs (no markdown): `{ overallHealth, mostDangerousIssue, recommendations }`. Stores report + `tokens_used` + `triggered_by` in `diagnostic_reports`. Demo profiles ship fallback narratives when `ANTHROPIC_API_KEY` absent.

### Crypto (`src/lib/crypto.ts`)

AES-256-GCM for stored platform credentials. SHA-256 for token hashing. Requires 64-char hex `ENCRYPTION_KEY` (`openssl rand -hex 32`).

## Billing (Stripe)

**Plans**:
- `free` — 1 profile · 1 sync/day · 3 diagnostics/mo
- `starter` — $19/mo · 5 profiles · 4 syncs/day · 20 diagnostics/mo
- `pro` — $49/mo · 25 profiles · 24 syncs/day · unlimited diagnostics
- `enterprise` — unlimited (no published price)
- **LTD (Lifetime Deal)** — one-time payment, treated as Pro internally via `is_ltd` flag; `claim_ltd_seat` RPC reserves seat, refund if oversold

**Webhooks** (`/api/billing/webhook`): `checkout.session.completed` (handles both subscription and LTD payment modes), subscription events. Dedupe via `stripe_webhook_events` (PK violation = skip).

**Gating**: `checkPlanLimit()`; `resolveEffectivePlan()` treats LTD as Pro regardless of `plan` column.

**Env**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_LTD`.

## Security Layer

- `src/lib/security/redirect.ts` — OAuth callback allowlist: permits `/app`, `/dashboard`; rejects `//`, protocols, `%2f`-encoded.
- `src/lib/security/workspace-auth.ts` — `getWorkspaceMembership()` required on any API route accepting `workspaceId`, **after** auth check.
- `src/lib/validation/schemas.ts` — Zod schemas for every API route (connections, schedules, billing, diagnostics, notifications). Use `safeParse()` + `formatZodErrors()`.
- `src/lib/env.ts` — startup validation for critical env vars (`ENCRYPTION_KEY`, `STRIPE_WEBHOOK_SECRET`).
- `src/middleware.ts` — refreshes Supabase session on every non-static request; redirects unauthenticated users to `/login` and authenticated users away from auth pages to `/app`.

## Cron

`/api/cron/sync` runs every 15 min. Bearer-auth (`CRON_SECRET`). Requires Vercel Pro. Fetches due `audit_schedules`, syncs profiles within 50s budget, defers remainder. Supabase also has a `pg_cron` trigger (migration 13).

## Notifications

Channels: in-app (bell), email (Resend), Slack (stub), webhook (stub). Events: `issue_detected`, `credential_expiring`, `audit_complete`, `connection_error`. Per-channel severity filter, event×channel routing matrix, daily/weekly digest, quiet hours (with timezone detection), per-profile muting. Rules persist into `notification_preferences.config` jsonb via `normalizeConfig` helper.

## Demo Profiles (`src/data/profiles.ts`)

1. **Coastal Content Agency** — Make.com · 47 scenarios · health 34 · content agency, critical onboarding webhook failures
2. **GreenLeaf Commerce** — Make.com · 23 scenarios · health 62 · e-commerce, Stripe→Mailchimp failures, credential expiring
3. **Creator Stack** — Make.com · 15 scenarios · health 91 · online course, rate-limit warnings, zombie welcome email
4. **InfraFlow DevOps** — n8n · 31 workflows · health 52 · self-hosted infra (OOM, webhook tunnel expired, DB pool, credential rotation overdue)

## Testing

- **475 test files**
- CI coverage gate: **90% lines / 90% statements / 90% functions / 84% branches** (`test:coverage:check`)
- Scope: `src/lib/**`, `src/app/api/**/route.ts`, `src/app/**/actions.ts`, `src/middleware.ts`
- Excluded: `database.types.ts`, type defs, tests, pages/layouts, UI primitives, demo profiles, Supabase client factories
- Shared harness: `src/test/` — Supabase/Stripe/Anthropic mocks, typed factories, NextRequest helpers
- E2E: Playwright (CLAUDE.md global rule: always use Playwright MCP for testing/debugging)

## Environment Variables (from `.env.example`)

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`.
Payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_LTD`.
Optional: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `RESEND_API_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_APP_URL`.

## Key Patterns

- Path alias `@/*` → `./src/*`
- Tailwind via HSL CSS variables in `globals.css`, referenced in `tailwind.config.ts`
- Dark mode: class-based
- API response shape for diagnostic: `{ overallHealth, mostDangerousIssue, recommendations }` as plain text
- Bulk upserts + RPCs used throughout sync (no per-row loops)
- All external fetches wrapped in `fetchWithRetry()` (exponential backoff + jitter)
- All Supabase and Stripe setup goes through MCP per user global rule; Playwright MCP used for E2E/debugging

## Recent Milestone Timeline

- **Phases 1–8** (complete): Supabase foundation, auth, workspace CRUD, platform connections (Make + n8n), sync engine, AI diagnostics, notifications, Stripe billing
- **Phase 9** (complete): Security hardening — input validation, workspace auth, redirect protection, bulk DB ops, pagination, retry w/ backoff
- **Phase 10 — Ship** (complete): Zapier removed, Vercel Cron sync, baseline test suite, Sentry, security headers, GitHub Actions CI
- **Post-ship product waves**: public `/pricing`, LTD plan + invoice list + VAT mirroring, marketing homepage redesign (animated), profiles-as-table redesign, profile detail redesign with Make deep-links, connections-as-catalog redesign, settings redesign (9-section left-rail + alerts config surface), Make zone + team_id support, health snapshots for pulse trending, snooze, 90%+ coverage gate
- **2026-04-22**: **Multi-connection support** — profiles bind to specific connections via `automation_profiles.connection_id` (enables one profile per client with its own credentials; agencies no longer need one workspace per client). Includes unified add-connection modal, sonner toast system, create-profile modal, and a `ProfileConnectionWidget` on the profile detail that surfaces the bound connection and lets users re-bind in place.
- **Latest (2026-04-22, commit `488447d`)**: **Tab-switch perf wave** — per-request `React.cache` dedupe across `createClient`, workspace, subscription, and pulse loaders so the layout + page share one DB hit per request; parallelized waterfalls in `getWorkspacePulse`, `getConnectionsWithHealth`, `getWorkspaceProfileCards`, layout, and dashboard `Promise.all`; fixed double-fetch of `automation_profiles` in `getWorkspaceUsage`; route-level `loading.tsx` skeletons for dashboard / profiles / profile-detail / connections / billing / settings (instant paint on navigation); server-rendered initial notifications via the workspace layout (NotificationBell no longer fetches `/api/notifications` on mount); `experimental.optimizePackageImports` for `lucide-react`; new `src/lib/cache.ts` shim so `React.cache` works in RSC and is a safe no-op under Vitest (React 18.3 CJS doesn't expose `cache`).

## Things LLMs commonly get wrong about this repo

- **Zapier is OUT of v1.** Inert columns exist but no active code path. Don't suggest Zapier features.
- **Profiles bind to connections via `connection_id`** now — not implicit platform-match. The `assert_profile_connection_match` trigger enforces workspace+platform integrity.
- **Default Claude model is `claude-sonnet-4-5-20250929`**, overridable via `CLAUDE_MODEL`.
- **Sync is per-profile**, not per-workspace, since the multi-connection migration.
- **LTD ≠ a plan value** — `plan` column still says `pro`/`starter`/etc.; the `is_ltd` boolean is what `resolveEffectivePlan()` checks. Don't filter subscriptions by `plan='ltd'`.
- **No magic-link auth** — email/password + Google/GitHub OAuth only.
- **Coverage gate is 90/90/90/84** (branches lower because v8 branch coverage is strict). CI runs `test:coverage:check` so thresholds aren't auto-updated.
- **`vercel.json` has no cron schedule config** — cron is configured in Vercel dashboard + bearer-auth'd via `CRON_SECRET`. A separate `pg_cron` trigger exists in Supabase (migration 13).
- **Dashboard routes split**: `/dashboard/[profileId]` is the PUBLIC demo (no auth); `/app/[workspaceSlug]/...` is the authenticated SaaS. Don't conflate them.
- **Use `cache` from `src/lib/cache.ts`, not `react`'s `cache` directly** — the shim no-ops under Vitest (React 18.3 CJS doesn't expose `cache`), so importing from `react` will break tests. Wrap any RSC fetch shared between layout + child route to dedupe per request.
- **Every authenticated route segment must ship a `loading.tsx`** — the app relies on these for instant-paint navigation now that initial notifications + pulse data are server-rendered. Skipping it means a blocked navigation while the server query resolves.
