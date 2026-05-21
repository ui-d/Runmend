# Reliability Suite PR #2 — Pre-work Notes

> Branch: `feat/reliability-suite-pr2` · Base: `main` @ `d71a85c` · Author: Claude Code
> Wiring preflight assertion types **5–7**: `latency_under_ms`, `cost_under_cents` (n8n-only), `llm_judge`.

## Scope recap

Pre-flight Check (migration `20260508000001`, commit `089de3f`) shipped types 1–4
implemented and 5–7 stubbed. This PR replaces the stub with real implementations.
**Additive only** — no `PlatformAdapter` refactor, no sync-engine changes, no renames,
no new assertion types, no `/scenarios` redesign, no pricing/positioning changes.

## File map (verified against working tree)

| Concern | Actual path |
|---|---|
| Assertion router + inline stub | `src/lib/preflight/assertions/index.ts` (stub: lines 89–98) |
| Reference assertion impl | `src/lib/preflight/assertions/json-schema.ts` |
| Shared preflight types | `src/lib/preflight/types.ts` (`AssertionType`, `SingleAssertionOutcome`, `ExecutionContext`, stale `AssertionConfig` union) |
| Executor types | `src/lib/preflight/executor/types.ts` |
| Synchronous executor (DI seam) | `src/lib/preflight/executor/synchronous.ts` (`SynchronousExecutorDeps`, `runOneInput`, `cost_cents` plumbing) |
| Hard caps / tunables | `src/lib/preflight/limits.ts` |
| Zod assertion-config schemas | `src/lib/validation/preflight-schemas.ts` |
| Assertion tests | `src/lib/preflight/__tests__/assertions.test.ts` |
| Executor tests | `src/lib/preflight/__tests__/synchronous-executor.test.ts` |
| Claude SDK wiring reference | `src/app/api/diagnostic/route.ts:238-272` (`callClaude`) |
| Prompt-builder pattern reference | `src/lib/diagnostic/enhanced-prompt.ts` |
| SDK-call retry helper | `src/lib/platform-adapters/retry.ts` (`withBackoff`) |
| Runs detail page | `src/app/app/[workspaceSlug]/scenarios/[id]/runs/[runId]/page.tsx` |
| Run results component | `src/components/app/scenarios/RunResultsView.tsx` |

## CHECK-constraint confirmation (no migration needed)

`supabase/migrations/20260508000001_preflight_scenarios.sql`:

- Line 11 comment: *"llm_judge / latency / cost types do not need a schema change."*
- `preflight_assertions.assertion_type` CHECK (lines 60–69) already lists all 7 types
  including `llm_judge`, `latency_under_ms`, `cost_under_cents`.
- `preflight_runs.total_cost_cents integer NOT NULL DEFAULT 0` (line 91).
- `preflight_run_results.cost_cents integer` (nullable, line 121).
- `preflight_run_results.assertion_results jsonb NOT NULL` (line 119).
- `preflight_scenarios.baseline_run_id uuid` self-FK → `preflight_runs.id` (lines 24, 104–107).
- `preflight_runs.drift_eligible boolean NOT NULL DEFAULT false` (line 94).

**Conclusion:** zero Supabase migrations. Judge cost rolls through the existing
`InputOutcome.costCents → preflight_run_results.cost_cents → preflight_runs.total_cost_cents`
path (currently always fed `0`). No `judge_cost_cents` column.

## Reference impl shape (`json-schema.ts`)

```
export interface XConfig { … }
export interface AssertionEvaluation { passed: boolean; message: string | null }
export function evaluateX(config, output|latency|…): AssertionEvaluation
```

`assertions/index.ts` casts `assertion.config` to the per-file config interface and
maps the evaluation into a `SingleAssertionOutcome`. New assertions follow the same shape.

## Stub being replaced

`assertions/index.ts:89-98` — combined `case "llm_judge": case "latency_under_ms":
case "cost_under_cents":` returns `{ passed: true, message: '… not yet supported in
PR #1; skipped' }`. Task D replaces this with real routing and makes the module async.

---

## PR #2 deviations from original spec — approved by Dawid 2026-05-15

1. **Filenames.** Spec said `json-schema-valid.ts`, `assertions/types.ts`, tests under
   `assertions/__tests__/`. Reality: `json-schema.ts`, shared types in
   `preflight/types.ts`, tests in `preflight/__tests__/{assertions,synchronous-executor}.test.ts`.
   We follow the **actual** layout and extend the existing test files.

2. **Stub location.** No per-type stub files; the stub is the inline combined `case`
   at `assertions/index.ts:89-98`. Task D edits that branch directly.

3. **Coverage gate is 90/90/90/80**, not 90/90/90/84. `vitest.config.ts` sets
   `branches: 80` with an in-code comment explaining 84 was aspirational and already
   failing on `main` pre-Pre-flight (baseline ~81.2%); raising it is a tracked
   follow-up. There is no `autoUpdate` key. We **hold 80**, do not edit
   `vitest.config.ts`, and note the 80→84 raise as out-of-scope in the PR description.

4. **Claude SDK wiring source.** Spec said reuse `enhanced-prompt.ts` for SDK wiring;
   that file only builds a prompt string. Real wiring is `src/app/api/diagnostic/route.ts:243-272`
   (`new Anthropic({apiKey})` → `client.messages.create({ model: process.env.CLAUDE_MODEL
   ?? "claude-sonnet-4-5-20250929", … })`, fence-strip, `JSON.parse`). `judge/client.ts`
   models that; `judge/prompt.ts` reuses `enhanced-prompt.ts` only as a builder *pattern*.

5. **No Supabase migration.** Migration `20260508000001` already satisfies every schema
   need (see confirmation above). Judge cost routes through existing
   `cost_cents → total_cost_cents` plumbing; no new column. The global "Supabase via
   MCP" rule is trivially satisfied — nothing to migrate.

6. **`cost_under_cents` scoped to n8n-only.** The Make adapter (`make.ts:186-191`)
   structurally returns the polled *scenario-log envelope* as `output` because the
   Make public v2 API does not expose per-module bundle results; there is no
   AI-node `usage` to parse, and refactoring the adapter is explicitly out of scope.
   For Make, `cost_under_cents` returns an explicit `platform_unsupported` **warn**
   outcome (not a silent zero, not a heuristic estimate). Full n8n implementation
   (pricing table, per-node breakdown, scope filter, tests) ships in this PR. See
   `docs/MAKE_COST_EXTRACTION_GAP.md`. Rejected alternatives and rationale recorded
   there and in the approval thread.

### Approved architecture change

`evaluateAssertion`/`evaluateAllAssertions` become **async** so `llm_judge` can do I/O.
Types 1–4 stay synchronous in runtime (direct call + return, **no `Promise.resolve()`
wrapping**); only `llm_judge` awaits. The Anthropic client + a baseline-result reader
are injected through the existing `SynchronousExecutorDeps` DI seam (mirroring
`buildAdapter`) via a new optional `buildJudge?()`. Missing judge deps ⇒ `llm_judge`
returns a non-fatal warn (never crashes a run). Tests inject a mock — zero real
Anthropic calls in unit/CI; one gated integration test only.

## Additional implementation notes (approved deviations, cont.)

7. **Scenario-create warning is POST-only.** `scenarioUpdateSchema`
   (`PATCH /api/scenarios/[id]`) has no assertion or connection field — a
   `cost_under_cents` assertion can only be introduced at create time. The
   spec asked for the Make-cost warning on "POST and PATCH"; PATCH has no
   assertion path, so the warning is correctly POST-only.

8. **`latency_under_ms` now returns `details`.** To render the actual-vs-limit
   UI bar, the latency evaluation carries `details: { latency_ms, max_ms }`
   (threaded through the dispatcher like cost/judge). Two latency unit tests
   switched from `toEqual` to `toMatchObject` to accommodate the extra field.

## Pending follow-ups (Stop-and-check-in with Dawid)

- **Live runs-page E2E is pending a seeded fixture.** Verifying
  `/scenarios/[id]/runs/[runId]` rendering of all three new assertion types
  end-to-end requires a `preflight_run_results` row whose `assertion_results`
  contains latency/cost/judge outcomes in the test workspace, plus working
  `<your-test-user>` auth. Neither a seeded run nor a completable login was
  available in the implementation environment (live Supabase + cookie
  consent). The component is lint-clean, type-clean, and covered by
  `next build`; Playwright `data-testid` hooks (`latency-bar`,
  `cost-breakdown`, `make-cost-gap`, `judge-detail`, `judge-score`,
  `judge-confidence`, `judge-unavailable`) are in place for the E2E once a
  fixture exists. Same blocker class as the n8n golden cost fixture.

## Token cost observed during dev/test

All unit/CI tests mock Anthropic — **$0 real token spend**. The single gated
real-API integration test (`judge/__tests__/integration.test.ts`) was not run
in this environment (no `RUN_INTEGRATION_TESTS`); when run it logs the
observed judge cost (~0.2–0.5¢ for the tiny fixture at Sonnet 4.5 rates).
