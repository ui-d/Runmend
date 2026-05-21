# Security Policy

Runmend stores encrypted credentials for third-party automation platforms and handles billing data. We take vulnerability reports seriously.

## Reporting a vulnerability

**Do not open a public GitHub issue for security bugs.** Public disclosure before a fix is available puts users at risk.

Email **dawiddeveloper@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce (proof-of-concept if you have one)
- The affected version or commit hash
- Your assessment of impact (data exposure, privilege escalation, etc.)
- Whether you'd like credit in the fix advisory

You should receive an acknowledgement within **72 hours**. If you don't, please follow up — your message may have been filtered.

## What to expect

1. **Triage** within 72 hours — we confirm the issue and assess severity.
2. **Status updates** at least weekly while we work on a fix.
3. **Coordinated disclosure** — we'll agree on a public disclosure date with you, typically within 90 days of the initial report, or sooner if a fix ships earlier.
4. **Credit** in the release notes and (optionally) a CVE if the issue warrants one.

## Scope

In scope:

- The Runmend Next.js application (`src/`)
- The platform adapters (`src/lib/platform-adapters/`)
- The sync engine and issue detector
- Auth flows, RLS policies, and database migrations under `supabase/`
- The diagnostic / AI prompt construction
- The Stripe billing integration

Out of scope (report to the upstream vendor):

- Supabase platform issues — <https://supabase.com/security>
- Stripe platform issues — <https://stripe.com/docs/security>
- Anthropic / Claude API issues — <https://www.anthropic.com/security>
- Make.com or n8n issues — report to those vendors
- Vulnerabilities in dependencies that are already disclosed and have an available upgrade (just open a PR bumping the dep)

Also out of scope:

- Reports requiring physical access to a user's device
- Self-XSS (requires the victim to paste attacker code into devtools)
- Missing security headers without a demonstrated exploit
- Rate limiting on endpoints that already have application-level checks
- Findings from automated scanners without proof of exploitability

## Safe-harbor

Good-faith research conducted under this policy will not result in legal action from us. Please:

- Make a reasonable effort to avoid privacy violations, data destruction, and service degradation
- Only interact with accounts you own or have permission to test
- Don't exfiltrate more data than needed to demonstrate the issue
- Give us a reasonable window to fix before public disclosure

## Hardening notes (for self-hosters)

If you're running Runmend yourself:

- **`ENCRYPTION_KEY` must be a fresh `openssl rand -hex 32` value.** Never reuse a leaked or example key. Rotating it requires re-encrypting all `platform_connections.credentials` rows.
- **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS** and must only exist server-side (Vercel env vars, never `NEXT_PUBLIC_*`).
- **`CRON_SECRET`** authenticates the Vercel Cron handler. Generate a fresh value per environment.
- Enable Supabase RLS on every new table you add. The existing tables enforce workspace membership via `get_user_workspace_ids()` / `get_user_admin_workspace_ids()`.
- Keep dependencies current: run `npm audit` and review GitHub Dependabot alerts.
