# Runmend

Runmend is an AI-powered automation health monitoring SaaS that audits workflow configurations across **Make.com** and **n8n**. It detects silent failures, expired credentials, broken webhooks, and empty field mappings, then generates AI diagnostic reports using the Claude API.

## What It Does

- **Monitors automation workflows** across Make.com (multi-zone) and self-hosted n8n
- **Detects silent failures** — expired credentials, broken webhooks, empty field mappings, zombie automations, error spikes
- **Generates AI diagnostic reports** using Claude Sonnet to prioritize fixes and quantify business impact
- **Scores automation health** on a weighted 0-100 scale (error rate 40%, inactive ratio 20%, failure trend 20%, coverage 20%)
- **Multi-tenant workspaces** with role-based access, encrypted platform connections, and scheduled audits
- **Scheduled sync** via Vercel Cron every 15 minutes with deduped notifications
- **Lifetime Deal (LTD) plan** alongside subscription tiers, plus VAT-aware invoices and billing portal

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

Or apply manually from `supabase/migrations/` (22 migrations covering schema, RLS, indexes, RPC functions, and cron jobs).

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
- `src/lib/database.types.ts` — Supabase-generated types including RPC function signatures (`update_automation_stats`, `update_profile_scenario_count`)
- `supabase/migrations/` — 22 migrations: schema, RLS policies, indexes, RPC batch functions, pg_cron sync job, LTD/billing tables, webhook event dedup

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

## License

MIT
