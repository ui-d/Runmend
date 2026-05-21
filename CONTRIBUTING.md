# Contributing to Runmend

Thanks for your interest in Runmend. This guide covers everything you need to set up a local environment, follow the project's conventions, and open a pull request that lands cleanly.

By participating you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md). Security issues go to [SECURITY.md](./SECURITY.md), not the issue tracker.

## Dev setup

Prerequisites: Node.js 18+, npm, and a Supabase project (free tier is enough).

```bash
git clone https://github.com/ui-d/runmend.git
cd runmend
npm install
cp .env.example .env.local
# fill in your own keys — Supabase, Stripe (test mode), and at minimum ENCRYPTION_KEY
```

Generate `ENCRYPTION_KEY` and `CRON_SECRET`:

```bash
openssl rand -hex 32
```

Apply migrations:

```bash
supabase db push
```

Run the dev server:

```bash
npm run dev
```

Open <http://localhost:3000>. The public demo lives at `/dashboard/coastal-content-agency` (and three other slugs in `src/data/profiles.ts`) and works without auth, Anthropic, or Stripe.

## Branch and commit conventions

Branch names use a type prefix:

- `feat/<short-description>` — new feature
- `fix/<short-description>` — bug fix
- `chore/<short-description>` — tooling, deps, refactors with no behaviour change
- `docs/<short-description>` — docs-only change

Commit messages follow the same convention:

```
<type>: <imperative summary>

<optional body explaining the why>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

Keep the summary under 70 characters. The body wraps at 80.

## Tests and coverage

The project enforces 90%+ line coverage on the unit suite (`npm run test:coverage:check`). Every PR must:

1. Add or update unit tests under the file's nearest `__tests__` directory.
2. Keep `npm run test:run` green.
3. Pass `npm run lint`.
4. Keep `npm run build` clean (no new type errors).

E2E tests live in `e2e/` and run under Playwright:

```bash
npx playwright install     # one-time
npx playwright test
```

Run E2E manually if your change touches a critical user flow (auth, billing, sync, diagnostics). CI does not currently run E2E on every PR.

## Pull request checklist

Before opening a PR:

- [ ] Branch is rebased on the latest `main`
- [ ] `npm run lint && npm run test:run && npm run build` all pass
- [ ] No new secrets, no committed `.env.local`
- [ ] User-visible changes mentioned in the PR description
- [ ] Migrations (if any) are reversible and ordered after the latest existing migration

Open the PR against `main`. CI runs lint, tests, coverage, and build. A maintainer reviews — expect 1–3 days. Small, focused PRs land fastest.

## Architecture pointers

`CLAUDE.md` and `README.md` describe the architecture in depth. Three high-level rules:

- All DB access goes through `src/lib/queries/` — never call Supabase clients directly from route handlers or components.
- All API route input is parsed with a Zod schema from `src/lib/validation/schemas.ts` before any DB work.
- External API calls go through `fetchWithRetry()` from `src/lib/platform-adapters/retry.ts`.

## Reporting bugs

For non-security bugs, open a GitHub issue with:

- What you expected
- What actually happened
- Steps to reproduce
- Environment (Node version, OS, browser if relevant)

For **security** bugs, follow [SECURITY.md](./SECURITY.md) instead — do not file a public issue.

## Questions

If something here is unclear, open a discussion or a draft PR with the question in the description. We'd rather answer once than have the same friction repeat across contributors.
