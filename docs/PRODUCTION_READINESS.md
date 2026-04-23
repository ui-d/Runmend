# Runmend Production Readiness Plan

**Status**: pre-launch • **Stan Supabase**: `hrcctyebejialsbdyyle` = production • **Stripe**: soft-launch w test mode → cutover na live • **Domena**: kupiona (uzupełnij `<YOUR_DOMAIN>` w przykładach poniżej)

Plan jest podzielony na cztery bloki. **Blok A = MUSI być zielony zanim podeślesz link pierwszemu beta userowi** (test mode). **Blok B = MUSI być zielony w dniu cutover na live Stripe**. Blok C = w pierwszym tygodniu po launch. Blok D = post-launch, kiedy będzie czas.

Do każdego itemu jest: (1) co zrobić, (2) jak zweryfikować, (3) plik/ścieżka/komenda gdzie istotne. Odhaczaj po kolei.

---

## Block A — Soft-launch (test mode) | MUSI MIEĆ

### A1. Wszystkie env vars w Vercel (Production scope)

Dashboard → Project → Settings → Environment Variables. Scope: **Production**. Dla każdego waliduj przez `vercel env ls production`. Komplet wymagany (lista ze `src/lib/env.ts:assertProductionEnv` + rozszerzona):

| Var | Wartość na soft-launch | Żródło |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hrcctyebejialsbdyyle.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable anon key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role secret** (nigdy nie commituj) | Supabase → Settings → API |
| `ENCRYPTION_KEY` | 64-char hex (`openssl rand -hex 32`) | **wygeneruj raz, zapisz w 1Password** |
| `STRIPE_SECRET_KEY` | `sk_test_…` (cutover na `sk_live_…` w Block B) | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | test webhook signing secret | Stripe → Developers → Webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | Stripe |
| `STRIPE_PRICE_STARTER` / `_PRO` / `_LTD` | test price IDs | Stripe → Products |
| `CRON_SECRET` | `openssl rand -hex 32` | **wygeneruj raz** |
| `ANTHROPIC_API_KEY` | production key (rate-limited billing) | console.anthropic.com |
| `RESEND_API_KEY` | production key z weryfikowanej domeny (A5) | resend.com |
| `LTD_ALERT_EMAIL` | twój inbox np. `alerts@<YOUR_DOMAIN>` | — |
| `LTD_ALERT_FROM` | `alerts@<YOUR_DOMAIN>` | musi być na verified domain |
| `NEXT_PUBLIC_APP_URL` | `https://<YOUR_DOMAIN>` | — |
| `NEXT_PUBLIC_SENTRY_DSN` | z Sentry → Project Settings → Client Keys | sentry.io |
| `SENTRY_ORG` / `SENTRY_PROJECT` | slugi | sentry.io |
| `SENTRY_AUTH_TOKEN` | `sntrys_…` — uprawnienie `project:releases` | sentry.io → User Auth Tokens |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | jeśli chcesz analytics od start; inaczej pomiń | posthog.com |

**Weryfikacja**: `vercel env ls production | wc -l` ≥ 17. Trigger deploy po dodaniu — jeśli `assertProductionEnv()` znajdzie brak, deploy padnie przed uruchomieniem (zgodne z `instrumentation.ts:7-11`).

### A2. Domena wpięta do Vercel + SSL aktywny

Vercel → Project → Settings → Domains → Add `<YOUR_DOMAIN>` + `www.<YOUR_DOMAIN>` (przekieruj www→apex). Dodaj rekordy DNS u rejestratora per Vercel instructions. Poczekaj na SSL.

**Weryfikacja**: `curl -I https://<YOUR_DOMAIN>` → HTTP 200, certyfikat Let's Encrypt ważny; `curl -I http://<YOUR_DOMAIN>` → 308 na https.

### A3. Supabase Auth redirect URLs

Supabase Dashboard → Authentication → URL Configuration. Dodaj do "Redirect URLs":

```
https://<YOUR_DOMAIN>/callback
https://<YOUR_DOMAIN>/reset-password
https://<YOUR_DOMAIN>/**
```

Site URL: `https://<YOUR_DOMAIN>`.

**Weryfikacja**: signup na prod, link z email kieruje na prod, nie na localhost.

### A4. Vercel Cron — zdefiniuj w `vercel.json`

Obecny `vercel.json` jest pusty → Cron w ogóle nie odpala. Ustaw harmonogram co 15 min na `/api/cron/sync`:

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "*/15 * * * *" }
  ]
}
```

**Wymaga Vercel Pro** (free tier ma 1 cron, wystarczy). Vercel automatycznie dorzuca `Authorization: Bearer ${CRON_SECRET}` header → `src/app/api/cron/sync/route.ts:20-24` to waliduje.

**Weryfikacja**: po deployu Vercel → Project → Crons pokazuje wpis; Vercel → Logs pokazuje GET /api/cron/sync co 15 min z 200 response.

### A5. Resend — weryfikacja domeny (DKIM/SPF)

Resend → Domains → Add Domain `<YOUR_DOMAIN>`. Dodaj 3 rekordy DNS (TXT SPF, DKIM CNAME, TXT DMARC). To jest wymagane żeby `alerts@<YOUR_DOMAIN>` nie lądowało w spam/blokowało Resend.

**Weryfikacja**: Resend dashboard pokazuje "Verified"; test: wymuś LTD oversold path lokalnie z prod key → email dociera do inbox (nie spam).

### A6. Sentry — source maps + release tracking

Masz już `withSentryConfig(nextConfig, {...})` w `next.config.mjs:39-48`. Jeśli `SENTRY_AUTH_TOKEN` jest w Vercel (A1), auto-upload source maps działa na każdy build. Dodaj tylko release tagging:

W `next.config.mjs`, `withSentryConfig` options:
```js
release: {
  name: process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,
}
```

**Weryfikacja**: następny deploy → Sentry → Releases pokazuje nowy release ze skojarzonymi source maps; przy błędzie stack trace pokazuje oryginalne pliki TS, nie `chunks/*.js`.

### A7. `/api/health` endpoint (smoke + uptime probe)

Brak. Dodaj minimalny:

```ts
// src/app/api/health/route.ts
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
}
```

**Weryfikacja**: `curl https://<YOUR_DOMAIN>/api/health` → `{"status":"ok",…}`.

### A8. Smoke test full flow na prod

Ręczny 15-min test za pomocą Playwright MCP lub manualnie:

1. Signup z prawdziwego emaila → potwierdź inbox
2. Create workspace
3. Dodaj Make connection (test API key)
4. Sync → profile ma automations
5. Zamów LTD checkout w **test mode** (karta `4242 4242 4242 4242`)
6. Webhook przychodzi → subscription w DB ma `is_ltd=true`
7. Zaloguj się na drugim koncie, zweryfikuj że nie widzi cudzego workspace (RLS)

**Weryfikacja**: każdy krok zielony. Jeśli coś jest czerwone, **fix before link publishing**.

### A9. Rollback plan udokumentowany

Vercel ma Instant Rollback z UI (Deployments → ostatni good → Promote). Zapisz sobie:
- link do dashboardu deployments
- kto ma uprawnienia do promote (tylko ty, chyba że dodasz teammate'a)

**Weryfikacja**: wymuś bad deploy lokalnie (np. syntax error na preview) → zobacz że rollback działa w < 30s.

---

## Block B — Cutover na Stripe live | MUSI MIEĆ przed prawdziwą płatnością

Rób **dopiero** gdy Block A działa stabilnie ≥ 2-3 dni i masz 2-3 beta userów z testowymi transakcjami.

### B1. Stripe business verification

Stripe Dashboard → Activate account. Wprowadź NIP/VAT, adres, bank account, owner ID. Trwa 1-3 dni. **Bez tego `sk_live_…` nie działa.**

**Weryfikacja**: Stripe dashboard pokazuje "Activated" badge, nie "Test mode only".

### B2. Live keys + live price IDs w Vercel

Duplikuj produkty z test mode do live (Stripe → Products → toggle "View test data" OFF → Create product). Zapisz nowe live price IDs.

Replace w Vercel env (Production):
- `STRIPE_SECRET_KEY` → `sk_live_…`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_…`
- `STRIPE_PRICE_STARTER` / `_PRO` / `_LTD` → live price IDs
- `STRIPE_WEBHOOK_SECRET` — **zostaw na razie**, wymień w B3

**Weryfikacja**: po deployu zrób test checkout — powinieneś dostać live URL (`checkout.stripe.com/c/pay/cs_live_…`).

### B3. Live webhook endpoint

Stripe → Developers → Webhooks (live mode) → Add endpoint `https://<YOUR_DOMAIN>/api/billing/webhook`. Wybierz eventy: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.updated`, `invoice.payment_failed`. Zapisz signing secret jako `STRIPE_WEBHOOK_SECRET` w Vercel (nadpisz test-mode secret). Redeploy.

**Weryfikacja**: Stripe → Webhooks → Send test webhook → webhook response 200; Supabase `stripe_webhook_events` table ma nowy event_id.

### B4. Terms / Privacy / Refund policy

Checkout sessions wymagają `terms_of_service_url` + `privacy_url` w Stripe dashboard Brand settings (compliance). LTD refund policy to legal must-have przy lifetime deal.

Stwórz 3 strony (lub statyczne routes):
- `/terms`, `/privacy`, `/refund-policy`

Minimum: skopiuj template z https://stripe.com/legal + dostosuj do LTD ("60-day refund window, afterwards non-refundable except failed service delivery"). Skonsultuj z prawnikiem dla PL/EU compliance (GDPR, konsument).

**Weryfikacja**: Stripe → Settings → Branding → Public details ma wpisane 2 URLs; checkout session UI pokazuje footer link.

### B5. LTD seat count w DB

Default w `ltd_allocations.total_seats = 20` (`supabase/migrations/20260424000001_ltd_and_billing_details.sql:15`). Decyzja: zostawić 20 czy zwiększyć? Zmiana:

```sql
UPDATE public.ltd_allocations SET total_seats = 100 WHERE id = 1;
```

Wykonaj przez Supabase MCP (`mcp__supabase__execute_sql`) lub SQL Editor w dashboardzie. **Decyzja bizowa, nie techniczna** — ale to jedyna zmienna LTD, którą musisz świadomie wybrać przed launchem.

**Weryfikacja**: `SELECT total_seats, seats_sold FROM ltd_allocations;` pokazuje twoje target value.

### B6. Uptime monitor (external)

Vercel nie mierzy własnego uptime dla alerting. Dodaj zewnętrzny monitor (Better Stack free / UptimeRobot free / Cronitor):
- URL: `https://<YOUR_DOMAIN>/api/health` (z A7)
- Interwał: 1 min
- Alert channel: email + SMS jeśli płatne

**Weryfikacja**: celowo wywołaj downtime (suspend deploy → resume) → monitor wysyła alert w < 3 min.

---

## Block C — Pierwszy tydzień post-launch | STRONG RECOMMENDATION

### C1. Sentry — alert rules

Sentry → Alerts → Create. Minimum 2 reguły:
1. **Fatal-level event** → email w < 5 min (to capture LTD refund failures z `webhook/route.ts` post-dzisiejszy fix).
2. **Error spike** (> 20 w 15 min) → email.

### C2. Vercel Analytics + Speed Insights

Vercel → Project → Analytics → Enable. **Free dla hobby, metered dla Pro** — zobacz cennik. Dane o Core Web Vitals z prod trafiają do Vercel. Integracja: dodać `@vercel/analytics` + `<Analytics />` w `app/layout.tsx`.

### C3. Supabase Point-in-Time Recovery (PITR)

Supabase → Project → Settings → Add-ons → PITR. **Wymaga Pro ($25/mo)**. Bez tego backup = daily pg_dump, 7 dni retention, ale przy incydencie tracisz do 24h danych. Z PITR — restore do dowolnego momentu w oknie (7 / 14 / 28 dni wg planu).

**Decyzja**: włącz od dnia launch (nie retrospektywnie — PITR chroni tylko przyszłość).

### C4. Rate limiting review

Obecnie `src/lib/platform-adapters/retry.ts` chroni tylko calls wychodzące z Runmend. **Nie ma** rate limitingu na ingress API routes (Stripe-paid user może wywołać `/api/connections/[id]/test` 1000×/s). Na launch day przy małym trafficu to OK, ale dorzuć:
- Vercel Edge Config lub Upstash Redis dla rate limit
- Minimum: 60 req/min na `/api/*` per user

### C5. GDPR — data export + deletion

EU users mają prawo do eksportu i skasowania swoich danych (Supabase ma RLS więc workspace-scoped delete jest łatwy). Brak UI do tego. Minimum:
- Settings → Danger Zone → "Export my data" (JSON dump)
- "Delete my account" — hard delete user + wszystkie workspaces gdzie jest sole owner

**Ważne przy LTD**: przy delete zwolnij seat? Decyzja bizowa — zwyczajowo NIE (LTD to nabyty asset), ale udokumentuj w refund policy.

### C6. Post-launch audit backlog (z `docs/PRODUCTION_READINESS.md` planu audytu)

Te items były out-of-scope dzisiejszego fixu (commit 1ef76f4), ale są do zrobienia w ciągu tygodnia:
- **F1**: `revalidatePath` w `POST /api/connections` (cross-route Router Cache staleness) — **~10 min fix**
- **F7**: `settings/loading.tsx:13` `length: 7` → `length: 9` — **30-sek fix**
- **F3**: polling `/api/billing/ltd-status` dla delayed-webhook UX — jeśli >1 user zgłosi "paid but no seat"

---

## Block D — Post-launch, gdy będzie czas | NICE TO HAVE

- **F4**: pgbench concurrency test dla `claim_ltd_seat` (empiryczny dowód EPQ safety)
- **F5**: webhook retry test w unit suite
- **F6**: Playwright 3G throttle E2E dla CLS
- **F8**: production-build integration test React.cache shim
- **F9**: admin dead-letter panel dla `failed_refunds` + `stripe_webhook_events`
- **Security audit**: `npm audit`, Snyk scan, dependency review przed każdą major release
- **Load test**: k6 lub artillery na kluczowe endpointy (`/api/cron/sync`, diagnostic, signup)
- **Penetration testing**: nawet 2h z OWASP ZAP baseline scan
- **Terms consent gating**: checkbox na signup "I agree to ToS + Privacy" (niektóre jurysdykcje wymagają)
- **Cookie consent banner**: jeśli PostHog włączysz, potrzebny dla EU (cookiebot.com lub własny)

---

## Kolejność działań (rekomendacja)

**Dzień 0 (dziś / jutro)**:
1. A1 — wszystkie env vars w Vercel (30-60 min)
2. A2 — domena + SSL (wait time 1-24h zależnie od DNS TTL)
3. A5 — Resend DKIM/SPF (wait time 1-24h)
4. A4, A6, A7 — code changes (30 min total) — commitnij razem: `chore: production readiness (cron, health, release tracking)`
5. A3 — Supabase redirect URLs
6. A8 — smoke test
7. A9 — zapisz rollback procedure

**Dni 1-3 (soft-launch beta, test mode)**:
- 2-5 test checkoutów, obserwuj Sentry/logs
- B1 — Stripe business verification (równolegle, 1-3 dni)

**Dzień ~4 (cutover)**:
8. B2-B4 — live keys + webhook + legal pages
9. B5 — LTD seat count decyzja
10. B6 — uptime monitor
11. **public launch** 🚀

**Tydzień 2**:
12. C1-C6 — observability + GDPR + backlog

**Później**:
13. D-block gdy będzie czas

---

## Quick wins które mogę zaimplementować teraz (jeśli chcesz)

Z Block A są 3 items które mogę zrobić kodem bez twoich decyzji:
- **A4** — `vercel.json` z cron schedule
- **A6** — `release.name` w `withSentryConfig`
- **A7** — `/api/health` endpoint

Daj znać: „zrób A4/A6/A7" i commitnę je razem. Reszta to twoje ręczne akcje w dashboardach (Vercel / Stripe / Supabase / Resend / DNS).
