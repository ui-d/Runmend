# Runmend — Pełne podsumowanie aplikacji

> Dokument przygotowany do analizy przez zewnętrzny LLM. Stan na: 2026-04-16.

---

## 1. Czym jest Runmend

Runmend to SaaS monitorujący zdrowie automatyzacji workflow. Aplikacja łączy się z platformami Make.com i n8n, pobiera dane o automatyzacjach i ich wykonaniach, oblicza health score (0-100), wykrywa problemy (ciche awarie, wygasające credentiale, skoki błędów) i generuje diagnostyczny raport AI za pomocą Claude API.

**Model biznesowy:** Freemium z planem Starter i Pro (Stripe billing). Multi-tenant — użytkownicy tworzą workspace'y i zapraszają członków.

**Dwa tryby działania:**
- **Demo publiczne** — `/dashboard/[profileId]` — 4 hardkodowane profile z pre-generowanymi danymi, bez auth
- **SaaS** — `/app/[workspaceSlug]/...` — pełna funkcjonalność z auth, real connections, sync, billing

---

## 2. Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript 5 |
| Baza danych + Auth | Supabase (Postgres + Auth + RLS + Realtime) |
| AI | Anthropic Claude SDK — model Sonnet do diagnostyk |
| Płatności | Stripe (checkout sessions, billing portal, webhooks) |
| UI | Tailwind CSS + shadcn/ui + Lucide icons |
| Analytics | PostHog |
| Error tracking | Sentry (`@sentry/nextjs`) |
| Email | Resend |
| Testy | Vitest (unit/integration), Playwright (E2E) |
| CI/CD | GitHub Actions → Vercel |
| Cron | Supabase pg_cron + pg_net (co 15 min sync) |

---

## 3. Struktura kodu

**117 plików źródłowych** (`.ts`/`.tsx`), ~8000 LOC.

```
src/
├── app/
│   ├── (auth)/              # Login, signup, forgot/reset password, OAuth callback
│   ├── api/                 # 13 route handlers (REST API)
│   │   ├── billing/         # checkout, portal, webhook (Stripe)
│   │   ├── connections/     # CRUD + test connection
│   │   ├── cron/sync/       # Scheduled sync endpoint
│   │   ├── diagnostic/      # AI diagnostic generation
│   │   ├── notifications/   # List, mark read, mark all read
│   │   ├── schedules/       # Audit schedule CRUD
│   │   └── sync/            # Manual sync trigger
│   ├── app/[workspaceSlug]/ # Authenticated SaaS pages
│   │   ├── billing/         # Plan management
│   │   ├── connections/     # Platform connections UI
│   │   ├── profiles/        # Automation profiles + diagnostics
│   │   └── settings/        # Workspace settings
│   ├── dashboard/[profileId]/ # Public demo dashboards
│   └── page.tsx             # Landing page
├── components/
│   ├── app/                 # 12 components (Sidebar, Onboarding, Dialogs, etc.)
│   ├── auth/                # AuthForm, OAuthButtons, UserMenu
│   ├── dashboard/           # HealthScore, IssueCard, DiagnosticNarrative, etc.
│   ├── landing/             # Hero, Features, CTA, Stats, etc.
│   └── ui/                  # shadcn/ui primitives (9 components)
├── hooks/                   # useSync, useDiagnostic, useNotifications
├── data/profiles.ts         # 4 hardcoded demo profiles
├── lib/
│   ├── crypto.ts            # AES-256-GCM encrypt/decrypt + SHA-256 hashing
│   ├── database.types.ts    # Supabase auto-generated types
│   ├── diagnostic/          # Claude prompt builder
│   ├── env.ts               # Env var validation (startup)
│   ├── normalize.ts         # Data normalization helpers
│   ├── platform-adapters/   # PlatformAdapter interface + Make/n8n implementations
│   ├── queries/             # 7 typed data access modules (~500 LOC)
│   ├── security/            # Redirect validation, workspace membership auth
│   ├── stripe.ts            # Stripe client singleton
│   ├── supabase/            # 4 Supabase clients (browser, SSR, admin, middleware)
│   ├── sync/                # Sync engine, health calculator, issue detector
│   ├── types.ts             # Shared domain types + helpers
│   ├── utils.ts             # Tailwind cn() helper
│   └── validation/schemas.ts # Zod schemas for all API inputs
└── middleware.ts            # Session refresh + route protection
```

---

## 4. Schemat bazy danych (Supabase Postgres)

13 migracji. 12 tabel:

| Tabela | Opis | Kluczowe pola |
|---|---|---|
| `users` | Profil użytkownika (sync z Supabase Auth) | id, email, full_name, avatar_url |
| `workspaces` | Tenant/organizacja | id, name, slug, owner_id |
| `workspace_members` | Członkostwo w workspace | workspace_id, user_id, role (owner/admin/member) |
| `automation_profiles` | Profil monitorowanego zestawu automatyzacji | workspace_id, platform, health_score, scenario_count |
| `automation_issues` | Wykryte problemy z automatyzacjami | profile_id, severity (critical/warning/info), status (open/acknowledged/resolved/dismissed) |
| `platform_connections` | Połączenia z platformami | workspace_id, platform, auth_type, api_key_encrypted, status |
| `automations` | Zsynchronizowane automatyzacje | connection_id, profile_id, external_id, status, success_rate, total_runs, failed_runs |
| `execution_logs` | Historia wykonań | automation_id, status, started_at, error_message |
| `diagnostic_reports` | Raporty AI | profile_id, triggered_by, overall_health, most_dangerous, recommendations, model_used, tokens_used |
| `audit_schedules` | Harmonogramy audytów | profile_id, cron_expression, is_active |
| `notifications` | Powiadomienia | user_id, workspace_id, type, title, body, is_read |
| `notification_preferences` | Preferencje powiadomień | user_id, workspace_id, channel (in_app/email/slack) |
| `subscriptions` | Subskrypcje Stripe | workspace_id, stripe_customer_id, plan (free/starter/pro/enterprise), status |

**RPC Functions:**
- `update_automation_stats(p_profile_id)` — bulk update success_rate/total_runs/failed_runs per automation
- `update_profile_scenario_count(p_profile_id)` — count automations per profile

**RLS:** Wszystkie tabele chronione przez RLS. Helper functions: `get_user_workspace_ids()`, `get_user_admin_workspace_ids()`.

**pg_cron:** Job `runmend-sync-every-15-min` uruchamiany co 15 min — wywołuje `/api/cron/sync` przez `pg_net`.

**Retencja danych:** `execution_logs` starsze niż 90 dni usuwane automatycznie.

---

## 5. Kluczowa logika biznesowa

### 5.1 Sync Engine (`src/lib/sync/engine.ts` — 260 LOC)

Orkiestracja 12-krokowego procesu synchronizacji:
1. Pobierz profil automatyzacji
2. Znajdź aktywne połączenie dla tego workspace + platform
3. Odszyfruj credentials (AES-256-GCM)
4. Pobierz automatyzacje z platformy → bulk upsert
5. Pobierz execution logs od ostatniego synca → bulk upsert
6. Załaduj wszystkie automatyzacje + executions
7. Oblicz health score
8. Wykryj issues
9. Sync issues (resolve stare, insert nowe)
10. Update health_score na profilu
11. Update last_synced_at na connection
12. Bulk update stats via RPC

### 5.2 Health Calculator (`src/lib/sync/health-calculator.ts` — 90 LOC)

Wynik 0-100, ważony:
- **Error rate (40%)** — success rate z ostatnich 7 dni
- **Inactive ratio (20%)** — % aktywnych automatyzacji bez wykonań w 7 dni
- **Failure trend (20%)** — porównanie error rate 24h vs 7-dniowa średnia
- **Coverage (20%)** — % automatyzacji z przynajmniej 1 wykonaniem

### 5.3 Issue Detector (`src/lib/sync/issue-detector.ts` — 145 LOC)

6 reguł detekcji:
| # | Reguła | Severity | Warunek |
|---|---|---|---|
| 1 | Silent failure | critical | Aktywna automatyzacja, 0 executions w 7 dni (miała wcześniej) |
| 2 | High error rate | critical | >30% failures w 24h (min 3 executions) |
| 3 | Error spike | warning | Error rate 24h > 2x średnia 7-dniowa |
| 4 | Consecutive failures | critical | 5+ failures z rzędu |
| 5 | Zombie automation | info | Aktywna, nigdy nie wykonana |
| 6 | Credential expiring | warning/critical | Token wygasa w <7 dni / już wygasł |

### 5.4 AI Diagnostic (`src/lib/diagnostic/enhanced-prompt.ts` — 111 LOC)

Buduje prompt dla Claude z:
- Summary automatyzacji (active/inactive/error)
- Stats execution (7-dniowe, 24h)
- Top 5 automatyzacji z najwyższym error rate
- Top 5 wzorców błędów
- Lista otwartych issues

Claude zwraca JSON: `{ overallHealth, mostDangerousIssue, recommendations }` — plain text paragrafy.

### 5.5 Platform Adapters

Interface `PlatformAdapter`:
```typescript
interface PlatformAdapter {
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  fetchAutomations(): Promise<NormalizedAutomation[]>;
  fetchExecutionLogs(since: Date): Promise<NormalizedExecution[]>;
}
```

Dwie implementacje:
- **Make.com** (`make.ts`, 126 LOC) — REST API, obsługa stref (us1, eu1, eu2, us2)
- **n8n** (`n8n.ts`, 104 LOC) — self-hosted instances, API key auth

Retry wrapper: 3 próby, exponential backoff z jitter.

---

## 6. API Routes (13 endpointów)

| Endpoint | Method | Auth | Opis |
|---|---|---|---|
| `/api/connections` | POST | Yes | Utwórz nowe połączenie z platformą |
| `/api/connections/[id]` | DELETE | Yes | Usuń połączenie |
| `/api/connections/[id]/test` | POST | Yes | Przetestuj połączenie |
| `/api/sync/[profileId]` | POST | Yes | Ręczny sync profilu |
| `/api/cron/sync` | GET | CRON_SECRET | Scheduled sync wszystkich profili |
| `/api/diagnostic` | POST | Yes | Wygeneruj raport AI |
| `/api/schedules/[profileId]` | GET/PUT/PATCH | Yes | CRUD harmonogramów audytu |
| `/api/notifications` | GET | Yes | Lista powiadomień |
| `/api/notifications/[id]/read` | PATCH | Yes | Oznacz jako przeczytane |
| `/api/notifications/mark-all-read` | POST | Yes | Oznacz wszystkie jako przeczytane |
| `/api/billing/checkout` | POST | Yes | Utwórz Stripe checkout session |
| `/api/billing/portal` | POST | Yes | Utwórz Stripe billing portal session |
| `/api/billing/webhook` | POST | Stripe sig | Obsługa webhook events |

**Walidacja:** Wszystkie inputy walidowane przez Zod schemas. Workspace membership sprawdzany na każdym endpoint.

---

## 7. Bezpieczeństwo

- **Credentials:** AES-256-GCM szyfrowanie (64-char hex ENCRYPTION_KEY) + SHA-256 hashing tokenów
- **Auth:** Supabase Auth (email + OAuth), session cookies, middleware refreshing
- **RLS:** Postgres Row Level Security na każdej tabeli, gate'd przez workspace membership
- **API:** Zod input validation, workspace membership assertion, redirect allowlist
- **Retry:** Exponential backoff z jitter na external API calls
- **Headers:** Security headers (CSP, HSTS, etc.)
- **Cron:** Chroniony przez `CRON_SECRET` w authorization header
- **Sentry:** Error tracking w produkcji

---

## 8. Frontend / UI

- **Landing page** — Hero, Features, HowItWorks, Stats, CTA, ProfileCard (4 demo profiles)
- **Auth flow** — Login, Signup, Forgot/Reset password, OAuth
- **App shell** — Sidebar navigation, WorkspaceSelector, NotificationBell
- **Dashboard** — HealthScore (circular gauge), IssuesList z IssueCards, DiagnosticNarrative
- **Connections** — ConnectionCard + dialogi ConnectMake/ConnectN8n
- **Profiles** — lista, tworzenie nowego, detail z diagnostykami
- **Billing** — PlanBadge, UpgradePrompt, Stripe checkout/portal
- **Onboarding** — OnboardingWizard dla nowych użytkowników

Styling: Tailwind CSS, HSL CSS variables, class-based dark mode.

---

## 9. Stan projektu i metryki

| Metryka | Wartość |
|---|---|
| Pliki źródłowe | 117 |
| LOC (szacunkowo) | ~8000 |
| Tabele DB | 12 |
| Migracje | 13 |
| API routes | 13 |
| Komponenty React | ~30 |
| Test coverage | ~65% |
| Testy | 76 |

**Fazy zakończone (10/10):**
1. Supabase foundation
2. Auth (email + OAuth)
3. Workspace CRUD + multi-tenancy
4. Platform connections (Make.com + n8n)
5. Sync engine
6. AI diagnostics (Claude)
7. Notifications
8. Stripe billing
9. Security hardening + performance optimization
10. Ship-readiness (cron, tests, Sentry, CI)

**Znane ograniczenia:**
- Zapier usunięty z v1 (niestabilne API, brak Partner Program)
- Coverage 65% (cel: 80%)
- Brak Slack/email notifications (tylko in_app)
- Brak team invite flow (workspace_members istnieje, ale UI nie zbudowane)

---

## 10. Deployment

- **Hosting:** Vercel (auto-deploy z main branch)
- **Database:** Supabase (projekt `hrcctyebejialsbdyyle`, US East)
- **Cron:** Supabase pg_cron + pg_net (co 15 min)
- **CI:** GitHub Actions (lint, typecheck, tests)
- **Env vars:** 14 zmiennych (ENCRYPTION_KEY, Stripe keys, Supabase keys, Sentry, Resend, etc.)

---

## 11. Zależności (package.json)

**Runtime (13):**
`@anthropic-ai/sdk`, `@base-ui/react`, `@sentry/nextjs`, `@supabase/ssr`, `@supabase/supabase-js`, `class-variance-authority`, `clsx`, `lucide-react`, `next@14.2.35`, `posthog-js`, `react@18`, `resend`, `shadcn`, `stripe`, `tailwind-merge`, `zod`

**Dev (8):**
`@playwright/test`, `@types/*`, `@vitest/coverage-v8`, `eslint`, `postcss`, `tailwindcss`, `typescript@5`, `vitest`

---

## 12. Kluczowe wzorce do analizy

1. **Platform Adapter Pattern** — strategia z factory function, łatwy do rozszerzenia o nowe platformy
2. **Bulk operations** — upsert zamiast per-row loops, RPC functions dla agregacji
3. **Issue lifecycle** — detekcja → open → (acknowledged) → resolved/dismissed, auto-resolve przy sync
4. **Weighted health score** — 4 czynniki z wagami, łatwy do tuningowania
5. **Claude prompt engineering** — structured data → JSON response, no markdown
6. **Defense in depth** — RLS + middleware auth + API-level workspace assertion
7. **Credential encryption at rest** — AES-256-GCM, nigdy plaintext w DB
