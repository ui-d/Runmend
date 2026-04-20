# Runmend — Startup Validation Brief

> This document is a comprehensive summary of the Runmend startup idea, intended for external review and validation. It covers the problem, product, business model, technology, current state, and open risks.

---

## 1. Problem Statement

**Automation platforms don't tell you when your workflows fail silently.**

Businesses increasingly rely on workflow automation tools (Make.com, n8n, and similar) to connect their SaaS stack — syncing CRM entries, processing payments, sending notifications, onboarding customers. But these platforms have a critical blind spot: when an automation stops firing, credentials expire, or a webhook goes dead, there is often **no alert**. The workflow simply stops working.

**The consequences are real:**
- Invoices stop generating (revenue leakage)
- Customer onboarding emails stop sending (churn)
- Data sync between tools breaks silently (data integrity)
- Expired OAuth tokens disable entire workflow chains

**Market signals:**
- 61% of Zapier users report having had a Zap fail silently (self-reported survey data used in marketing)
- Average time to notice a silent failure: 4.2 days
- Estimated average revenue lost per undetected failure: $12,400
- These are marketing-facing figures used on the landing page; independent validation is recommended

**Who feels this pain most:**
- Marketing agencies managing client automations (tens to hundreds of scenarios/workflows)
- E-commerce operators with order/fulfillment/notification chains
- SaaS/DevOps teams running self-hosted n8n with infrastructure concerns
- Any team where automation is critical but not someone's full-time job

---

## 2. Product Description

**Runmend** is an AI-powered automation health monitoring SaaS. It connects to your automation platforms (read-only), audits your workflows, detects problems, and generates AI diagnostic reports with prioritized fix recommendations.

### Core Value Loop

1. **Connect** — User links their Make.com or n8n account (read-only API access)
2. **Sync** — Runmend pulls automation metadata and execution logs
3. **Analyze** — Health score calculated (0–100), issues detected by 6 rule-based detectors
4. **Diagnose** — Claude AI generates a natural-language report: what's broken, why it matters, how to fix it
5. **Monitor** — Scheduled syncs (Vercel Cron, every 15 minutes) + notifications alert users to new problems

### Feature Set

**Health Scoring (0–100)**
Weighted formula:
- Error rate across last 7 days (40% weight)
- Inactive automation ratio (20%)
- Failure trend — is 24h error rate spiking vs 7-day average (20%)
- Execution coverage — % of automations with at least 1 logged run (20%)

**Issue Detection — 6 Rules**
| Rule | Severity | Trigger |
|------|----------|---------|
| Silent Failure | Critical | Active automation, 0 executions in 7 days (but had prior runs) |
| High Error Rate | Critical | >30% failure rate in last 24h (min 3 executions) |
| Consecutive Failures | Critical | 5+ sequential failed executions |
| Error Rate Spike | Warning | 24h error rate is 2x the 7-day average |
| Credential Expiration | Warning/Critical | OAuth/API token expiring within 7 days (or already expired) |
| Zombie Automation | Info | Active but 0 executions ever in 30 days |

**AI Diagnostic Reports**
- Powered by Claude (Anthropic API, Sonnet model, configurable via `CLAUDE_MODEL`)
- Generates 3-section report: Overall Health Assessment, Most Dangerous Issue, 3 Prioritized Recommendations
- Reports are persisted with history for trend tracking
- Regenerate on demand
- Fallback narratives included for the 4 demo profiles when `ANTHROPIC_API_KEY` is unset

**Platform Integrations**
| Platform | Auth Method | Capabilities |
|----------|-------------|--------------|
| Make.com | API token + zone + optional team_id | Fetch scenarios (paginated, up to 5000), execution logs, connection test. Multi-zone support (us1, eu1, eu2, etc.) with team-scoped access. |
| n8n | API key + instance URL | Fetch workflows (up to 250), execution logs with cursor pagination. Self-hosted support. |
| Zapier | — | **Removed from v1** (unstable Partner Program API). Schema stubs remain for future re-introduction. |

**Notifications**
- In-app notification bell with unread count
- Per-user, per-workspace notification preferences
- Notification types: issue detected, credential expiring, audit complete, connection error
- Email notifications (via Resend) available on paid plans

**Multi-Tenant Workspaces**
- Team-based: workspace with owner/admin/member roles
- Row-Level Security (RLS) at database level — full tenant isolation
- Multiple profiles per workspace (e.g., one per client for agencies)
- Dedicated profiles page with search, filters, and table view

---

## 3. Business Model & Pricing

**Model:** Freemium SaaS with usage-based tier upgrades.

| Plan | Price | Profiles | Syncs/Day | AI Diagnostics/Month | Extras |
|------|-------|----------|-----------|----------------------|--------|
| Free | $0 | 1 | 1 | 3 | — |
| Starter | $19/mo | 5 | 4 | 20 | Email notifications |
| Pro | $49/mo | 25 | 24 | Unlimited | Priority support |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Custom |

**Billing infrastructure:** Stripe (checkout sessions, customer portal, webhook-driven subscription lifecycle).

**Key assumptions:**
- Primary expansion lever: number of profiles (agencies managing multiple clients)
- Secondary lever: sync frequency (teams wanting near-real-time monitoring)
- AI diagnostic cost per report: ~$0.01–0.05 (Claude API, depending on prompt size)
- Gross margin on paid plans is high (infrastructure costs are low — Supabase, Vercel serverless, Claude API)

**No trial period.** Free plan is permanent and fully functional (just rate-limited). Upgrade path is friction-free via Stripe Checkout.

---

## 4. Technical Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), React 18, TypeScript 5 |
| Database & Auth | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| AI | Anthropic Claude SDK (Sonnet model for diagnostics) |
| Payments | Stripe (subscriptions, checkout, portal, webhooks) |
| Email | Resend |
| Analytics | PostHog |
| Error Tracking | Sentry (`@sentry/nextjs`) |
| Styling | Tailwind CSS + shadcn/ui + Lucide icons |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions → Vercel |
| Deployment target | Vercel (serverless + Vercel Cron for scheduled jobs) |

### Database Schema (16 migration files)
Core tables: `users`, `workspaces`, `workspace_members`, `automation_profiles`, `automation_issues`, `platform_connections`, `automations`, `execution_logs`, `diagnostic_reports`, `audit_schedules`, `notifications`, `notification_preferences`, `subscriptions`.

Recent additions: performance indexes, batch RPC functions (`update_automation_stats`, `update_profile_scenario_count`), execution log retention, pg_cron sync job, Make.com zone + team_id columns, Zapier webhook token hashing (retained for potential future use).

All tables have RLS policies enforced via `get_user_workspace_ids()` / `get_user_admin_workspace_ids()` helper functions. Credentials are encrypted at rest with AES-256-GCM before storage.

### Security Measures
- AES-256-GCM encryption for stored platform credentials (`ENCRYPTION_KEY` required)
- Zod schema validation on all API inputs (centralized in `src/lib/validation/schemas.ts`)
- Workspace membership checks (defense-in-depth beyond RLS) via `getWorkspaceMembership()`
- OAuth redirect validation (allowlist-based)
- Stripe webhook signature verification
- `CRON_SECRET` bearer auth on the Vercel Cron endpoint
- Exponential backoff retry with jitter on all external API calls
- Security headers configured at the framework level
- Critical env-var validation on boot (`src/lib/env.ts`)

### API Surface
API endpoints organized under `src/app/api/`: diagnostics, connections (CRUD + test), sync trigger, cron (scheduled sync), notifications (list, read, bulk-read), schedules (CRUD), and billing (checkout, portal, webhook).

### Routing
- `src/app/(auth)/` — login, signup, forgot/reset password, OAuth callback
- `src/app/app/[workspaceSlug]/` — authenticated workspace area (dashboard, profiles, connections, billing, settings)
- `src/app/dashboard/[profileId]/` — public demo dashboards (4 hardcoded profiles, no auth)

### Test Coverage
78 tests across 7 files (~65% coverage), covering:
- Sync engine: `health-calculator`, `issue-detector`
- Platform adapters: `make`, `n8n`
- Validation: Zod schemas for all API inputs
- Crypto: AES-256-GCM round-trip + SHA-256 hashing
- API routes: cron sync endpoint

---

## 5. Current Development State

### What's Built (Phases 1–10 complete)
- Full auth flow (email/password + OAuth callback handling)
- Multi-tenant workspace system with RBAC
- Platform connection management with encrypted credential storage (Make.com zone + team_id, n8n instance URL)
- Sync engine: fetch automations, calculate health scores, detect issues, bulk upserts via RPC
- AI diagnostic report generation with Claude
- Notification system (in-app + email via Resend)
- Stripe billing (4 tiers, checkout, portal, webhooks, plan limit enforcement)
- Onboarding flow (auto-workspace creation, guided setup)
- 4 demo profiles (Coastal Content Agency, GreenLeaf Commerce, Creator Stack, InfraFlow DevOps) for prospects to explore without signup
- Dedicated profiles page with search, filters, and table view
- **Phase 9 — Production hardening:** input validation, workspace auth, redirect protection, bulk DB ops, pagination, retry w/ backoff
- **Phase 10 — Ship readiness:** scheduled sync via Vercel Cron (`/api/cron/sync`, every 15 min), Vitest test suite (78 tests, ~65% coverage), Sentry error tracking, security headers, GitHub Actions CI, SEO metadata, favicon, robots.txt, sitemap
- Make.com zone selector + team_id support, improved sync/diagnostics UX

### What's NOT Built / Known Gaps
- **Zapier integration:** Removed from v1 (unstable Partner Program API). Not on near-term roadmap without OAuth access.
- **Diagnostics-per-month limit enforcement:** Defined in plan config but not enforced at the API endpoint.
- **Per-IP / per-user rate limiting:** Beyond plan-based quotas, no infrastructure-level rate limiting on API routes.
- **Self-hosting support:** No Docker config; Vercel-only deployment.
- **Deeper observability:** Sentry is wired up, but structured logging beyond `console.error` is not standardized.
- **Production security audit:** Not yet performed by a third party.

### Deployment Readiness
- **Demo/staging:** Ready. Demo profiles work without auth or external services.
- **Production:** Deployable. Requires env-var setup (Supabase, Stripe keys + webhook, `ENCRYPTION_KEY`, `CRON_SECRET`, optional Sentry/Anthropic/Resend). Vercel Pro required for the cron job.

---

## 6. Competitive Landscape

### Direct Competitors (automation monitoring)
- **Rollbar / Sentry for workflows:** Generic error tracking tools don't understand automation-specific failure modes (silent failures, credential expiration, zombie workflows).
- **Platform-native monitoring:** Zapier has basic error emails, Make.com has scenario logs — but none provide cross-platform health scoring, AI diagnostics, or proactive issue detection.
- **Workload.co:** Zapier-specific monitoring. Narrower scope (single platform).

### Indirect Competitors
- **Automation platforms themselves:** Make.com and n8n have built-in execution logs, but they don't aggregate health scores or generate diagnostic reports.
- **Ops/DevOps tools (PagerDuty, Datadog):** Monitor infrastructure, not business automation workflows. Different user persona.
- **Consulting/agencies:** Some agencies manually audit client automations — Runmend automates this.

### Differentiation
- **Cross-platform:** Single dashboard for Make.com + n8n today; designed to extend to additional platforms (Zapier re-entry, Pipedream, Workato) as APIs allow
- **AI diagnostics:** Natural language reports explaining what's broken, why it matters, how to fix it
- **Silent failure detection:** Purpose-built rules for automation-specific failure modes
- **Agency use case:** Multi-profile workspaces designed for agencies managing client automations

---

## 7. Risks & Open Questions

### Technical Risks
1. **Narrower platform coverage than originally planned.** Zapier was removed from v1 due to API limitations. Platform breadth is a core differentiation claim, and we're currently at 2 (Make.com, n8n). Re-introducing Zapier or adding another platform (Pipedream, Workato) is important for the cross-platform narrative.
2. **Test coverage is decent but not comprehensive.** ~65% with 78 tests. No E2E test runs in CI yet; Playwright is installed but journeys aren't codified.
3. **Single-developer codebase.** Bus factor of 1. CI/CD exists but there is no code review process.
4. **Vercel lock-in.** Cron, edge, and deployment flows assume Vercel. No Docker path.

### Business Risks
1. **Platform dependency.** Make.com or n8n could build equivalent monitoring features natively, eliminating Runmend's value for that platform.
2. **Market size uncertainty.** The pain is real but may not be large enough for a standalone SaaS. Many users have <10 automations and can monitor manually.
3. **Pricing validation.** $19–$49/mo pricing is assumed, not validated. Willingness-to-pay for monitoring (vs. the automation platform itself) is unproven.
4. **Agency vs. individual.** The strongest use case (agencies managing client automations) is a narrow market. Individual users may not pay for monitoring they can do manually.
5. **AI cost scaling.** If diagnostic reports become popular, Claude API costs scale with usage. Current pricing assumes low per-report cost, but complex reports with large execution log context could be more expensive.
6. **Cross-platform claim is weaker without Zapier.** The initial positioning emphasized Zapier + Make.com + n8n. With Zapier gone, the "cross-platform" story needs rework or a third platform.

### Go-to-Market Questions
- What's the primary acquisition channel? (Content marketing? Platform marketplaces? Agency partnerships?)
- Is the demo-first approach (4 profiles, no signup required) effective for conversion?
- Should Enterprise tier be self-serve or sales-led?
- Is there a partnership path with Make.com or n8n (marketplace listing, integration partner program)?
- What does the next platform integration look like — re-enter Zapier when OAuth is feasible, or add Pipedream / Workato first?

---

## 8. Key Metrics & Assumptions

### Assumptions to Validate
| Assumption | How to Validate |
|-----------|-----------------|
| Automation failures are a significant pain point | Customer interviews, landing page conversion rate |
| Users will pay $19–49/mo for monitoring | Pricing page A/B tests, early customer feedback |
| AI diagnostics are a meaningful differentiator vs. rule-based alerts alone | Feature usage tracking (do users regenerate reports? read them?) |
| Agencies are the primary buyer | Segment analysis of early signups (individual vs. team workspaces) |
| Two-platform coverage (Make.com + n8n) is enough to sell a "cross-platform" story | Win/loss interviews, tracking requests for other platforms |
| Cross-platform monitoring matters (vs. single-platform) | Percentage of users connecting 2+ platforms |

### Metrics to Track Post-Launch
- **Activation:** % of signups who connect at least 1 platform
- **Engagement:** Syncs triggered per user per week, diagnostic reports generated
- **Retention:** Weekly active workspace rate, churn by plan tier
- **Conversion:** Free → Starter, Starter → Pro upgrade rates
- **Revenue:** MRR, ARPU, LTV, CAC (once acquisition channels are active)
- **Product-market fit signal:** "How disappointed would you be if Runmend no longer existed?" survey

---

## 9. Summary for Validation

**Runmend is an AI-powered monitoring layer for business automation platforms (Make.com and n8n today; Zapier deferred).** It detects silent failures, credential expirations, and workflow health degradation that the platforms themselves don't surface — then generates AI diagnostic reports with prioritized fix recommendations.

**Current state:** Feature-complete MVP deployed-ready. Freemium billing, multi-tenant workspaces, 2 active platform integrations, AI diagnostics, scheduled sync (Vercel Cron, 15 min), ~65% test coverage (78 tests), Sentry, GitHub Actions CI. Solo developer.

**Business model:** Freemium SaaS ($0 / $19 / $49 / custom per month) gated by number of monitored profiles, daily sync frequency, and monthly AI diagnostics.

**Core bet:** Automation reliability is an underserved pain point, and the combination of cross-platform monitoring + AI diagnostics creates enough value to justify a standalone subscription.

**Biggest risks:** Platform dependency (incumbents could build this natively), narrower-than-planned platform coverage (Zapier deferred), pricing validation, and market size for a monitoring-only tool aimed primarily at agencies.

---

*Generated from codebase analysis on 2026-04-17 (Phase 10 ship-readiness complete, 16 migrations, 78 tests, Vercel Cron live). For the most current state, refer to the repository directly.*
