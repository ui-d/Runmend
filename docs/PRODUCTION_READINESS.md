# Runmend Production Readiness Plan

**Status**: pre-launch • **Supabase state**: `<your-supabase-project-ref>` = production • **Stripe**: soft-launch in test mode → cutover to live • **Domain**: registered (fill in `<YOUR_DOMAIN>` in the examples below) • **Analytics**: PostHog minimal with EU consent banner (code ready, keys in A1)

**Shipped on `main`** during this session:
- `1ef76f4` — LTD refund reconciliation (retry + failed_refunds + email alert)
- `32a6740` — A4 cron schedule, A6 Sentry release tracking, A7 `/api/health`
- `458ce33` — cookie consent banner + PostHog consent gating

The plan is split into four blocks. **Block A = MUST be green before you send the link to your first beta user** (test mode). **Block B = MUST be green on the day of cutover to live Stripe**. Block C = first week post-launch. Block D = post-launch, when there's time.

Every item lists: (1) what to do, (2) how to verify, (3) file/path/command where relevant. Check them off in order.

---

## Block A — Soft-launch (test mode) | MUST HAVE

### A1. All env vars in Vercel (Production scope)

Dashboard → Project → Settings → Environment Variables. Scope: **Production**. Validate each via `vercel env ls production`. Required set (from `src/lib/env.ts:assertProductionEnv` + extended):

| Var | Soft-launch value | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-supabase-project-ref>.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable anon key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role secret** (never commit) | Supabase → Settings → API |
| `ENCRYPTION_KEY` | 64-char hex (`openssl rand -hex 32`) | **generate once, store in 1Password** |
| `STRIPE_SECRET_KEY` | `sk_test_…` (cutover to `sk_live_…` in Block B) | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | test webhook signing secret | Stripe → Developers → Webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | Stripe |
| `STRIPE_PRICE_STARTER` / `_PRO` / `_LTD` | test price IDs | Stripe → Products |
| `CRON_SECRET` | `openssl rand -hex 32` | **generate once** |
| `ANTHROPIC_API_KEY` | production key (rate-limited billing) | console.anthropic.com |
| `RESEND_API_KEY` | production key from verified domain (A5) | resend.com |
| `LTD_ALERT_EMAIL` | your inbox, e.g. `alerts@<YOUR_DOMAIN>` | — |
| `LTD_ALERT_FROM` | `alerts@<YOUR_DOMAIN>` | must be on verified domain |
| `NEXT_PUBLIC_APP_URL` | `https://<YOUR_DOMAIN>` | — |
| `NEXT_PUBLIC_SENTRY_DSN` | from Sentry → Project Settings → Client Keys | sentry.io |
| `SENTRY_ORG` / `SENTRY_PROJECT` | slugs | sentry.io |
| `SENTRY_AUTH_TOKEN` | `sntrys_…` — `project:releases` permission | sentry.io → User Auth Tokens |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_…` (publishable project key) | posthog.com → Project → Settings → API |
| `NEXT_PUBLIC_POSTHOG_HOST` | **EU recommended**: `https://eu.i.posthog.com` (data residency + GDPR) | posthog.com |

**Verification**: `vercel env ls production | wc -l` ≥ 17. Trigger a deploy after adding — if `assertProductionEnv()` finds anything missing, deploy fails before runtime (per `instrumentation.ts:7-11`).

> **`ANTHROPIC_API_KEY` — since PR #2 it also powers Pre-flight `llm_judge`.**
> Each input with an `llm_judge` assertion triggers one Claude call
> (model = `CLAUDE_MODEL` or `claude-sonnet-4-5-20250929`), `max_tokens`
> capped to `JUDGE_MAX_OUTPUT_TOKENS = 2000`, prompt to
> `JUDGE_MAX_PROMPT_CHARS = 32000`. Token cost is accumulated in
> `preflight_runs.total_cost_cents` and capped per scenario by
> `cost_cap_cents`. **Missing key does not fail the run** — `llm_judge`
> degrades to a non-critical warning (`reason: judge_unavailable`). AI
> diagnostics work as before; this is an additional, optional consumer of
> the same key.

### A2. Domain connected to Vercel + SSL active

Vercel → Project → Settings → Domains → Add `<YOUR_DOMAIN>` + `www.<YOUR_DOMAIN>` (redirect www → apex). Add DNS records at your registrar per Vercel instructions. Wait for SSL.

**Verification**: `curl -I https://<YOUR_DOMAIN>` → HTTP 200, valid Let's Encrypt cert; `curl -I http://<YOUR_DOMAIN>` → 308 to https.

### A3. Supabase Auth redirect URLs

Supabase Dashboard → Authentication → URL Configuration. Add to "Redirect URLs":

```
https://<YOUR_DOMAIN>/callback
https://<YOUR_DOMAIN>/reset-password
https://<YOUR_DOMAIN>/**
```

Site URL: `https://<YOUR_DOMAIN>`.

**Verification**: sign up on prod, the email link points to prod, not localhost.

### A4. Vercel Cron — defined in `vercel.json` ✅ DONE (commit `32a6740`)

`vercel.json` now has a 15-min schedule on `/api/cron/sync`. Vercel automatically attaches an `Authorization: Bearer ${CRON_SECRET}` header → validated in `src/app/api/cron/sync/route.ts:20-24`. **Requires Vercel Pro** (free tier allows 1 cron, which is enough).

**Verification after deploy**: Vercel → Project → Crons shows the entry; Vercel → Logs shows GET /api/cron/sync every 15 min with a 200 response.

### A5. Resend — domain verification (DKIM/SPF)

Resend → Domains → Add Domain `<YOUR_DOMAIN>`. Add 3 DNS records (TXT SPF, DKIM CNAME, TXT DMARC). Required so `alerts@<YOUR_DOMAIN>` doesn't land in spam or get blocked by Resend.

**Verification**: Resend dashboard shows "Verified"; test: force the LTD oversold path locally with the prod key → email arrives in inbox (not spam).

### A6. Sentry — source maps + release tracking ✅ DONE (commit `32a6740`)

`next.config.mjs` now has `release.name = VERCEL_GIT_COMMIT_SHA`. If `SENTRY_AUTH_TOKEN` is in Vercel (A1), source map auto-upload runs on every build and tags the release with the commit SHA.

**Verification after deploy**: Sentry → Releases shows the new release with associated source maps; on error the stack trace shows original TS files, not `chunks/*.js`.

### A7. `/api/health` endpoint (smoke + uptime probe) ✅ DONE (commit `32a6740`)

`src/app/api/health/route.ts` returns `{status:"ok", ts}`. Used in B6 by the uptime monitor.

**Verification after deploy**: `curl https://<YOUR_DOMAIN>/api/health` → `{"status":"ok",…}`.

### A8. Smoke test full flow on prod

Manual 15-min test using Playwright MCP or manually:

1. Sign up with a real email → confirm via inbox
2. Create workspace
3. Add a Make connection (test API key)
4. Sync → profile has automations
5. Place an LTD checkout in **test mode** (card `4242 4242 4242 4242`)
6. Webhook arrives → subscription in DB has `is_ltd=true`
7. Log in on a second account, verify it can't see the other workspace (RLS)

**Verification**: every step green. If anything is red, **fix before publishing the link**.

### A9. Rollback plan documented

Vercel has Instant Rollback from the UI (Deployments → last good → Promote). Note down:
- link to the deployments dashboard
- who has permission to promote (just you, unless you add a teammate)

**Verification**: force a bad deploy locally (e.g. syntax error on preview) → confirm rollback works in < 30s.

### A10. PostHog analytics + EU cookie consent ⚠️ PARTIALLY DONE (commit `458ce33`)

**Code ready**:
- `src/components/CookieConsent.tsx` — fixed-bottom banner, localStorage-persisted, Accept/Decline
- `src/components/PostHogProvider.tsx` — gating: `posthog.init()` fires **only** after `Accept` (custom event + storage); `Decline` and no decision = zero tracking
- Banner shows once per browser; after a choice it disappears, decision held in `localStorage["runmend-consent"]`

**Still manual**:
1. Register on posthog.com (EU region — data residency). Create a project.
2. Add `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` to Vercel env (A1).
3. **Known gap**: the banner links to `/privacy` which doesn't exist yet (B4). Before publishing the launch, either create a privacy policy page or change the link. A 404 in the banner is worse UX than no link.

**Verification after deploy**:
- First visit to `https://<YOUR_DOMAIN>` → banner visible at the bottom
- Click `Accept` → PostHog → Live events shows a pageview in < 5s
- Click `Decline`, refresh, navigate a few pages → PostHog → Live events shows **nothing**
- `localStorage` in DevTools: key `runmend-consent` = `accept` or `decline`

**Scope (chosen minimal)**: pageview + pageleave auto-capture only. No `posthog.identify()` after login, no custom events (signup, ltd_checkout, oversold). Add them if you want a full funnel — see Block C addendum below.

---

## Block B — Cutover to live Stripe | MUST HAVE before real payment

Do this **only** after Block A has been stable ≥ 2-3 days and you have 2-3 beta users with test transactions.

### B1. Stripe business verification

Stripe Dashboard → Activate account. Enter VAT/tax ID, address, bank account, owner ID. Takes 1-3 days. **Without it, `sk_live_…` does not work.**

**Verification**: Stripe dashboard shows "Activated" badge, not "Test mode only".

### B2. Live keys + live price IDs in Vercel

Duplicate products from test mode to live (Stripe → Products → toggle "View test data" OFF → Create product). Note the new live price IDs.

Replace in Vercel env (Production):
- `STRIPE_SECRET_KEY` → `sk_live_…`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_…`
- `STRIPE_PRICE_STARTER` / `_PRO` / `_LTD` → live price IDs
- `STRIPE_WEBHOOK_SECRET` — **leave for now**, swap in B3

**Verification**: after deploy, run a test checkout — you should get a live URL (`checkout.stripe.com/c/pay/cs_live_…`).

### B3. Live webhook endpoint

Stripe → Developers → Webhooks (live mode) → Add endpoint `https://<YOUR_DOMAIN>/api/billing/webhook`. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.updated`, `invoice.payment_failed`. Save the signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel (overwrite the test-mode secret). Redeploy.

**Verification**: Stripe → Webhooks → Send test webhook → webhook response 200; Supabase `stripe_webhook_events` table has a new event_id.

### B4. Terms / Privacy / Refund policy

Checkout sessions require `terms_of_service_url` + `privacy_url` in Stripe dashboard Brand settings (compliance). LTD refund policy is a legal must-have for a lifetime deal.

Create 3 pages (or static routes):
- `/terms`, `/privacy`, `/refund-policy`

Minimum: copy a template from https://stripe.com/legal + tailor for LTD ("60-day refund window, otherwise non-refundable except failed service delivery"). Consult a lawyer for EU consumer / GDPR compliance.

**Verification**: Stripe → Settings → Branding → Public details has both URLs filled in; checkout session UI shows the footer link.

### B5. LTD seat count in DB

Default in `ltd_allocations.total_seats = 20` (`supabase/migrations/20260424000001_ltd_and_billing_details.sql:15`). Decision: leave at 20 or increase? Change:

```sql
UPDATE public.ltd_allocations SET total_seats = 100 WHERE id = 1;
```

Run via Supabase MCP (`mcp__supabase__execute_sql`) or the SQL Editor in the dashboard. **Business decision, not technical** — but it's the only LTD variable you need to consciously choose before launch.

**Verification**: `SELECT total_seats, seats_sold FROM ltd_allocations;` shows your target value.

### B6. Uptime monitor (external)

Vercel does not measure its own uptime for alerting. Add an external monitor (Better Stack free / UptimeRobot free / Cronitor):
- URL: `https://<YOUR_DOMAIN>/api/health` (from A7)
- Interval: 1 min
- Alert channel: email + SMS if paid

**Verification**: deliberately cause downtime (suspend deploy → resume) → monitor sends alert in < 3 min.

---

## Block C — First week post-launch | STRONG RECOMMENDATION

### C1. Sentry — alert rules

Sentry → Alerts → Create. Minimum 2 rules:
1. **Fatal-level event** → email in < 5 min (to catch LTD refund failures from `webhook/route.ts` post today's fix).
2. **Error spike** (> 20 in 15 min) → email.

### C2. Vercel Analytics + Speed Insights

Vercel → Project → Analytics → Enable. **Free on hobby, metered on Pro** — check pricing. Core Web Vitals data from prod flows to Vercel. Integration: add `@vercel/analytics` + `<Analytics />` in `app/layout.tsx`.

### C3. Supabase Point-in-Time Recovery (PITR)

Supabase → Project → Settings → Add-ons → PITR. **Requires Pro ($25/mo)**. Without it, backup = daily pg_dump, 7-day retention, but on incident you can lose up to 24h of data. With PITR — restore to any moment in the window (7 / 14 / 28 days per plan).

**Decision**: enable from launch day (not retroactively — PITR only protects the future).

### C4. Rate limiting review

Currently `src/lib/platform-adapters/retry.ts` protects only outbound calls from Runmend. There is **no** rate limiting on ingress API routes (a paid Stripe user could hit `/api/connections/[id]/test` 1000×/s). On launch day with low traffic this is fine, but add:
- Vercel Edge Config or Upstash Redis for rate limit
- Minimum: 60 req/min on `/api/*` per user

### C5. GDPR — data export + deletion

EU users have the right to export and delete their data (Supabase has RLS so workspace-scoped delete is easy). There's no UI for it. Minimum:
- Settings → Danger Zone → "Export my data" (JSON dump)
- "Delete my account" — hard delete the user + all workspaces where they're sole owner

**Important with LTD**: on delete, release the seat? Business decision — typically NO (LTD is a purchased asset), but document it in the refund policy.

### C6. Post-launch audit backlog (from the audit-plan version of `docs/PRODUCTION_READINESS.md`)

These items were out of scope for today's fix (commit `1ef76f4`), but should be done within the week:
- **F1**: `revalidatePath` in `POST /api/connections` (cross-route Router Cache staleness) — **~10 min fix**
- **F7**: `settings/loading.tsx:13` `length: 7` → `length: 9` — **30-second fix**
- **F3**: polling `/api/billing/ltd-status` for delayed-webhook UX — if >1 user reports "paid but no seat"

### C7. PostHog — upgrade from minimal to standard (optional)

Currently only pageview/pageleave. If you want a full LTD funnel in the PH dashboard, add:
- `posthog.identify(user.id, { email })` in the auth callback / after login
- Capture events on key actions: `signup_completed`, `connection_added`, `profile_created`, `ltd_checkout_started`, `ltd_checkout_completed`, `oversold_refund`
- Guard each capture with `typeof posthog !== "undefined"` (because PH init only happens after Accept consent)

**Decision**: do it if in the first week you don't understand what users are doing before checkout. Minimal is enough at the start.

---

## Block D — Post-launch, when there's time | NICE TO HAVE

- **F4**: pgbench concurrency test for `claim_ltd_seat` (empirical EPQ safety proof)
- **F5**: webhook retry test in the unit suite
- **F6**: Playwright 3G throttle E2E for CLS
- **F8**: production-build integration test of the React.cache shim
- **F9**: admin dead-letter panel for `failed_refunds` + `stripe_webhook_events`
- **Security audit**: `npm audit`, Snyk scan, dependency review before every major release
- **Load test**: k6 or artillery against key endpoints (`/api/cron/sync`, diagnostic, signup)
- **Penetration testing**: even 2h with an OWASP ZAP baseline scan
- **Terms consent gating**: checkbox on signup "I agree to ToS + Privacy" (required in some jurisdictions)
- **PostHog full**: session recording + feature flags + reverse proxy (see C7 for the standard upgrade first)
- **Consent preferences UI**: "change cookie preferences" link in the footer so users can change their mind (currently only localStorage clear)

---

## Recommended order

**Day 0 (today / tomorrow)** — code is ready (A4/A6/A7/A10 ✅), the dashboards remain:
1. **A1** — all env vars in Vercel (30-60 min)
   - Including: sign up on posthog.com (EU region), grab the `phc_…` key
2. **A2** — domain + SSL (wait time 1-24h depending on DNS TTL)
3. **A5** — Resend DKIM/SPF (wait time 1-24h)
4. **A3** — Supabase redirect URLs
5. **A8** — smoke test (test Accept/Decline banner in DevTools)
6. **A9** — write down the rollback procedure

**Days 1-3 (soft-launch beta, test mode)**:
- 2-5 test checkouts, watch Sentry/logs/PostHog
- **B1** — Stripe business verification (in parallel, 1-3 days)

**Day ~4 (cutover)**:
7. **B2-B4** — live keys + webhook + **legal pages (including /privacy — required by the banner!)**
8. **B5** — LTD seat count decision
9. **B6** — uptime monitor
10. **public launch** 🚀

**Week 2**:
11. **C1-C7** — observability + GDPR + backlog + PostHog standard upgrade (optional)

**Later**:
12. **D-block** when there's time
