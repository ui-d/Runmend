# Runmend Pricing Review (Phase 4)

**Status**: Analysis only. No Stripe changes proposed in this commit.
**Last updated**: 2026-04-26
**Related**: Phase 1 positioning shift (commit `4349d98`), `/vs-claude-cowork` page, `docs/MCP_SERVER_DESIGN.md`

---

## Why this exists

Phase 1 repositioned Runmend from "automation health monitor for individuals" toward "production monitoring for Make.com and n8n agencies". The plan tier descriptions were updated, but **the actual Stripe-backed price points and tier shape were not** — those were explicitly deferred here.

This doc reviews whether the current pricing still serves the new ICP and surfaces the questions worth answering before the next pricing change.

---

## Current pricing snapshot

Source of truth: `src/lib/stripe.ts:27-46`, `src/data/pricing.ts:14-76`.

| Tier | Price | Profiles | Syncs/day | AI reports/mo | Stripe price ID env |
|---|---|---|---|---|---|
| Free | $0 | 1 | 1 | 3 | n/a |
| Starter | $19/mo | 5 | 4 | 20 | `STRIPE_PRICE_STARTER` |
| Pro | $49/mo | 25 | 24 | unlimited | `STRIPE_PRICE_PRO` |
| Enterprise | "Contact sales" | unlimited | unlimited | unlimited | n/a (sales-led) |
| LTD | $99 once | 25 (Pro limits) | 24 | unlimited | `STRIPE_PRICE_LTD` |

LTD-holders resolve to Pro at runtime (`resolveEffectivePlan` in `stripe.ts:60`).

---

## Does this fit the new ICP?

### What works

- **Free tier as a try-it-on-one-client slot.** Aligned with the new "agencies" framing — the rewritten Free description explicitly positions it as "for trying Runmend before you commit", which is consistent with how an agency owner would evaluate it (drop in one client account, see if it earns its keep in a week).
- **Pro at $49/mo for 25 client profiles + hourly sync** is a *realistic* number for an agency of one to five people. Per-profile cost works out to under $2/client/month at full capacity — easy expense for any agency that bills clients in the hundreds-to-thousands range.
- **LTD at $99** is correctly priced as an early-adopter goodwill move and is now consistent across the codebase (Phase 1 fixed the $249 marketing leak).

### What doesn't fit cleanly

- **Starter at $19 / 5 profiles / 4 syncs/day** is a hobbyist tier in shape. An agency operator either (a) starts on Free with one client to evaluate, then (b) graduates straight to Pro when they hit the second or third client. The middle tier is awkward. Worth measuring whether anyone actually settles on Starter long-term, or whether it's just a checkout-friction point.
- **No team / seat-aware pricing.** Every paid tier is a flat workspace fee. The new positioning ("production monitoring for teams") implies team-based pricing eventually. Pro is currently single-workspace-flat with unlimited members of that workspace — fine while team sizes are 1–3, but an inflection at 5+ seats is plausible.
- **"Enterprise" is a sentinel, not a plan.** It anchors the right side of the comparison table without backing infra. That's OK as a sales conversation starter, but the description we just rewrote ("Multi-team ops with custom volume and sourcing") will start to feel hollow if no one ever closes one.
- **Free tier might be too generous as an evaluation tool.** 1 profile + 3 AI reports/month is enough that some users will sit on Free for months. Compare to a 14-day trial of Pro: time-boxed, the user feels the real product, and the conversion forcing function is calendar-based instead of capacity-based.

---

## Decision tree (questions to answer before changing prices)

### Q1 — Is Free the right top of funnel for a B2B/agency product?

Two paths:

**Path A: keep Free as evaluation slot.** Pros: low signup friction, lots of activations, classic SaaS funnel. Cons: people sit on Free forever; conversion to paid is slow; you carry their compute cost for nothing.

**Path B: replace Free with a 14-day Pro trial.** Pros: forcing function on calendar; users feel full product; trial conversion rate is typically higher than freemium. Cons: more friction at signup; you lose the "hobbyist who recommends to their agency boss" pathway.

**Recommendation (not yet decided):** keep Free for now while activations are still small. Re-evaluate when we hit either (a) >500 free-tier active workspaces stuck below conversion, or (b) a measurable infrastructure cost per free user.

### Q2 — Does Starter pull its weight or should it be cut?

Run the analytics:

- How many Starter subscribers do we have today?
- What's the median time on Starter before upgrading to Pro or churning?
- What % of Starter signups came from Free vs straight from `/pricing`?

If Starter is mostly a stop-gap on the way to Pro (i.e. people upgrade within 1–2 months), it's adding billing-portal complexity for marginal MRR. Cut to Free → Pro → Team and let Free do the evaluation work.

If Starter is sticky (people stay on it >6 months), keep it but consider repositioning as "for the first agency hire who's running 2–4 clients" rather than "for freelancers".

### Q3 — Is there a Team tier above Pro?

The new positioning explicitly targets "teams" but Pro is single-workspace. Three concrete options:

- **Option A: Team plan at $99/mo for 75 profiles + multi-workspace.** Multi-workspace lets one customer separate, e.g., agency-internal automations from each of 3–4 sub-brand client books. Big agencies that today would pick Enterprise can self-serve.
- **Option B: Per-seat add-on to Pro.** $49 base + $10/extra seat above 3. Aligns price with team size, easier to upsell, but harder to communicate.
- **Option C: Don't add Team yet; let Enterprise pick up demand >25 profiles.** Lowest engineering lift; you'll lose self-serve revenue from 5–10 person agencies who would have just clicked Team and gone away.

Recommendation: **Option A** if and when there's signal that real customers want >25 profiles. Don't build it preemptively.

### Q4 — Is the LTD still the right move?

Two angles:

- **Founder economics**: LTD is a one-time injection of cash with zero recurring upside. Healthy at the start, but every LTD seat is one fewer Pro subscriber. We capped seat count for a reason.
- **Positioning**: LTD signals "early days, place your bet now". That's consistent with the new agency-first positioning *only* if the LTD holders are agencies, not solo hobbyists. Worth a quick pull on who's actually claiming LTD seats.

Decision: **finish the LTD seat run, then close it.** Don't repeat. Future loyalty plays should be annual discounts, not lifetime.

### Q5 — Do we need to raise prices because the ICP narrowed?

Phase 1 explicitly told hobbyists to use Claude Cowork instead. The remaining ICP (agencies running production automations) has materially higher willingness to pay than hobbyists.

Pro at $49/mo is cheap for the ICP. Realistic ceiling is probably $79–$99/mo for Pro and $149–$199/mo for Team.

Don't raise prices in the same quarter as a positioning shift — it confuses the message. Re-test in 3–6 months after activation/conversion data settles.

---

## What this doc does NOT recommend

- ❌ Don't change Stripe price IDs in this session.
- ❌ Don't grandfather migrations without an explicit announcement plan — `subscriptions.is_ltd`, `subscriptions.plan`, the LTD claim flow, and the active customer base would all need coordinated changes.
- ❌ Don't add a Team tier without first measuring whether anyone is bouncing off the 25-profile Pro ceiling.
- ❌ Don't kill Free until we can replace its top-of-funnel value with something measurable (e.g. trial conversion rate from the Pro trial path).

---

## Concrete next steps (when pricing changes are scheduled)

1. **Pull the data**: PostHog `pricing_page_viewed`, `signup_started`, `subscription_created` (by plan), `subscription_canceled` (by plan + tenure), Free → Paid conversion rate, Starter → Pro upgrade rate, LTD claim demographics (workspace name vs personal email).
2. **Write a one-pager** with the proposed change + the data justifying it.
3. **Test with five existing customers** before flipping anything in Stripe.
4. **Plan grandfathering**: every existing subscriber at the old price should keep it (set this expectation explicitly in product comms; it's a basic trust play).
5. **Update**: `src/lib/stripe.ts`, `src/data/pricing.ts`, `src/components/landing/Pricing.tsx`, `src/components/pricing/ComparisonTable.tsx`, the Stripe dashboard product/price descriptions, and any email templates referencing prices.
6. **Run lint, tests, build, then walk `/pricing` and the in-app billing page in a browser** before deploying.

---

## Bottom line

The current pricing isn't broken — it just wasn't designed for the ICP we just sharpened. The right next move is **measurement, not surgery**. Pull the analytics in 4–6 weeks, then revisit Q1–Q4 above with data instead of intuition.

---

## Addendum — Reliability Suite scope (2026-05-15, PR #2)

The Agency/Pro tier now ships the **full Pre-flight Reliability Suite (assertion types 1–7)**, not just the schema/field checks (1–4):

- `latency_under_ms`, `cost_under_cents`, `llm_judge` are wired (PR #2).
- `cost_under_cents` is **n8n-only**; Make cost is an explicit, non-failing
  known gap on the roadmap (see `docs/MAKE_COST_EXTRACTION_GAP.md`).
- `llm_judge` consumes Claude tokens per evaluated input. This is a
  **variable COGS line** on plans that expose Pre-flight — judge spend rolls
  into `preflight_runs.total_cost_cents` and is bounded per scenario by the
  existing `cost_cap_cents`. Worth modelling gross-margin-per-run before any
  pricing change that increases Pre-flight quotas. No price points change in
  this PR (analysis/scope only, consistent with this doc's stance).
