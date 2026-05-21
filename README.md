# Runmend

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![CI](https://github.com/ui-d/runmend/actions/workflows/ci.yml/badge.svg)](https://github.com/ui-d/runmend/actions/workflows/ci.yml)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)

Runmend is production monitoring for **Make.com** and **n8n** agencies. Connect every client account across all four Make zones (us1/eu1/eu2/us2) plus self-hosted n8n, and Runmend runs six failure detectors on each scheduled audit, then has Claude write the post-mortem before you open the tab.

## What It Does

- **Multi-zone, multi-account** — Make.com us1/eu1/eu2/us2 + n8n self-hosted, one profile per client credential
- **Six failure detectors** — silent failure, high error rate, error spike, consecutive failures, zombie automation, credential expiration
- **AI post-mortem per audit** — Claude Sonnet writes a three-part diagnostic (overall health, most dangerous issue, what to do next) so you can forward it to a client in one click
- **Per-channel alerting** — email + Slack with per-profile routing, severity-tuned defaults, and notification dedupe
- **Health scored 0–100** on a weighted formula (error rate 40%, inactive ratio 20%, failure trend 20%, coverage 20%) with persistent snapshots for trend visibility
- **Pre-flight Reliability Suite** — run real inputs against 7 assertion types before drift ships: schema/field checks, `latency_under_ms`, `cost_under_cents` (per-LLM-node token cost from n8n output; Make on the roadmap), and `llm_judge` (Claude scores output quality against a criterion, with optional baseline comparison). Moves monitoring from "did it run" to "is the output good at a reasonable cost".
- **Multi-tenant workspaces** with role-based access, AES-256-GCM credential encryption, and scheduled audits via Vercel Cron (15-min global sync)
- **Lifetime Deal (LTD) plan** alongside subscription tiers, plus VAT-aware invoices and Stripe billing portal

## When Runmend ≠ the right tool

If you run **one** Make.com account on **one** zone and check it occasionally, the native Claude.ai connector + a Cowork Live Artifact will probably cover you. Runmend is built for agencies running **clients' production automations** across multiple Make zones or self-hosted n8n, where being told before the client tells you matters.

## Demo

The app includes four built-in demo profiles accessible without authentication at `/dashboard/[profileId]`:

| Profile | Platform | Health | Industry | Key Issue |
|---------|----------|--------|----------|-----------|
| Coastal Content Agency | Make.com | 34/100 (Critical) | Marketing Agency | Invoice generation down 19 days |
| InfraFlow DevOps | n8n | 52/100 (Warning) | SaaS / DevOps | Webhook tunnel expired, DB pool saturated |
| GreenLeaf Commerce | Make.com | 62/100 (Warning) | E-commerce | Post-purchase emails broken 14 days |
| Creator Stack | Make.com | 91/100 (Excellent) | Digital Courses | Minor API rate limit concern |

Demo profiles render without calling the Claude API — they ship with pre-generated fallback narratives in `src/data/profiles.ts`.

## Tech Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript 5
- **Database/Auth:** Supabase (Postgres + Auth + Row Level Security + Realtime)
- **AI:** Anthropic Claude SDK (`@anthropic-ai/sdk`) — Sonnet for diagnostics
- **Payments:** Stripe (subscriptions, LTD, billing portal, webhooks, VAT)
- **Styling:** Tailwind CSS + shadcn/ui + Lucide icons
- **Analytics:** PostHog
- **Error Tracking:** Sentry
- **Email:** Resend (optional notifications)
- **Testing:** Vitest (unit) + Playwright (E2E)
- **CI/CD:** GitHub Actions → Vercel

## Self-Hosting

Runmend is open-source under the [MIT License](./LICENSE). The hosted product at runmend.app and this repository share the same codebase — running your own instance on Vercel + Supabase + Stripe gives you the full feature set, including AI diagnostics, the Pre-flight Reliability Suite, and LTD billing. Bring your own API keys; see [Environment Variables](#environment-variables) for the full list.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/ui-d/runmend.git
cd runmend
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin access (bypasses RLS) |
| `ENCRYPTION_KEY` | 64-char hex for AES-256-GCM (`openssl rand -hex 32`) |
| `CRON_SECRET` | Vercel Cron authentication (`openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | Claude API key (optional — demo profiles have fallback narratives) |
| `CLAUDE_MODEL` | Claude model override (optional; defaults to `claude-sonnet-4-5-20250929`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) |
| `RESEND_API_KEY` | Email notifications (optional) |

### Database Setup

Apply the Supabase migrations in order:

```bash
supabase db push
```

Or apply manually from `supabase/migrations/` (23 migrations covering schema, RLS, indexes, RPC functions, cron jobs, multi-connection profile binding, LTD/billing tables, and Stripe webhook idempotency).

### Development

```bash
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run
npm run test:coverage # Vitest with coverage report
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

### Routing

- `src/app/(auth)/` — Auth pages (login, signup, forgot-password, reset-password, callback)
- `src/app/app/[workspaceSlug]/` — Authenticated workspace routes (dashboard, profiles, connections, diagnostics, billing, settings)
- `src/app/dashboard/[profileId]/` — Public demo dashboards (no auth)
- `src/app/api/` — API routes (diagnostic, connections, sync, cron, notifications, schedules, billing)

### Data Layer

- `src/lib/supabase/` — Four Supabase clients: `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service role, bypasses RLS), `middleware.ts` (session refresh)
- `src/lib/queries/` — Typed data access functions (workspaces, profiles, connections, diagnostics, notifications, schedules, subscriptions). All DB access flows through here.
- `src/lib/database.types.ts` — Supabase-generated types including RPC function signatures (`update_automation_stats`, `update_profile_scenario_count`, `claim_ltd_seat`, `assert_profile_connection_match`)
- `supabase/migrations/` — 23 migrations: schema, RLS policies, indexes, RPC batch functions, pg_cron sync job, profile health snapshots, multi-connection profile binding, LTD/billing tables, webhook event dedup

### Platform Integrations

- `src/lib/platform-adapters/` — `PlatformAdapter` interface with `createAdapter(platform, credentials)` factory
  - **Make.com** — Full API integration with zone support (us1, eu1, …) and team scoping
  - **n8n** — Self-hosted instance support
- `src/lib/platform-adapters/retry.ts` — Exponential backoff with jitter (3 retries) wraps every external call

> Zapier was removed from v1 due to Partner Program API instability. It may return with full OAuth integration.

### Sync Engine

- `src/lib/sync/engine.ts` — Fetch automations → bulk upsert → fetch executions → calculate health → detect issues
- `src/lib/sync/health-calculator.ts` — Weighted health score (0-100)
- `src/lib/sync/issue-detector.ts` — 6 detection rules: silent failure, high error rate, error spike, consecutive failures, zombie automation, credential expiration
- `src/app/api/cron/sync` — Vercel Cron handler (every 15 min, `CRON_SECRET` authenticated)

### AI Diagnostics

- `src/lib/diagnostic/enhanced-prompt.ts` — Builds Claude prompt with execution stats and error patterns
- Returns `{ overallHealth, mostDangerousIssue, recommendations }` as plain text paragraphs

### Auth & Middleware

`src/middleware.ts` refreshes the Supabase session on every request, redirects unauthenticated users to `/login`, and redirects authenticated users away from auth pages to `/app`.

### Security Layer

- `src/lib/crypto.ts` — AES-256-GCM encryption for stored platform credentials + SHA-256 token hashing
- `src/lib/security/redirect.ts` — OAuth callback redirect allowlist (prevents open-redirect)
- `src/lib/security/workspace-auth.ts` — Workspace membership assertion on every API route
- `src/lib/validation/schemas.ts` — Zod schemas for all API route inputs (`safeParse` + `formatZodErrors`)
- `src/lib/env.ts` — Startup validation for critical env vars (`ENCRYPTION_KEY`, `STRIPE_WEBHOOK_SECRET`)
- Row Level Security on all tables via `get_user_workspace_ids()` and `get_user_admin_workspace_ids()` Postgres helpers
- Security headers, CSP, CSRF protection, and secure session cookies via Supabase Auth

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Login, signup, password reset
│   ├── app/[workspaceSlug]/    # Authenticated workspace routes
│   ├── api/                    # API routes (diagnostic, sync, billing, cron, webhooks)
│   ├── dashboard/[profileId]/  # Public demo dashboards
│   └── page.tsx                # Marketing homepage
├── components/
│   ├── landing/                # Marketing page sections with animated visuals
│   ├── dashboard/              # Dashboard components (gauge, detector strip, issue groups)
│   └── ui/                     # shadcn/ui primitives
├── data/                       # Demo profiles with fallback narratives
├── hooks/                      # Custom React hooks
└── lib/
    ├── supabase/               # Supabase client variants
    ├── queries/                # Typed data access layer
    ├── platform-adapters/      # Make.com + n8n adapters, retry helper
    ├── sync/                   # Engine, health calculator, issue detector
    ├── diagnostic/             # Claude prompt builder
    ├── security/               # Redirect allowlist, workspace auth
    ├── validation/             # Zod schemas
    ├── crypto.ts               # AES-256-GCM encryption
    └── stripe.ts               # Stripe client
```

## Testing

- **Unit:** Vitest with shared mocks — `npm run test` / `npm run test:run`
- **Coverage:** `npm run test:coverage` (90%+ target enforced in CI via `test:coverage:check`)
- **E2E:** Playwright (`playwright.config.ts`, `e2e/` directory)

## Deploy Checklist (Vercel)

1. Connect GitHub repo to Vercel (auto-deploys on push to main)
2. Set all env vars in Vercel dashboard
3. **ENCRYPTION_KEY:** must match dev key if reusing Supabase project, or generate a new one for a fresh DB
4. **Stripe:** create a webhook endpoint pointing to `https://<domain>/api/billing/webhook` and use its signing secret as `STRIPE_WEBHOOK_SECRET`
5. **Supabase Auth:** add production URL to `additional_redirect_urls`
6. **Vercel Cron:** requires Vercel Pro plan (free tier allows one cron, which is enough for `/api/cron/sync`)
7. Verify: production URL loads, demo profiles render, Stripe checkout completes in test mode

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, branch conventions, and the PR checklist. All participants are expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

To report a vulnerability, see [SECURITY.md](./SECURITY.md). Please do **not** open a public issue for security bugs.

## License

Released under the [MIT License](./LICENSE).

