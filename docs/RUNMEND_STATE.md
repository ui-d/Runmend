# Runmend — Current State (as of 2026-05-15)

> Snapshot for external LLM analysis. Self-contained: everything an outside reviewer needs to reason about the codebase without reading it. Verified against the working tree at commit `d71a85c` on `main` (clean).

Runmend is production monitoring for **Make.com** and **n8n** agencies. Multi-zone Make (us1/eu1/eu2/us2) + self-hosted n8n, six failure detectors per audit, Claude-written post-mortems, per-channel alerting, and a new **Pre-flight Check** suite that runs real inputs against assertions to catch drift before it ships. Built for ops teams running many client automations in production where being told before the client tells you matters.

**Repo**: `/Users/dawidnawrocki/Desktop/runmend`
**Branch**: `main` (clean) · **HEAD**: `d71a85c`
**Package**: `runmend@0.1.0`
**Supabase project**: `hrcctyebejialsbdyyle` (US East)
**Test user**: `test@runmend.app` / `testpass123`

## Tech Stack (exact versions)

- **Framework**: Next.js 14.2.35 (App Router), React 18, TypeScript 5
- **Database/Auth**: Supabase — `@supabase/supabase-js@2.103.0`, `@supabase/ssr@0.10.2` (Postgres + Auth + RLS + Realtime)
- **AI**: `@anthropic-ai/sdk@0.80.0` — default model `claude-sonnet-4-5-20250929` (overridable via `CLAUDE_MODEL`)
- **Payments**: `stripe@22.0.1` (checkout, billing portal, webhooks, LTD)
- **Validation**: `zod@4.3.6`; `ajv@8.17.1` (JSON Schema engine for the Pre-flight `json_schema_valid` assertion)
- **Styling**: Tailwind `3.4.1` (+ `tailwind-merge@3.5.0`) + shadcn `4.1.1` + `@base-ui/react@1.3.0` + `lucide-react@1.7.0`
- **UI extras**: `sonner@2.0.7` (toasts), `recharts@2.13.3` (charts), `react-diff-viewer-continued@3.4.0` (Pre-flight drift diffs), `class-variance-authority`, `clsx`
- **Analytics**: PostHog (`posthog-js@1.364.1`) — gated behind cookie consent
- **Error tracking**: `@sentry/nextjs@10.48.0` (client config + `instrumentation.ts`)
- **Email**: `resend@6.10.0`
- **Testing**: Vitest `4.1.4` + `@vitest/coverage-v8@4.1.4` + Playwright `1.59.1`
- **CI/CD**: GitHub Actions → Vercel
- **Node default on Vercel**: 24 LTS (Fluid Compute)

## Scripts

`dev`, `build`, `start`, `lint`, `test`, `test:run`, `test:coverage`, `test:coverage:check` (CI-gate variant that disables Vitest threshold auto-update so coverage can only go up, never silently lower the bar).

## Routing (App Router)

### Public

- `/` — Marketing homepage. Hero → LiveMonitor → Detectors → DiagnosticReport → DashboardTour → PlatformSync → Stats → HowItWorks → Pricing → Live demo (4 hardcoded profile cards) → CTA → Footer. Reduced-motion-aware primitives (FadeIn, CountUp, Sparkline, Typewriter, Shimmer). Repositioned as "production monitoring for Make/n8n agencies"; includes pilot testimonials and a founder credit.
- `/pricing` — PricingHero, PricingCards, ComparisonTable, PricingFAQ, PricingCTA. Now surfaces the **Agency** tier and a "Benchmarks coming soon" item.
- `/vs-claude-cowork` — Honest side-by-side comparison page (positioning vs. an adjacent tool).
- `/dashboard/[profileId]` — **Public demo dashboards** (4 hardcoded profiles, no auth). Fallback AI narratives used when `ANTHROPIC_API_KEY` absent.
- `/(auth)/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` — Email/password + Google + GitHub OAuth. No magic links. (`/auth/callback` is a route handler, not a page.)

### Authenticated — `/app/[workspaceSlug]/...`

- `/app` — entry redirect into the user's workspace.
- `/` — Workspace dashboard: Pulse metrics, detector strip (critical/warning/info rollup), worst-first profile cards (max 4), activity feed, first-time onboarding wizard, next-steps checklist.
- `/profiles` — Dense triage table with search + filters.
- `/profiles/new` — Create profile form.
- `/profiles/[profileId]` — Profile dashboard (gauge, detector strip, grouped issues, Make.com deep-links, 2-column layout, profile-connection widget).
- `/profiles/[profileId]/diagnostics` — AI diagnostic report history for a profile.
- `/scenarios` — **Pre-flight Check** suite list.
- `/scenarios/new` — Create a scenario (inputs + assertions).
- `/scenarios/[id]` — Scenario detail + run history.
- `/scenarios/[id]/runs/[runId]` — Single run detail (per-input results, assertion outcomes, drift diff).
- `/connections` — Health-focused catalog of Make.com/n8n connectors + interest voting on coming-soon platforms.
- `/billing` — Usage-first billing with invoice list + Stripe portal link.
- `/roadmap` — Public-facing product roadmap.
- `/settings/{workspace,account,team,alerts,integrations,api,security,data,danger}` — 9-section left-rail IA.

### API Routes — `src/app/api/`

- `GET /api/health` — Liveness probe, returns `{ status: "ok", ts }` (`force-dynamic`).
- `POST /api/billing/checkout` — Create Stripe checkout session
- `POST /api/billing/claim-ltd` — Claim LTD seat
- `GET /api/billing/invoices` — List user invoices
- `GET /api/billing/portal` — Redirect to Stripe billing portal
- `POST /api/billing/webhook` — Stripe webhook handler (idempotent via `stripe_webhook_events`; LTD oversold refund failures persisted to `failed_refunds`)
- `GET|POST /api/connections`, `GET|POST|DELETE /api/connections/[connectionId]`, `POST /api/connections/[connectionId]/test`
- `GET /api/cron/sync` — Bearer-auth (`CRON_SECRET`) sync trigger. **Driven by Supabase pg_cron only** (15-min cycle). `maxDuration=60`, 50s wall-clock budget, defers remainder.
- `POST /api/diagnostic` — Generate Claude diagnostic report. **`profileId` now comes in the request body** (validated by `diagnosticSchema`), not a path segment. Resolves demo vs. DB profile internally; demo profiles use fallback narratives.
- `PATCH /api/profiles/[profileId]` — Update a profile.
- `POST /api/issues/dismiss` — Dismiss an issue
- `GET /api/notifications`, `POST /api/notifications/[notificationId]/read`, `POST /api/notifications/mark-all-read`
- `GET|POST /api/scenarios` — List / create Pre-flight scenarios (create is admin/owner-only + plan-gated)
- `GET|PATCH|DELETE /api/scenarios/[id]` — Scenario CRUD
- `POST /api/scenarios/[id]/run` — Trigger a synchronous Pre-flight run (admin/owner-only + plan-gated)
- `GET /api/scenarios/[id]/runs/[runId]` — Fetch a run + results
- `GET|POST /api/schedules/[profileId]` — Profile sync schedule
- `POST /api/sync/[profileId]` — Manual profile sync

## Data Layer

Four Supabase clients in `src/lib/supabase/`: `client.ts` (browser) · `server.ts` (SSR) · `admin.ts` (service role, bypasses RLS) · `middleware.ts` (session refresh).

Typed data access in `src/lib/queries/`: `workspaces`, `workspace-dashboard`, `profiles`, `connections`, `diagnostics`, `notifications`, `schedules`, `subscriptions`, `usage`, **`preflight`**. All DB access goes through here.

Types: `src/lib/database.types.ts` (Supabase-generated, includes RPC function types).

## Database Schema (25 migrations under `supabase/migrations/`)

**Core**: `workspaces`, `users`, `workspace_members` (role)

**Profiles & issues**:
- `automation_profiles` (id, workspace_id, name, platform, health_score, **connection_id** [FK → platform_connections, NULLABLE for legacy], snoozed_until, industry, scenario_count)
- `automation_issues` (profile_id, name, type, severity, status, business_impact, recommendation, resolved_at)
- `profile_health_snapshots` (profile_id, captured_on, health_score, open_issue_count, critical_issue_count, automation_count) — daily trending

**Connections & automations**:
- `platform_connections` (workspace_id, platform [make|n8n], display_name, status, zone [us1/eu1/eu2/us2], team_id [Make], auth_type, access_token_encrypted, api_key_encrypted, refresh_token_encrypted, token_expires_at, instance_url [n8n])
- `automations` (profile_id, connection_id, external_id, name, status, trigger_type, total_runs, failed_runs, success_rate)
- `execution_logs` (automation_id, status, started_at, finished_at, data_in, data_out, error_message)

**Pre-flight Check** (migration `20260508000001`, 5 tables, all denormalize `workspace_id`):
- `preflight_scenarios` (workspace_id, connection_id, automation_profile_id?, name, workflow_external_id, schedule_cron?, baseline_run_id? [self-FK → preflight_runs], cost_cap_cents [default 500, ≤100000], enabled, archived_at, created_by)
- `preflight_inputs` (scenario_id, input_data jsonb, label?, source [manual|production_trace|imported_csv], pii_redacted_at? [required for production_trace, enforced at insert layer])
- `preflight_assertions` (scenario_id, assertion_type [7-value CHECK], config jsonb, severity [fail|warn])
- `preflight_runs` (scenario_id, triggered_by [manual|schedule|api|mcp], status [running|passed|failed|errored|cost_capped], counts, pass_rate, total_cost_cents, total_latency_ms, baseline_drift_pct, drift_eligible)
- `preflight_run_results` (run_id, input_id, output_data, passed, assertion_results jsonb, latency_ms, cost_cents, error_message)
- Trigger `assert_scenario_connection_match` mirrors `assert_profile_connection_match` (connection must be same workspace).
- RLS: any member reads; **only admins/owners write**; service_role (executor/cron) bypasses RLS to write run/result rows.

**Monitoring**: `notifications`, `notification_preferences` (JSON config), `audit_schedules` (cron_expression, next_run_at)

**Billing**: `subscriptions` (plan, status, **is_ltd**, ltd_purchased_at, billing_email/country/tax_id), `ltd_allocations` (total_seats, seats_sold), `stripe_webhook_events` (idempotency), `failed_refunds` (LTD oversold refund failures, RLS-locked to service_role), `connection_interest`, `connection_requests`

**Diagnostics**: `diagnostic_reports` (model_used, overall_health, most_dangerous, recommendations, triggered_by, tokens_used)

**RLS helpers**: `get_user_workspace_ids()`, `get_user_admin_workspace_ids()` — gate all queries by membership.

**Key RPCs/triggers**: `update_automation_stats`, `update_profile_scenario_count`, `claim_ltd_seat`, `assert_profile_connection_match`, `assert_scenario_connection_match`, `flowcheck_trigger_sync` (pg_cron function).

**Migration ordering note**: the highest-numbered file on disk is `20260508000001_preflight_scenarios.sql`. Filename numbers ≠ commit order — `20260422000002_multi_connection_support.sql` shipped after several higher-numbered files. Don't infer chronology from migration numbers.

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

### Pre-flight Check (`src/lib/preflight/`) — Reliability Suite PR #1

Reusable, workspace-scoped test suites that run sample inputs through a workflow and assert on the output, to catch drift **before** a change ships (or after a client silently breaks something downstream).

- **Executor** (`executor/synchronous.ts`, `executor/index.ts`, `executor/types.ts`): v1 is **synchronous, in-request**. Caps in `limits.ts`: `MAX_INPUTS_PER_RUN=50` (Vercel 300s function ceiling; queue-backed executor will raise to 500), `BATCH_SIZE=5`, `DEFAULT_COST_CAP_CENTS=500`, `MIN_INPUTS_FOR_DRIFT=20` (below 20 inputs the run still produces results but `drift_eligible` stays false). Run status ∈ {running, passed, failed, errored, cost_capped}.
- **Assertions** (`assertions/`): 7 types declared in the DB CHECK up front; PR #1 implements **1–4** — `json_schema_valid` (Ajv), `field_present`, `field_matches`, `field_in_set`. Types 5–7 (`llm_judge`, `latency_under_ms`, `cost_under_cents`) are stubbed: they record a non-fatal "not yet supported" outcome so a misconfigured row never crashes a run. PR #2 wires them with no schema change. Per-assertion `severity`: `fail` blocks the input; `warn` records only. An input passes iff every `fail` assertion passes.
- **Queries/validation**: `src/lib/queries/preflight.ts`, `src/lib/validation/preflight-schemas.ts`.
- **Gating**: create-scenario and trigger-run require owner/admin role and pass `checkPlanLimit(plan, "preflightScenarios" | "preflightRunsPerMonth", count)`.

### AI diagnostic (`src/lib/diagnostic/enhanced-prompt.ts`, `src/lib/queries/diagnostics.ts`)

Builds Claude prompt with execution stats + error patterns. Returns plain-text paragraphs (no markdown): `{ overallHealth, mostDangerousIssue, recommendations }`. Stores report + `tokens_used` + `triggered_by` in `diagnostic_reports`. Demo profiles ship fallback narratives when `ANTHROPIC_API_KEY` absent. Endpoint is `POST /api/diagnostic` with `profileId` in the body.

### Crypto (`src/lib/crypto.ts`)

AES-256-GCM for stored platform credentials. SHA-256 for token hashing. Requires 64-char hex `ENCRYPTION_KEY` (`openssl rand -hex 32`).

## Billing (Stripe)

`PLAN_LIMITS` (`src/lib/stripe.ts`), `-1` = unlimited:

| Plan | Price/mo | Profiles | Syncs/day | Diagnostics/mo | Pre-flight scenarios | Pre-flight runs/mo |
|---|---|---|---|---|---|---|
| free | — | 1 | 1 | 3 | 0 | 0 |
| starter | $19 | 5 | 4 | 20 | 0 | 0 |
| pro | $49 | 25 | 24 | ∞ | 5 | 50 |
| **agency** | **$149** | **100** | **96** | **∞** | **50** | **500** |
| enterprise | (no published price) | ∞ | ∞ | ∞ | ∞ | ∞ |
| **LTD** | one-time | treated as **Pro** internally via `is_ltd`; `claim_ltd_seat` RPC reserves a seat, refunds if oversold |

- **Webhooks** (`/api/billing/webhook`): `checkout.session.completed` (subscription + LTD payment modes), subscription events. Dedupe via `stripe_webhook_events` (PK violation = skip). LTD oversold + Stripe refund retry exhaustion → row in `failed_refunds` + alert via `LTD_ALERT_EMAIL`/`LTD_ALERT_FROM` (no-op if either missing).
- **Gating**: `checkPlanLimit()`; `resolveEffectivePlan()` treats LTD as Pro regardless of the `plan` column.
- **Env**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_LTD`. (No `STRIPE_PRICE_AGENCY` env wired in `STRIPE_PRICE_IDS` yet — only starter/pro IDs are read from env.)

## Security Layer

- `src/lib/security/redirect.ts` — OAuth callback allowlist: permits `/app`, `/dashboard`; rejects `//`, protocols, `%2f`-encoded.
- `src/lib/security/workspace-auth.ts` — `getWorkspaceMembership()` required on any API route accepting `workspaceId`, **after** the auth check. Scenario write routes additionally require `role ∈ {owner, admin}`.
- `src/lib/validation/schemas.ts` + `src/lib/validation/preflight-schemas.ts` — Zod schemas for every API route. Use `safeParse()` + `formatZodErrors()`.
- `src/lib/env.ts` — `getEncryptionKey()` / `getStripeWebhookSecret()` lazy validators, plus **`assertProductionEnv()`**: at boot in production it requires all 10 critical vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_LTD`, `CRON_SECRET`) and enforces the 64-char-hex `ENCRYPTION_KEY` format. Skips during `next build` and non-production.
- `instrumentation.ts` — `register()` calls `assertProductionEnv()` in the `nodejs` runtime so a missing prod var **crashes the deploy** instead of 500-ing on first request, then inits Sentry (node + edge). `onRequestError = Sentry.captureRequestError`.
- `src/middleware.ts` — refreshes Supabase session on every non-static request; redirects unauthenticated users to `/login` and authenticated users away from auth pages to `/app`.

## Cron / Scheduled Sync

**Single driver: Supabase pg_cron.** Migration `20260415000013_pgcron_sync_job.sql` defines `flowcheck_trigger_sync()` (calls `net.http_get(<app_url>/api/cron/sync)` with `Bearer ${CRON_SECRET}` from Vault) on a 15-minute schedule (`runmend-sync-every-15-min`).

**`vercel.json` is now `{}`** — the Vercel cron entry was deliberately removed (commit `f63df76`) because Vercel Hobby rejects sub-daily `*/15` crons in `vercel.json` validation, which blocked deploys. The pg_cron job is the redundant-free single source of truth. The empty file is kept for any future Vercel-only settings.

`/api/cron/sync` still bearer-auths `CRON_SECRET`, fetches due `audit_schedules`, syncs profiles within a 50s wall-clock budget (`maxDuration=60`), defers the remainder to the next tick, and reports `Sentry.captureException` on per-profile failures while still advancing `next_run_at` so broken profiles don't retry endlessly.

## Notifications

Channels: in-app (bell), email (Resend), Slack (stub), webhook (stub). Events: `issue_detected`, `credential_expiring`, `audit_complete`, `connection_error`. Per-channel severity filter, event×channel routing matrix, daily/weekly digest, quiet hours (with timezone detection), per-profile muting. Rules persist into `notification_preferences.config` jsonb via `normalizeConfig`. Initial notifications are server-rendered in the workspace layout (NotificationBell does not fetch on mount).

## Demo Profiles (`src/data/profiles.ts`, served by `src/lib/profiles.ts`)

1. **Coastal Content Agency** — Make.com · 47 scenarios · health 34 · content agency, critical onboarding webhook failures
2. **GreenLeaf Commerce** — Make.com · 23 scenarios · health 62 · e-commerce, Stripe→Mailchimp failures, credential expiring
3. **Creator Stack** — Make.com · 15 scenarios · health 91 · online course, rate-limit warnings, zombie welcome email
4. **InfraFlow DevOps** — n8n · 31 workflows · health 52 · self-hosted infra (OOM, webhook tunnel expired, DB pool, credential rotation overdue)

## Testing

- **~68 test files / ~694 test cases** (`it`/`test` blocks) under `src/**/__tests__`. (The previous revision of this doc said "475 test files" — that figure was wrong.)
- CI coverage gate: **90% lines / 90% statements / 90% functions / 84% branches** via `test:coverage:check` (branch threshold lower because v8 branch coverage is strict; `autoUpdate=false` so the bar can't silently drop).
- Scope: `src/lib/**`, `src/app/api/**/route.ts`, `src/app/**/actions.ts`, `src/middleware.ts`. Excluded: `database.types.ts`, type defs, tests, pages/layouts, UI primitives, demo profiles, Supabase client factories.
- Shared harness: `src/test/` — Supabase/Stripe/Anthropic mocks, typed factories, NextRequest helpers.
- Pre-flight has dedicated suites: `src/lib/preflight/__tests__/{assertions,synchronous-executor}.test.ts`, `src/lib/queries/__tests__/preflight.test.ts`, `src/lib/validation/__tests__/preflight-schemas.test.ts`.
- E2E: Playwright (global rule: always use Playwright MCP for testing/debugging).

## Environment Variables (from `.env.example`)

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`.
Payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_LTD`.
Optional: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `RESEND_API_KEY`, `LTD_ALERT_EMAIL`, `LTD_ALERT_FROM`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_APP_URL`.

All 10 of the "Required + Payments" vars are enforced at production boot by `assertProductionEnv()` — a missing one fails the deploy, not the request.

## Key Patterns

- Path alias `@/*` → `./src/*`
- Tailwind via HSL CSS variables in `globals.css`, referenced in `tailwind.config.ts`; dark mode class-based
- API response shape for diagnostic: `{ overallHealth, mostDangerousIssue, recommendations }` as plain text
- Bulk upserts + RPCs throughout sync (no per-row loops); all external fetches wrapped in `fetchWithRetry()`
- Per-request dedupe: `cache` from `src/lib/cache.ts` (a `React.cache` shim, no-op under Vitest) wraps RSC fetches shared between layout + child route
- Every authenticated route segment ships a `loading.tsx` for instant-paint navigation
- `experimental.optimizePackageImports` for `lucide-react`
- All Supabase and Stripe setup goes through MCP per global rule; Playwright MCP for E2E/debugging

## Companion Docs

- `docs/PRODUCTION_READINESS.md` — production-readiness checklist (cron, health, release tracking, PostHog consent status)
- `docs/MCP_SERVER_DESIGN.md` — Phase 3 design for a Runmend MCP server (`triggered_by='mcp'` already a valid Pre-flight run source)
- `docs/PRICING_REVIEW.md` — Phase 4 pricing review (basis for the Agency tier)

## Recent Milestone Timeline

- **Phases 1–8** (complete): Supabase foundation, auth, workspace CRUD, platform connections (Make + n8n), sync engine, AI diagnostics, notifications, Stripe billing
- **Phase 9** (complete): Security hardening — input validation, workspace auth, redirect protection, bulk DB ops, pagination, retry w/ backoff
- **Phase 10 — Ship** (complete): Zapier removed, scheduled sync, baseline test suite, Sentry, security headers, GitHub Actions CI
- **Post-ship product waves**: public `/pricing`, LTD plan + invoice list + VAT mirroring, animated marketing homepage, profiles-as-table, profile detail w/ Make deep-links, connections-as-catalog, settings 9-section left-rail, Make zone + team_id, health snapshots, snooze, multi-connection profile binding (`connection_id`), unified add-connection + create-profile modals, sonner toasts, 90%+ coverage gate, tab-switch perf wave (`React.cache` dedupe + `loading.tsx` skeletons + server-rendered notifications)
- **Production-readiness wave (commit `32a6740`)**: `/api/health`, release tracking; cookie-consent gate for PostHog (`458ce33`); failed-LTD-refund reconciliation → `failed_refunds` + alerting (`1ef76f4`, migration `20260426000001`)
- **Positioning wave**: repositioned docs/landing as production monitoring for Make/n8n agencies (`4349d98`), `/vs-claude-cowork` honest comparison page (`f065c47`), refreshed landing copy + founder credit (`8c77612`), **Agency tier + pilot testimonials + Benchmarks coming-soon** (`63d50e5`)
- **Reliability Suite PR #1 — Pre-flight Check (commit `089de3f`, migration `20260508000001`)**: 5 tables, synchronous in-request executor (50-input cap), assertion types 1–4 live + 5–7 stubbed, `/scenarios` UI + `/api/scenarios*` routes, plan-gated (Pro 5 scenarios/50 run, Agency 50/500), `triggered_by='mcp'` ready for the future MCP server
- **Startup validation (commit `a44bbd4`)**: `assertProductionEnv()` in `instrumentation.ts` — missing prod env crashes the deploy
- **Cron consolidation (commit `f63df76`)**: removed redundant Vercel cron entry (`vercel.json` → `{}`); Supabase pg_cron is the sole 15-min sync driver
- **Latest (`d71a85c`)**: UI polish

## Things LLMs commonly get wrong about this repo

- **Cron is pg_cron-only.** `vercel.json` is `{}` by design (Vercel Hobby rejects `*/15`). Do not "fix" the missing Vercel cron config — it was removed on purpose; the Supabase `runmend-sync-every-15-min` job drives `/api/cron/sync`.
- **`/api/diagnostic` takes `profileId` in the POST body**, not as a path segment. There is no `/api/diagnostic/[profileId]` anymore.
- **Pre-flight assertion types 5–7 are intentionally stubbed**, not broken. `llm_judge`/`latency_under_ms`/`cost_under_cents` return a passing "not yet supported" outcome by design (PR #2 wires them, no schema change needed because all 7 are in the CHECK constraint already).
- **There are 5 plans now: free, starter, pro, agency, enterprise.** Agency ($149, 100 profiles, 50 Pre-flight scenarios) is new. LTD is still not a `plan` value — `is_ltd` boolean drives `resolveEffectivePlan()` (returns `pro`). Don't filter by `plan='ltd'` or `plan='agency'` assuming agency is rare.
- **Zapier is OUT of v1.** Inert columns only; don't suggest Zapier features.
- **Profiles and scenarios both bind to a connection via `connection_id`** with same-workspace triggers (`assert_profile_connection_match`, `assert_scenario_connection_match`). Sync is per-profile, not per-workspace.
- **Default Claude model is `claude-sonnet-4-5-20250929`**, overridable via `CLAUDE_MODEL`.
- **No magic-link auth** — email/password + Google/GitHub OAuth only.
- **Coverage gate is 90/90/90/84** and `autoUpdate=false` in CI — thresholds can't silently drop.
- **Migration filename numbers are not chronological.** Don't infer order from them; check git history.
- **`/dashboard/[profileId]` is the PUBLIC demo (no auth); `/app/[workspaceSlug]/...` is the authenticated SaaS.** Don't conflate them.
- **Use `cache` from `src/lib/cache.ts`, not `react`'s `cache`** — the shim no-ops under Vitest (React 18.3 CJS doesn't expose `cache`); importing from `react` breaks tests.
- **Every authenticated route segment needs a `loading.tsx`** — the app relies on these for instant-paint navigation.
- **`assertProductionEnv()` runs at boot, not per-request** — a missing prod env var means the deployment never comes up, not a runtime 500.
