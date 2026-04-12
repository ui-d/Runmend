# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowCheck is an AI-powered automation health monitoring SaaS that audits workflow configurations across Zapier, Make.com, and n8n. It detects silent failures, expired credentials, broken webhooks, and empty field mappings, then generates AI diagnostic reports using Claude API.

The app has two paths: a **public demo** at `/dashboard/[profileId]` (4 hardcoded profiles, no auth) and an **authenticated SaaS** at `/app/[workspaceSlug]/...` (multi-tenant workspaces with real platform connections).

## Commands

```bash
npm run dev      # Dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint
npm start        # Production server
```

## Tech Stack

- **Framework**: Next.js 14 (App Router), React 18, TypeScript 5
- **Database/Auth**: Supabase (Postgres + Auth + RLS + Realtime)
- **AI**: Anthropic Claude SDK (`@anthropic-ai/sdk`) — Sonnet model for diagnostics
- **Payments**: Stripe (checkout, billing portal, webhooks)
- **Styling**: Tailwind CSS + shadcn/ui components + Lucide icons
- **Analytics**: PostHog

## Architecture

### Routing (App Router)

- `src/app/(auth)/` — Auth pages (login, signup, forgot-password, reset-password, callback)
- `src/app/app/` — Authenticated workspace routes with `[workspaceSlug]` dynamic segment
- `src/app/dashboard/[profileId]/` — Public demo dashboards (no auth)
- `src/app/api/` — API routes (diagnostic, connections, sync, notifications, schedules, billing)
- `src/app/api/webhooks/zapier/[token]/` — Zapier webhook receiver (token-authenticated, no user session)

### Data Layer

- `src/lib/supabase/` — Four Supabase clients: `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service role, bypasses RLS), `middleware.ts` (session refresh)
- `src/lib/queries/` — Typed data access functions (workspaces, profiles, connections, diagnostics, notifications, schedules, subscriptions). All DB access goes through here.
- `src/lib/database.types.ts` — Supabase-generated types
- `supabase/migrations/` — 8 migration files defining all tables with RLS policies

### Platform Integration Layer

- `src/lib/platform-adapters/` — `PlatformAdapter` interface with factory function `createAdapter(platform, credentials)`
  - `make.ts` — Full Make.com API (zones: us1, eu1, etc.)
  - `n8n.ts` — Self-hosted n8n instances
  - `zapier.ts` — Webhook-based monitoring (auto-discovers Zaps from incoming webhooks; OAuth mode stubbed for future Partner Program access)

### Business Logic

- `src/lib/sync/engine.ts` — Orchestrates: fetch automations → upsert → fetch executions → calculate health → detect issues
- `src/lib/sync/health-calculator.ts` — Weighted score (0-100): error rate 40%, inactive ratio 20%, failure trend 20%, coverage 20%
- `src/lib/sync/issue-detector.ts` — 6 rules: silent failure, high error rate, error spike, consecutive failures, zombie automation, credential expiration
- `src/lib/diagnostic/enhanced-prompt.ts` — Builds Claude prompt with execution stats and error patterns
- `src/lib/crypto.ts` — AES-256-GCM encryption for stored platform credentials

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

## Environment Variables

See `.env.example`. Required for full functionality:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side admin access
- `ANTHROPIC_API_KEY` — Claude API (optional; demo profiles have fallback narratives)
- `ENCRYPTION_KEY` — 64-char hex for AES-256-GCM (`openssl rand -hex 32`)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe billing
- `RESEND_API_KEY` — Email notifications (optional)

## Current State

All 8 phases are complete:
- **Phase 1**: Supabase foundation (users, workspaces, workspace_members + RLS + triggers)
- **Phase 2**: Auth (email/password, Google/GitHub OAuth, protected routes, middleware)
- **Phase 3**: Workspace + profile CRUD with dashboard UI
- **Phase 4**: Platform connections (Make.com full adapter, n8n adapter, Zapier webhook-based adapter, AES-256-GCM credential encryption)
- **Phase 5**: Sync engine (automation ingestion, health calculator, 6-rule issue detector)
- **Phase 6**: Enhanced AI diagnostics (real data prompts, report persistence, history page)
- **Phase 7**: Monitoring & notifications (audit schedules, Realtime notifications, notification preferences)
- **Phase 8**: Stripe billing (4 plans, checkout, portal, webhooks), onboarding wizard, plan limit enforcement, error boundaries

Zapier uses webhook-based monitoring: users add a "Webhooks by Zapier" POST action to their Zaps pointing to `/api/webhooks/zapier/{token}`. Automations are auto-discovered from incoming webhooks. Full OAuth integration is planned for when Zapier Partner Program access is granted. Stripe requires test/live keys + price IDs in env vars to function. Supabase Edge Function for scheduled sync (`supabase/functions/scheduled-sync/`) is designed but not yet deployed.

Supabase project: `hrcctyebejialsbdyyle` (US East). Test user: `test@flowcheck.dev` / `testpass123`.
