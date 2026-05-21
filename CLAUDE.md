# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Runmend is an AI-powered automation health monitoring SaaS that audits workflow configurations across Make.com and n8n. It detects silent failures, expired credentials, broken webhooks, and empty field mappings, then generates AI diagnostic reports using Claude API.

The app has two paths: a **public demo** at `/dashboard/[profileId]` (4 hardcoded profiles, no auth) and an **authenticated SaaS** at `/app/[workspaceSlug]/...` (multi-tenant workspaces with real platform connections).

## Commands

```bash
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run
npm run test:coverage # Vitest with coverage report
npm start            # Production server
```

## Tech Stack

- **Framework**: Next.js 14 (App Router), React 18, TypeScript 5
- **Database/Auth**: Supabase (Postgres + Auth + RLS + Realtime)
- **AI**: Anthropic Claude SDK (`@anthropic-ai/sdk`) — Sonnet model for diagnostics
- **Payments**: Stripe (checkout, billing portal, webhooks)
- **Styling**: Tailwind CSS + shadcn/ui components + Lucide icons
- **Analytics**: PostHog
- **Error Tracking**: Sentry (`@sentry/nextjs`)
- **Testing**: Vitest + Playwright
- **CI/CD**: GitHub Actions → Vercel

## Architecture

### Routing (App Router)

- `src/app/(auth)/` — Auth pages (login, signup, forgot-password, reset-password, callback)
- `src/app/app/` — Authenticated workspace routes with `[workspaceSlug]` dynamic segment
- `src/app/dashboard/[profileId]/` — Public demo dashboards (no auth)
- `src/app/api/` — API routes (diagnostic, connections, sync, cron, notifications, schedules, billing)

### Data Layer

- `src/lib/supabase/` — Four Supabase clients: `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service role, bypasses RLS), `middleware.ts` (session refresh)
- `src/lib/queries/` — Typed data access functions (workspaces, profiles, connections, diagnostics, notifications, schedules, subscriptions). All DB access goes through here.
- `src/lib/database.types.ts` — Supabase-generated types (includes RPC function types for `update_automation_stats`, `update_profile_scenario_count`, `claim_ltd_seat`, and `assert_profile_connection_match`)
- `supabase/migrations/` — 23 migration files defining all tables, RLS policies, indexes, RPC functions, cron jobs, multi-connection profile binding, LTD/billing tables, and Stripe webhook idempotency

### Platform Integration Layer

- `src/lib/platform-adapters/` — `PlatformAdapter` interface with factory function `createAdapter(platform, credentials)`
  - `make.ts` — Full Make.com API (zones: us1, eu1, etc.)
  - `n8n.ts` — Self-hosted n8n instances

### Business Logic

- `src/lib/sync/engine.ts` — Orchestrates: fetch automations → upsert → fetch executions → calculate health → detect issues
- `src/lib/sync/health-calculator.ts` — Weighted score (0-100): error rate 40%, inactive ratio 20%, failure trend 20%, coverage 20%
- `src/lib/sync/issue-detector.ts` — 6 rules: silent failure, high error rate, error spike, consecutive failures, zombie automation, credential expiration
- `src/lib/diagnostic/enhanced-prompt.ts` — Builds Claude prompt with execution stats and error patterns
- `src/lib/crypto.ts` — AES-256-GCM encryption for stored platform credentials + SHA-256 token hashing

### Security Layer

- `src/lib/security/redirect.ts` — OAuth callback redirect validation (allowlist-based, prevents open redirect)
- `src/lib/security/workspace-auth.ts` — Workspace membership assertion for defense-in-depth on API routes
- `src/lib/validation/schemas.ts` — Zod schemas for all API route inputs (connections, schedules, billing, diagnostics, notifications)
- `src/lib/env.ts` — Critical environment variable validation (ENCRYPTION_KEY, STRIPE_WEBHOOK_SECRET)
- `src/lib/platform-adapters/retry.ts` — Exponential backoff retry wrapper for external API calls

### Auth & Middleware

`src/middleware.ts` matches all routes except static assets. It refreshes the Supabase session cookie on every request, redirects unauthenticated users to `/login`, and redirects authenticated users away from auth pages to `/app`.

### Demo Data

`src/data/profiles.ts` contains 4 hardcoded demo profiles (Coastal Content Agency, GreenLeaf Commerce, Creator Stack, InfraFlow DevOps) with pre-generated issues and fallback AI narratives used when `ANTHROPIC_API_KEY` is not set.

## Key Patterns

- **Path alias**: `@/*` maps to `./src/*`
- **Tailwind colors**: HSL CSS variables defined in globals.css, referenced in tailwind.config.ts
- **Dark mode**: Class-based via Tailwind
- **API responses**: Diagnostic endpoint returns `{ overallHealth, mostDangerousIssue, recommendations }` — plain text paragraphs, no markdown
- **RLS helpers**: `get_user_workspace_ids()` and `get_user_admin_workspace_ids()` Postgres functions gate all queries by workspace membership
- **Input validation**: All API routes use Zod schemas from `src/lib/validation/schemas.ts`. Parse with `safeParse()`, return 400 with `formatZodErrors()` on failure.
- **Workspace auth**: API routes accepting `workspaceId` must call `getWorkspaceMembership()` after auth check, before any data operations.
- **Retry logic**: External API calls in platform adapters use `fetchWithRetry()` from `retry.ts` (3 retries, exponential backoff with jitter).
- **Bulk operations**: Sync engine uses bulk upserts and RPC functions (`update_automation_stats`, `update_profile_scenario_count`) instead of per-row loops.
- **Profile-connection binding**: `automation_profiles.connection_id` (FK → `platform_connections`) is the source of truth for which credentials a profile syncs through. The `assert_profile_connection_match` trigger enforces same-workspace + same-platform integrity. Sync resolves connection via `connection_id`; legacy rows fall back to platform-match.
- **Per-request dedupe**: Server queries used by both layout and page (e.g. `createClient`, workspace/subscription/pulse loaders) are wrapped with `cache` from `src/lib/cache.ts` (a `React.cache` shim that no-ops in Vitest). Use it on any RSC fetch shared across layout + child route to avoid double DB hits per render.
- **Loading skeletons**: Each authenticated route segment ships a `loading.tsx` so navigation paints instantly while server data resolves. Add one when introducing a new segment.

## Environment Variables

See `.env.example`. Required for full functionality:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side admin access
- `ANTHROPIC_API_KEY` — Claude API (optional; demo profiles have fallback narratives)
- `ENCRYPTION_KEY` — 64-char hex for AES-256-GCM (`openssl rand -hex 32`)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe billing
- `CRON_SECRET` — Vercel Cron authentication (`openssl rand -hex 32`)
- `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` — Sentry error tracking (optional)
- `RESEND_API_KEY` — Email notifications (optional)
- `LTD_ALERT_EMAIL` / `LTD_ALERT_FROM` — Destination and sender for critical LTD refund failure alerts (optional; alert is a no-op if either is missing)
- `CLAUDE_MODEL` — Claude model for diagnostics (optional; defaults to `claude-sonnet-4-5-20250929`)

## Current State

All 8 original phases + production hardening + ship-readiness work complete, plus several post-ship product waves:
- **Phases 1-8**: Supabase foundation, auth, workspace CRUD, platform connections (Make.com + n8n), sync engine, AI diagnostics, notifications, Stripe billing
- **Phase 9**: Security hardening (input validation, workspace auth, redirect protection), performance (bulk DB ops, pagination), reliability (retry with backoff)
- **Phase 10 (Ship)**: Zapier removed from v1 (unstable API), scheduled sync via Vercel Cron (`/api/cron/sync` every 15 min), Sentry error tracking, security headers, GitHub Actions CI
- **Post-ship waves**: public `/pricing`, marketing homepage redesign, profiles-as-table + profile-detail redesign with Make deep-links, connections-as-catalog with per-platform groups + 2-col grid, settings 9-section left-rail with alerts config, LTD plan + invoice list + VAT mirroring, sonner toast system, profile-snooze, profile health snapshots for pulse trending, Make zone + team_id support, **multi-connection profile binding** (one profile per client credential), unified add-connection modal, create-profile modal, profile-connection widget on profile detail (visible + editable), 90%+ coverage gate
- **Latest perf wave**: per-request `React.cache` dedupe on Supabase client + workspace/subscription/pulse queries, parallelized waterfalls in pulse/connections/profile-cards loaders, route-level `loading.tsx` skeletons for instant navigation paint, server-rendered initial notifications (NotificationBell no longer fetches on mount), `experimental.optimizePackageImports` for `lucide-react`

Stripe requires test/live keys + price IDs in env vars. Zapier may be re-added later with Partner Program OAuth access.

Self-hosters: bring your own Supabase project and create a test user with the auth flow in `src/app/(auth)/signup`.

## Deploy Checklist (Vercel)

1. Connect GitHub repo to Vercel (auto-deploys on push to main)
2. Set all env vars in Vercel dashboard (see Environment Variables section)
3. **ENCRYPTION_KEY**: Must match dev key if reusing Supabase project, or generate new for fresh DB
4. **Stripe**: Create new webhook endpoint pointing to `https://<domain>/api/billing/webhook`, use the new signing secret as `STRIPE_WEBHOOK_SECRET`
5. **Supabase Auth**: Add production URL to `additional_redirect_urls` in Supabase dashboard
6. **Vercel Cron**: Requires Vercel Pro plan (free tier gets 1 cron, sufficient for this)
7. Verify: production URL loads, demo profiles work, Stripe checkout completes in test mode
