# Runmend MCP Server — Design Doc (Phase 3 spike)

**Status**: Design only. No code in this commit.
**Last updated**: 2026-04-26
**Owner**: dawiddeveloper@gmail.com
**Related**: `docs/RUNMEND_STATE.md`, `/vs-claude-cowork` page

---

## Why this exists

April 2026 changed where automation operators live. Make.com and n8n are now native Claude.ai connectors with OAuth, plus Cowork Live Artifacts and Routines. A growing share of "what's the health of my workflows?" questions will be asked inside Claude.ai, not in a Runmend tab.

We have two responses to that:

1. **Compete head-on** — keep building dashboards, hope users open ours instead of Claude. This is the slow-bleed option.
2. **Be where they are** — expose Runmend itself as an MCP server that ships through Anthropic's connector catalog. Users get Runmend's multi-account aggregation, six detectors, persistent history, and Sonnet-written post-mortems *as Claude tool calls*, without leaving Claude.ai.

This doc spikes option 2.

The thesis: **Runmend's value is the data and alerting pipeline (multi-zone audit, six detectors, persistent snapshots, severity-routed alerts). Claude is the chat surface. Pair them; don't try to replace Claude as a chat surface.**

---

## What we ship

A **read-only** MCP server hosted at `https://runmend.com/api/mcp` (path TBD; Vercel-deployed Next.js route), submitted to Anthropic's connector catalog.

Read-only means: tools surface state (lists, scores, reports). No tool mutates Runmend state. Reasons:

- **Security surface stays small.** A read-only token can't delete a profile, rotate a key, or trigger a billing change.
- **Mental model is clean.** "Claude can ask Runmend questions" is easy to explain. "Claude can also delete things" needs a UX we don't have.
- **Mutations stay in our app**, where they go through audit logging, RBAC, confirmation dialogs, and the existing Stripe/Supabase paths. Don't fork that surface.

Write capability (e.g. trigger sync, snooze profile, create alert rule) is a **future phase** explicitly out of scope for this spike.

---

## Transport & hosting

- **Transport**: Streamable HTTP. Stdio is a non-starter — Anthropic doesn't run user-supplied binaries inside Claude.ai. Streamable HTTP is what every catalog connector uses.
- **Hosting**: Next.js API route on the existing Vercel project. No new infra.
- **Endpoint shape**: a single POST `/api/mcp` that handles MCP JSON-RPC over HTTP, plus the standard `GET /api/mcp/.well-known/oauth-protected-resource` and OAuth discovery routes.
- **Runtime**: Fluid Compute (default on Vercel as of 2026). Per-request handler reuses warm instances; no cold-start anxiety.
- **SDK**: `@modelcontextprotocol/sdk` (Node/TypeScript). It already speaks Streamable HTTP and handles JSON-RPC framing, tool/resource/prompt registration, and Zod-validated arguments.

---

## Auth model

OAuth 2.0 authorization code flow, matching what Claude.ai expects from a third-party connector.

- **User flow**: in Claude.ai, user installs the Runmend connector → OAuth redirect to `runmend.com/oauth/authorize` → user signs in (Supabase auth) → user picks **which workspace** to scope the token to → Runmend issues an access token (JWT or opaque, persisted in `mcp_tokens` table) → Claude.ai stores the refresh token.
- **Token scope**: bound to a single `workspace_id` and a single `user_id`. RLS enforces that any query the MCP server runs against Supabase uses the user's existing membership in that workspace — no privilege escalation.
- **Token format**: opaque token in DB, looked up on every MCP request. SHA-256 hashed (reuse `src/lib/crypto.ts:hashToken`). 90-day rolling expiry, refresh-on-use.
- **Revocation**: a `Connected apps` section under `/app/<slug>/settings/integrations` lists active MCP tokens with last-used timestamp + revoke button.
- **Why not just `anon_key` + RLS**: Claude doesn't have a Supabase session; it has an OAuth token. We need our own bridge.

New table:

```sql
create table mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  token_hash text not null unique,
  scopes text[] not null default array['read'],
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index on mcp_tokens (workspace_id, user_id) where revoked_at is null;
```

RLS mirrors the existing `get_user_workspace_ids()` pattern.

---

## Tool catalog (v1)

All tools are read-only. Inputs validated with Zod schemas. Outputs are JSON shapes Claude can read into prose.

| Tool | Input | Output | Existing query reuse |
|---|---|---|---|
| `list_profiles` | `{ status?: 'critical' \| 'warning' \| 'healthy', limit?: number }` | array of `{ id, name, platform, health_score, open_issues_count, last_synced_at }` | `src/lib/queries/profiles.ts` |
| `get_profile_health` | `{ profile_id: string }` | `{ score, status, error_rate, inactive_ratio, failure_trend, coverage, snapshots_30d }` | profiles + `profile_health_snapshots` |
| `list_open_issues` | `{ workspace_only?: boolean, profile_id?: string, severity?: 'critical' \| 'warning' \| 'info' }` | array of issues with rule, severity, first_seen_at, message | `src/lib/queries/diagnostics.ts` |
| `get_diagnostic_report` | `{ profile_id: string, latest?: boolean, report_id?: string }` | `{ overall_health, most_dangerous_issue, recommendations, generated_at }` | existing diagnostic table |
| `list_connections` | `{}` | array of `{ id, platform, zone, display_name, last_health_check, status }` | `src/lib/queries/connections.ts` |
| `summarize_workspace` | `{}` | `{ total_profiles, critical, warning, healthy, top_3_dangerous_issues }` | reuses pulse loader |

All six tools' Supabase queries already exist in `src/lib/queries/`. The MCP layer is a thin adapter, not new business logic.

---

## Resources

MCP resources are URIs Claude can fetch on demand without a tool call. Useful for "give me everything about profile X".

- `runmend://workspace/{id}/pulse` — markdown summary of pulse + top issues
- `runmend://profile/{id}` — full profile snapshot incl. last diagnostic
- `runmend://profile/{id}/diagnostic/latest` — most recent Sonnet-written report

These are convenience surfaces over the same data the tools return, formatted as readable text.

---

## Prompts (canned starting points)

MCP prompts let the connector ship suggested templates the user can pick from a menu in Claude.ai.

- **"What's broken right now?"** — calls `summarize_workspace`, then asks Claude to explain the top issue in plain English to a client.
- **"Write a client update for {profile}"** — fetches `get_diagnostic_report` and reformats it as a client-facing email.
- **"Compare this week to last week"** — calls `get_profile_health` for trend, asks Claude to narrate the delta.

---

## Distribution

- Submit to Anthropic's MCP connector catalog. Approval bar is "useful, safe, OAuth correctly". A read-only server scoped to a single SaaS's data is a clean fit.
- Marketing line: "Use Runmend from inside Claude — install the connector, ask anything about your clients' automations." Add to landing once the catalog listing is live.
- Link from `/vs-claude-cowork`: "Already in Claude? Install the Runmend connector and use both." This converts the page from "either/or" to "and", aligned with the closing paragraph already there.

---

## Cost

- Vercel Functions: marginal. Read-only MCP requests are short DB queries; well within Fluid Compute's per-request budget.
- Supabase: same workload as existing app reads. RLS already in place.
- Anthropic: zero — we don't pay; users do, on their own Claude plan.

The only real cost is engineering time to build + maintain.

---

## Engineering estimate (when we build it)

- **Week 1**: OAuth flow + `mcp_tokens` table + revocation UI + integration tests.
- **Week 2**: MCP server route, six tools, three resources, three prompts, Zod schemas, end-to-end test against the MCP inspector.
- **Week 3**: Anthropic catalog submission, marketing page updates, monitoring (Sentry breadcrumbs per tool call, PostHog events).

Total: **~3 weeks of focused work**, single engineer.

---

## Risks & open questions

| Risk | Mitigation |
|---|---|
| Anthropic catalog rejects (policy / security review) | Build first as a "manual install" connector users can add via URL. Catalog is a distribution accelerator, not a launch gate. |
| Rate limits on the Claude side throttle complex queries | Tools are scoped to one workspace; outputs paginated where they could blow up. Cache hot reads in Vercel Runtime Cache (5-min TTL, tag-invalidated by sync). |
| OAuth scope confusion (user picks wrong workspace) | Workspace picker in the OAuth consent screen, defaults to most-recently-used. |
| Read-only feels too limited; users ask for actions | Document scope clearly. Track requests. Phase 4 candidate: a single mutation tool (`trigger_sync`) gated by a per-token scope. |
| MCP spec changes | Pin SDK version, follow Anthropic's deprecation policy. |
| We commoditize ourselves | The MCP surface is a *complement* to the Runmend app (alerts go to email/Slack, history persists, multi-tenant RBAC). The connector adds the chat surface; it doesn't remove the reasons people pay. |

**Open questions to resolve before building:**

1. Pricing — does the MCP connector require Pro or above? Probably yes (it's the same data Pro unlocks via the API). Confirm in Phase 4.
2. Per-token vs per-user rate limit on the MCP endpoint — pick a number.
3. Do we expose demo profiles via MCP for users on the free tier? Useful for evaluation; risk is it teaches people to use only the demo and never connect their own.

---

## Decision

Greenlight the spike when (a) we've shipped at least one of on-call rotation / status pages / SLA tracking (so the Runmend value Beyond Cowork is concrete), and (b) the LTD seat campaign is closed (so engineering bandwidth opens up).

Until then: this doc is the placeholder. Don't build the MCP server before the differentiating features ship — otherwise the connector just exposes "the same thing Cowork does, but slower" and damages the positioning Phase 1 just established.
