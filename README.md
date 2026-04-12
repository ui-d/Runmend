# FlowCheck

FlowCheck is an AI-powered automation health monitoring SaaS that audits workflow configurations across Zapier, Make.com, and n8n. It detects silent failures, expired credentials, broken webhooks, and empty field mappings, then generates AI diagnostic reports using Claude API.

## What It Does

- **Monitors automation workflows** across Zapier, Make.com, and n8n platforms
- **Detects silent failures** — expired credentials, broken webhooks, empty field mappings, infrastructure issues
- **Generates AI diagnostic reports** using Claude to analyze issues and prioritize fixes
- **Scores automation health** on a weighted 0-100 scale (error rate 40%, inactive ratio 20%, failure trend 20%, coverage 20%)
- **Multi-tenant workspaces** with role-based access, platform connections, and scheduled audits
- **Real-time notifications** for health changes and detected issues

## Demo

The app includes four built-in demo profiles accessible without authentication at `/dashboard/[profileId]`:

| Profile | Platform | Health | Industry | Key Issue |
|---------|----------|--------|----------|-----------|
| Coastal Content Agency | Zapier | 34/100 (Critical) | Marketing | Invoice generation down 19 days |
| InfraFlow DevOps | n8n | 52/100 (Warning) | SaaS / DevOps | Webhook tunnel expired, DB pool saturated |
| GreenLeaf Commerce | Make.com | 62/100 (Warning) | E-commerce | Post-purchase emails broken 14 days |
| Creator Stack | Zapier | 91/100 (Excellent) | Education | Minor API rate limit concern |

## Tech Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript 5
- **Database/Auth:** Supabase (Postgres + Auth + Row Level Security)
- **AI:** Anthropic Claude SDK (Sonnet model for diagnostics)
- **Payments:** Stripe (checkout, billing portal, webhooks)
- **Styling:** Tailwind CSS + shadcn/ui + Lucide icons
- **Analytics:** PostHog

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/ui-d/flowcheck.git
cd flowcheck
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
| `ANTHROPIC_API_KEY` | Claude API key (optional — demo profiles have fallback narratives) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Database Setup

Apply the Supabase migrations in order:

```bash
supabase db push
```

Or apply manually from `supabase/migrations/`.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

### Routing

- `src/app/(auth)/` — Auth pages (login, signup, forgot-password, reset-password, callback)
- `src/app/app/[workspaceSlug]/` — Authenticated workspace routes (dashboard, connections, diagnostics, settings)
- `src/app/dashboard/[profileId]/` — Public demo dashboards (no auth)
- `src/app/api/` — API routes (diagnostic, connections, sync, notifications, schedules, billing)

### Data Layer

- `src/lib/supabase/` — Four Supabase clients: browser, SSR, admin (service role), middleware (session refresh)
- `src/lib/queries/` — Typed data access functions for workspaces, profiles, connections, diagnostics, notifications, schedules, subscriptions
- `src/lib/database.types.ts` — Supabase-generated types
- `supabase/migrations/` — 7 migration files with RLS policies

### Platform Integrations

- `src/lib/platform-adapters/` — `PlatformAdapter` interface with `createAdapter(platform, credentials)` factory
  - **Make.com** — Full API integration (multi-zone: us1, eu1, etc.)
  - **n8n** — Self-hosted instance support
  - **Zapier** — Stub (requires OAuth Partner Program access)

### Sync Engine

- `src/lib/sync/engine.ts` — Fetch automations → upsert → fetch executions → calculate health → detect issues
- `src/lib/sync/health-calculator.ts` — Weighted health score (0-100)
- `src/lib/sync/issue-detector.ts` — 6 detection rules: silent failure, high error rate, error spike, consecutive failures, zombie automation, credential expiration

### Auth & Middleware

`src/middleware.ts` refreshes the Supabase session on every request, redirects unauthenticated users to `/login`, and redirects authenticated users away from auth pages to `/app`.

### Security

- AES-256-GCM encryption for stored platform credentials (`src/lib/crypto.ts`)
- Row Level Security on all tables via `get_user_workspace_ids()` and `get_user_admin_workspace_ids()` Postgres functions
- CSRF protection and secure session handling via Supabase Auth

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Login, signup, password reset
│   ├── app/[workspaceSlug]/    # Authenticated workspace routes
│   ├── api/                    # API routes (diagnostic, sync, billing, etc.)
│   ├── dashboard/[profileId]/  # Public demo dashboards
│   └── page.tsx                # Landing page
├── components/
│   ├── landing/                # Landing page sections
│   ├── dashboard/              # Dashboard components
│   └── ui/                     # shadcn/ui primitives
├── data/                       # Demo profiles with fallback narratives
├── hooks/                      # Custom React hooks
└── lib/
    ├── supabase/               # Supabase client variants
    ├── queries/                # Typed data access layer
    ├── platform-adapters/      # Make.com, n8n, Zapier adapters
    ├── sync/                   # Health calculator, issue detector
    ├── diagnostic/             # AI prompt builder
    ├── crypto.ts               # AES-256-GCM encryption
    └── stripe.ts               # Stripe client
```

## License

MIT
