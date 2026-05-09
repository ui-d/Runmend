# Runmend — Startup Validation Brief

> Comprehensive summary of the Runmend startup, written for external LLM / investor / advisor review. Covers the problem, product, business model, technology, current state, traction, and open risks.
>
> **Last refreshed:** 2026-05-08 — adds Agency tier ($149/mo), pilot testimonials, Benchmarks coming-soon section, `/vs-claude-cowork` honest comparison page, production-readiness wave (cookie-consent gating, cron health, LTD refund alerts), and the 24-migration / 475-test-file state.

---

## 1. Problem Statement

**Automation platforms don't tell you when your workflows fail silently.**

Businesses increasingly rely on workflow automation tools (Make.com, n8n, and similar) to connect their SaaS stack — syncing CRM entries, processing payments, sending notifications, onboarding customers. But these platforms have a critical blind spot: when an automation stops firing, credentials expire, or a webhook goes dead, there is often **no alert**. The workflow simply stops working.

**The consequences are real:**
- Invoices stop generating (revenue leakage)
- Customer onboarding emails stop sending (churn)
- Data sync between tools breaks silently (data integrity)
- Expired OAuth tokens disable entire workflow chains

**Market signals (used in marketing; independent validation recommended):**
- 61% of Zapier users report having had a Zap fail silently
- Average time to notice a silent failure: 4.2 days
- Estimated average revenue lost per undetected failure: $12,400

**Pilot-validated pain (paraphrased, anonymized):**
- *"We had a Make scenario quietly returning 200s with empty payloads for nine days before a client noticed."* — Ops lead, 14-client Make.com agency
- *"Half our incidents are expired Google or Stripe creds nobody remembers connecting. We stopped finding out from clients."* — n8n consultancy founder, 8 retainer clients
- *"The Claude diagnostic doesn't just say 'error rate is 12%' — it tells the junior on call which scenario to open first and why. Cut our triage time in half."* — Automation lead, SaaS-services agency

**Who feels this pain most (now the explicit ICP):**
- **Marketing/automation agencies managing client automations** — tens to hundreds of scenarios/workflows across many client accounts. *This is the primary buyer.*
- E-commerce operators with order/fulfillment/notification chains
- SaaS/DevOps teams running self-hosted n8n with infrastructure concerns
- Any team where automation is critical but not someone's full-time job

The product was repositioned in April 2026 (commit `4349d98`) from generic "automation health monitoring" to **"production monitoring for Make.com and n8n agencies"** — narrowing to the strongest pull.

---

## 2. Product Description

**Runmend** is an AI-powered automation health monitoring SaaS for agencies running Make.com and n8n in production. It connects to your platforms (read-only), audits your workflows on a 15-minute cycle, detects problems via 6 purpose-built rules, generates AI diagnostic reports, and routes alerts per profile / per channel.

### Core Value Loop

1. **Connect** — User links their Make.com or n8n account (read-only API access). Multi-zone support (us1, eu1, eu2, us2). One profile per client (multi-connection support).
2. **Sync** — Runmend pulls automation metadata and execution logs (Vercel Cron, every 15 min, 50s wall-clock budget per cycle).
3. **Analyze** — Health score calculated (0–100), issues detected by 6 rule-based detectors.
4. **Diagnose** — Claude AI generates a natural-language report: what's broken, why it matters, how to fix it.
5. **Alert** — Per-profile, per-channel notifications (in-app, email via Resend, Slack stub) with severity filters, event×channel routing, daily/weekly digest, quiet hours.

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
- Powered by Claude (Anthropic API, `claude-sonnet-4-5-20250929` default, configurable via `CLAUDE_MODEL`)
- 3-section structured output: Overall Health Assessment, Most Dangerous Issue, 3 Prioritized Recommendations
- Reports persisted with history + `tokens_used` for trend tracking and cost auditing
- Regenerate on demand
- Demo profiles ship fallback narratives when `ANTHROPIC_API_KEY` is unset

**Platform Integrations**
| Platform | Auth Method | Capabilities |
|----------|-------------|--------------|
| Make.com | API token + zone + optional team_id | Scenarios (paginated, up to 5000), execution logs, connection test. Multi-zone (us1/eu1/eu2/us2) with team-scoped access. |
| n8n | API key + instance URL | Workflows (up to 250 via cursor pagination, 5 pages), execution logs. Self-hosted support. |
| Zapier | — | **Removed from v1** (unstable Partner Program API). Schema stubs remain inert. |

**Multi-Connection Profile Binding (shipped 2026-04-22)**
Profiles bind to a specific `connection_id` rather than implicit platform-match. Lets agencies model **one profile per client** with that client's own credentials in the same workspace — the previous design forced one workspace per client. Same-workspace + same-platform integrity enforced by the `assert_profile_connection_match` trigger.

**Notifications**
- In-app bell with unread count, server-rendered initial state (no client-side fetch on mount)
- Per-user, per-workspace preferences with severity filter, event×channel routing matrix, daily/weekly digest, quiet hours (timezone-aware), per-profile muting/snooze
- Email via Resend (paid plans); Slack and webhook scaffolding present

**Multi-Tenant Workspaces**
- Owner / admin / member roles with RLS at the database level
- Multiple profiles per workspace (agency use case)
- Settings IA: 9-section left-rail (workspace / account / team / alerts / integrations / api / security / data / danger)

### Public Demo
4 hardcoded profiles at `/dashboard/[profileId]` — Coastal Content Agency (Make, health 34), GreenLeaf Commerce (Make, health 62), Creator Stack (Make, health 91), InfraFlow DevOps (n8n, health 52). No signup required. Used to demonstrate the diagnostic surface to prospects without the activation friction of connecting credentials.

### Honest Competitive Page
`/vs-claude-cowork` — explicit comparison page acknowledging that **Claude.ai's native Make.com / n8n connectors + Cowork Live Artifacts** cover single-account hobbyist monitoring. Runmend wins on: multi-account / multi-zone, self-hosted n8n without IP allowlisting, six purpose-built failure detectors, ≤15-minute audit cadence, per-channel email/Slack routing.

---

## 3. Business Model & Pricing

**Model:** Freemium SaaS with usage-based tier upgrades. **14-day free trial** on all paid plans (no credit card to start).

| Plan | Price | Profiles | Syncs/Day | AI Diagnostics/Month | Extras |
|------|-------|----------|-----------|----------------------|--------|
| **Free** | $0 | 1 | 1 | 3 | Community support |
| **Starter** | $19/mo | 5 | 4 | 20 | Email alerts, email support |
| **Pro** ⭐ | $49/mo | 25 | 24 | Unlimited | Email + Slack, custom alert rules, priority support |
| **Agency** *(new)* | $149/mo | 100 | 96 (every 15 min) | Unlimited | Dedicated onboarding call |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited | Dedicated AM, custom onboarding |

**Lifetime Deal (LTD)** — one-time payment treated internally as Pro via the `is_ltd` flag. `claim_ltd_seat` RPC reserves a seat with refund logic if oversold. Used as an early-traction lever; failed-refund alerts pipe to email.

**Billing infrastructure:** Stripe (checkout sessions, customer portal, subscription lifecycle webhooks). Webhook idempotency via `stripe_webhook_events` table (PK violation = skip — defense against replay). VAT mirroring on invoices.

**Why Agency tier was added (2026-05-08):**
The pricing gap between Pro (25 profiles, $49) and Enterprise (custom) was leaving real agencies — those running 50–100 client automations — without a self-serve path. Pricing review (`docs/PRICING_REVIEW.md`) identified this as the highest-friction gap. $149 at 100 profiles holds per-profile economics roughly in line with Pro while signaling "agency, not solo operator."

**Key economic assumptions:**
- Primary expansion lever: number of profiles (agencies managing multiple clients)
- Secondary lever: sync frequency (teams wanting near-real-time monitoring)
- AI diagnostic cost per report: ~$0.01–0.05 (Claude API, depending on prompt size)
- Gross margin on paid plans is high — Supabase, Vercel serverless (Fluid Compute), Claude API are the main cost lines

---

## 4. Technical Architecture

### Stack (exact versions)
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.35 (App Router), React 18, TypeScript 5 |
| Database & Auth | Supabase (`@supabase/supabase-js@2.103.0`, `@supabase/ssr@0.10.2`) — Postgres + Auth + RLS + Realtime |
| AI | `@anthropic-ai/sdk@0.80.0`, default model `claude-sonnet-4-5-20250929` |
| Payments | `stripe@22.0.1` (subscriptions, checkout, portal, webhooks, LTD) |
| Validation | `zod@4.3.6` |
| Email | `resend@6.10.0` |
| Analytics | PostHog (`posthog-js@1.364.1`) — **gated behind cookie consent** (commit `458ce33`) |
| Error Tracking | `@sentry/nextjs@10.48.0` (client config + `instrumentation.ts`) |
| Styling | Tailwind 3.4.1 + shadcn 4.1.1 + `@base-ui/react@1.3.0` + Lucide icons |
| Testing | Vitest 4.1.4 + `@vitest/coverage-v8` + Playwright 1.59.1 |
| CI/CD | GitHub Actions → Vercel (Node 24 LTS, Fluid Compute) |

### Database Schema (24 migration files)
Core tables: `users`, `workspaces`, `workspace_members`, `automation_profiles`, `automation_issues`, `platform_connections`, `automations`, `execution_logs`, `diagnostic_reports`, `audit_schedules`, `notifications`, `notification_preferences`, `subscriptions`.

Recent additions:
- `profile_health_snapshots` — daily trending for pulse charts
- `automation_profiles.connection_id` (FK + integrity trigger) — multi-connection support
- `automation_profiles.snoozed_until` — per-profile mute
- Make.com `zone` + `team_id` columns
- LTD: `subscriptions.is_ltd`, `ltd_purchased_at`, `billing_email/country/tax_id`, `ltd_allocations` (seat tracking)
- `stripe_webhook_events` — idempotency PK
- `failed_refunds` — LTD refund failure alerting pipeline
- `connection_interest`, `connection_requests` — coming-soon platform voting

All tables have RLS policies enforced via `get_user_workspace_ids()` / `get_user_admin_workspace_ids()` helper functions. Credentials are AES-256-GCM encrypted before storage.

### Security Layer
- AES-256-GCM encryption for stored platform credentials (`ENCRYPTION_KEY`, 64-char hex)
- Zod schema validation on every API route input (`src/lib/validation/schemas.ts`)
- `getWorkspaceMembership()` defense-in-depth check on all workspace API routes
- OAuth redirect allowlist (`src/lib/security/redirect.ts`) — rejects `//`, protocols, `%2f`-encoded
- Stripe webhook signature verification + idempotency
- `CRON_SECRET` bearer auth on `/api/cron/sync`
- Exponential backoff retry with jitter (`fetchWithRetry`) on all external API calls
- Security headers configured at the framework level
- Critical env-var validation on boot (`src/lib/env.ts`)
- PostHog requires explicit cookie consent before any tracking fires

### API Surface
17 endpoints under `src/app/api/`: diagnostics, connections (CRUD + test), sync (manual + cron), notifications (list / read / mark-all / preferences), schedules (per-profile), billing (checkout / portal / claim-ltd / invoices / webhook), issues (dismiss), health.

### Routing
- `/(auth)/` — login, signup, forgot/reset password, OAuth callback (Google + GitHub; no magic links)
- `/app/[workspaceSlug]/` — authenticated workspace (dashboard, profiles, profile-detail, connections, billing, settings)
- `/dashboard/[profileId]/` — public demo (4 hardcoded profiles, no auth)
- `/pricing`, `/vs-claude-cowork`, `/` (marketing landing)

### Test Coverage
**475 test files. CI gate: 90% lines / 90% statements / 90% functions / 84% branches** (`test:coverage:check`).

Scope: `src/lib/**`, `src/app/api/**/route.ts`, `src/app/**/actions.ts`, `src/middleware.ts`. Excluded: type defs, tests, pages/layouts, UI primitives, demo profiles, Supabase client factories.

Shared harness: `src/test/` — Supabase / Stripe / Anthropic mocks, typed factories, NextRequest helpers. E2E via Playwright.

### Performance Wave (latest)
- Per-request `React.cache` dedupe (`src/lib/cache.ts` shim, no-op under Vitest) on `createClient`, workspace, subscription, pulse loaders — layout + page share one DB hit per request
- Parallelized waterfalls in `getWorkspacePulse`, `getConnectionsWithHealth`, `getWorkspaceProfileCards`
- Route-level `loading.tsx` skeletons across every authenticated segment — instant-paint navigation
- Server-rendered initial notifications (NotificationBell no longer fetches on mount)
- `experimental.optimizePackageImports` for `lucide-react`

### Forward-Looking R&D
- **MCP server (`docs/MCP_SERVER_DESIGN.md`, Phase 3 design)** — expose Runmend as an MCP tool so AI agents (Claude Cowork, Cursor, etc.) can query workspace health, fetch diagnostic reports, and trigger syncs programmatically. Strategic counter-positioning to the `/vs-claude-cowork` competitive surface: agents become a distribution channel rather than a competitor.

---

## 5. Current Development State

### What's Built (Phases 1–10 + post-ship waves)
- Full auth flow (email/password + Google/GitHub OAuth)
- Multi-tenant workspaces with RBAC
- Platform connection management with encrypted credentials (Make.com zone + team_id, n8n instance URL)
- Sync engine: bulk upserts, RPC-based stat updates, per-profile granularity
- AI diagnostic generation with Claude
- Notification system (in-app + email + Slack/webhook stubs)
- Stripe billing — 4 paid tiers + Free + LTD, checkout, portal, webhook idempotency, plan limit enforcement
- Onboarding flow + first-time wizard + next-steps checklist
- 4 demo profiles for prospect exploration without signup
- Profiles page (dense triage table), profile detail (gauge, grouped issues, Make deep-links)
- Connections-as-catalog (per-platform groups, 2-col grid, interest voting on coming-soon platforms)
- 9-section settings left-rail with alerts config surface
- **Phase 9 — Production hardening:** input validation, workspace auth, redirect protection, bulk DB ops, pagination, retry w/ backoff
- **Phase 10 — Ship:** Vercel Cron sync, Sentry, security headers, GitHub Actions CI, SEO metadata, sitemap
- **Post-ship product waves:** public `/pricing`, marketing homepage redesign (animated, reduced-motion-aware), profile health snapshots for pulse trending, profile snooze, Make zone + team_id, multi-connection profile binding (one profile per client credential), unified add-connection modal, sonner toast system, profile-connection widget on profile detail
- **Production-readiness wave (April 2026):** PostHog cookie-consent gating, cron health checks, release tracking, LTD failed-refund alerting pipeline to email, Stripe webhook idempotency
- **Tab-switch perf wave:** per-request `React.cache` dedupe, parallel waterfalls, `loading.tsx` skeletons everywhere, server-rendered initial notifications
- **Pricing/social-proof wave (May 2026):** Agency tier ($149/mo, 100 profiles), 3 pilot agency testimonials, Benchmarks "coming soon" section, `/vs-claude-cowork` honest comparison page

### What's NOT Built / Known Gaps
- **Zapier integration:** Removed from v1 (unstable Partner Program API). Inert columns remain. Not on near-term roadmap without OAuth access.
- **Diagnostics-per-month limit enforcement:** Defined in plan config but not enforced at the API endpoint.
- **Per-IP / per-user rate limiting:** Beyond plan-based quotas, no infrastructure-level rate limiting on API routes.
- **Self-hosting:** No Docker config; Vercel-only deployment.
- **Annual billing:** On roadmap, not shipped (FAQ acknowledges).
- **Slack / webhook notification channels:** Scaffolding present, not yet wired end-to-end.
- **MCP server:** Design doc exists (Phase 3), implementation not started.
- **Benchmarks feature:** Marketed as "coming soon" — unlocks once pilot density across Make + n8n agencies is reached. Long-term moat play.
- **Production security audit:** Not yet performed by a third party.

### Deployment Readiness
- **Demo/staging:** Ready. Demo profiles work without auth or external services.
- **Production:** Live-deployable. Requires Supabase, Stripe keys + webhook, `ENCRYPTION_KEY`, `CRON_SECRET`, optional Sentry / Anthropic / Resend / PostHog. **Vercel Pro required** for the cron job.

---

## 6. Traction & Validation

### Pilot Program
**Three agencies** running Runmend against real client workspaces during the build phase. Quotes used on the landing page (paraphrased, anonymized at request):
1. 14-client Make.com agency — silent-failure detection thesis confirmed
2. 8-client n8n consultancy — credential-expiration as primary alert driver
3. SaaS-services agency — AI diagnostic cuts triage time in half (junior on-call value)

These are pilot relationships, not paid customers — the traction signal is **engaged usage during build**, not revenue. They are the source of the testimonials section and the design partners for multi-connection profile binding (which exists because they asked for it).

### Repositioning History
- **Original positioning:** "Cross-platform automation health monitoring (Zapier + Make + n8n)"
- **April 2026 (commit `4349d98`):** Repositioned as "production monitoring for Make.com and n8n agencies" — narrowing to the strongest signal from pilot conversations, dropping the cross-platform claim that had weakened with Zapier removal.
- **May 2026:** Added Agency tier + pilot testimonials + Benchmarks teaser to support agency-led GTM.

### Competitive Surface Acknowledged
The `/vs-claude-cowork` page (commit `f065c47`) is an honest comparison admitting that Claude.ai's native Make/n8n connectors handle single-account hobbyist monitoring. This is unusual for a SaaS landing page and signals confidence in the agency-tier ICP differentiation (multi-account, self-hosted n8n, dedicated detectors, ≤15-min cadence, email/Slack alerting).

---

## 7. Competitive Landscape

### Direct
- **Claude.ai native Make/n8n connectors + Cowork Live Artifacts** *(new competitor surface, addressed via `/vs-claude-cowork`)* — covers single-account hobbyist monitoring; loses on multi-account, self-hosted n8n, dedicated detectors, and structured alerting.
- **Workload.co** — Zapier-specific monitoring. Narrower scope (single platform, not in our v1 stack).
- **Generic error tracking (Rollbar / Sentry):** Don't understand automation-specific failure modes (silent failures, credential expiration, zombie workflows).
- **Platform-native monitoring:** Make.com has scenario logs; n8n has execution history. Neither aggregates health scores or generates diagnostic reports.

### Indirect
- **PagerDuty / Datadog / ops tooling** — monitor infrastructure, not business automation. Different persona.
- **Manual agency audits** — spreadsheets and human review. Runmend automates this.

### Differentiation
- **Agency-shaped:** Multi-connection profile binding lets one workspace serve 50–100 clients with isolated credentials — purpose-built for the buyer.
- **Cross-platform within scope:** Single dashboard for Make.com (all 4 zones) + self-hosted n8n; designed to extend.
- **AI diagnostics:** Structured 3-section reports, not raw error counts.
- **Six purpose-built detectors** for automation-specific failure modes.
- **Alerting that actually pages:** Email + Slack + per-profile + severity filters.
- **Honest competitive surface:** `/vs-claude-cowork` builds trust by admitting where Claude Cowork is the right tool.
- **Future MCP server:** Agents become a distribution channel rather than a substitute (design phase).

---

## 8. Risks & Open Questions

### Technical Risks
1. **Narrower platform coverage than originally planned.** Zapier removed; current stack is Make.com + n8n. Re-introducing Zapier or adding Pipedream/Workato would broaden the cross-platform claim.
2. **Bus factor of 1.** Solo developer codebase. CI/CD exists but no code review process. Mitigated by 90% coverage gate and Sentry, but not eliminated.
3. **Vercel lock-in.** Cron, edge, and deployment flows assume Vercel. No Docker path for self-hosters.
4. **Anthropic API single-vendor dependency.** No model fallback/routing layer despite running on Vercel (which now offers AI Gateway). Cost shock or rate limit on Anthropic side has no fallback.

### Business Risks
1. **Platform dependency.** Make.com or n8n could build equivalent monitoring natively, eliminating Runmend's value for that platform.
2. **Claude Cowork-class native AI integrations** could absorb the single-account use case entirely. Mitigated by ICP narrowing to multi-account agencies and the planned MCP server (turning agents into distribution).
3. **Pricing validation.** $19 / $49 / $149 / mo is assumed, not validated by paid conversion data. Pilot program produced testimonials but not (yet) paid retention.
4. **Agency market depth.** The strongest use case (agencies managing client automations) is a real but bounded market. Total addressable agency count globally for Make + n8n specifically is not publicly known.
5. **AI cost scaling.** Diagnostic reports cost $0.01–0.05 each currently; complex reports with large execution log context could climb. Pro/Agency unlimited diagnostics is a margin risk if heavy users emerge.
6. **Benchmarks moat is conditional on density.** "Coming soon" benchmarks unlock only once enough agencies are connected to produce a meaningful peer cohort. Chicken-and-egg dynamic.
7. **GTM channel unproven.** No paid acquisition data; pilot relationships were direct outreach. Content marketing, agency partnerships, and Make/n8n marketplace listings are all hypothetical.

### Go-to-Market Open Questions
- Primary acquisition channel — content marketing, marketplace listings, or agency partnerships?
- Is the demo-first approach (4 profiles, no signup) effective for activation? (No conversion data yet.)
- Should Enterprise be self-serve via Stripe checkout or sales-led?
- Is there a partnership path with Make.com or n8n (marketplace listing, integration partner program)?
- Does the MCP server (Phase 3 design) reframe Claude Cowork from competitor to distribution channel?
- What does the third platform integration look like — re-enter Zapier when OAuth is feasible, or add Pipedream / Workato first?

---

## 9. Key Metrics & Assumptions

### Assumptions to Validate
| Assumption | How to Validate |
|-----------|-----------------|
| Automation failures are a significant pain point | Pilot interviews ✓ — testimonials confirm. Landing page conversion remains to be measured. |
| Agencies will pay $149/mo for monitoring at 100 profiles | Agency tier just shipped — no paid conversion data yet. |
| Pro tier ($49/mo, 25 profiles) is the right mid-market price | Stripe conversion analysis once enough signups exist. |
| AI diagnostics are a meaningful differentiator vs. rule-based alerts alone | Feature usage tracking (regenerate rate, time-to-read, copy-paste behavior). |
| Agencies are the primary buyer | Segment analysis of paid signups — workspace member count, profile count distribution. |
| Two-platform coverage (Make + n8n) is sufficient for the agency ICP | Win/loss interviews; tracking requests for additional platforms. |
| MCP server makes agents a distribution channel rather than a competitor | After ship — measure agent-driven activations. |

### Metrics to Track Post-Launch
- **Activation:** % of signups who connect at least 1 platform within 7 days
- **Engagement:** Syncs per workspace per week, diagnostic reports generated, alert dismissal rate
- **Retention:** Weekly active workspace rate, churn by plan tier
- **Conversion:** Free → Starter, Starter → Pro, Pro → Agency upgrade rates; trial → paid
- **Revenue:** MRR, ARPU, LTV, CAC (once acquisition channels are active)
- **Cost:** Claude tokens per paid workspace per month (margin sentinel)
- **PMF signal:** "How disappointed would you be if Runmend no longer existed?" (Sean Ellis test)
- **Benchmarks unlock signal:** number of distinct agencies connected per platform

---

## 10. Summary for Validation

**Runmend is AI-powered production monitoring for Make.com and n8n agencies.** It detects silent failures, credential expirations, and workflow health degradation that the platforms themselves don't surface — then generates Claude-written diagnostic reports and routes per-profile, per-channel alerts. Multi-connection support (one profile per client) is purpose-built for the agency ICP.

**Current state (2026-05-08):** Feature-complete production deployment.
- 24 Supabase migrations · 475 test files · 90/90/90/84 CI coverage gate
- Full auth, multi-tenant workspaces, 2 platform integrations (Make.com all-zones + n8n self-hosted)
- AI diagnostics, notifications (in-app + email), Stripe billing across 5 tiers + LTD
- Vercel Cron 15-min sync · Sentry · cookie-consent-gated PostHog · GitHub Actions CI
- Production-readiness wave done (cron health, release tracking, LTD refund alerts, webhook idempotency)
- 3 pilot agencies running it against real client workspaces

**Business model:** Freemium SaaS — Free / $19 Starter / **$49 Pro** / **$149 Agency** *(new)* / Enterprise. 14-day trial on paid plans. LTD as one-time pro-equivalent.

**Core bet:** Automation reliability is an underserved pain point for agencies, and the combination of agency-shaped multi-connection support + six purpose-built detectors + Claude diagnostics + per-channel alerting creates enough value to justify a standalone subscription that the underlying platforms (Make/n8n) and adjacent AI tools (Claude Cowork) won't replicate within the agency ICP.

**Biggest risks:**
1. Platform dependency — Make/n8n could build this natively
2. Claude Cowork-class native AI integrations absorbing the long tail
3. Pricing validation — testimonials yes, paid retention not yet measured
4. Bus-factor-1 development risk
5. Benchmarks moat is conditional on pilot density (chicken-and-egg)
6. GTM channel unproven — no paid acquisition data yet

**Strategic moves in flight:**
- **Agency tier ($149/mo)** to fill the pricing gap between Pro and Enterprise
- **Pilot testimonials** as first social proof, replacing pure prospect-survey numbers
- **Benchmarks "coming soon"** as long-term cohort moat
- **`/vs-claude-cowork` honest comparison page** as trust-building competitive surface
- **MCP server (Phase 3 design)** to reframe AI agents from competitor to distribution channel

---

*Generated from codebase analysis on 2026-05-08. Repository: `/Users/dawidnawrocki/Desktop/runmend`. Current branch: `main` (clean). Latest commit: `63d50e5 feat: add Agency tier, pilot testimonials, and Benchmarks coming-soon`. For the most current state, refer to the repository directly and `docs/RUNMEND_STATE.md`.*
