# Make Cost Extraction Gap (`cost_under_cents`)

> Status: **known gap, deliberately deferred** to a post-PR #2 wave.
> Decision owner: Dawid · Recorded 2026-05-15 · Implemented in `feat/reliability-suite-pr2`.

## Summary

The `cost_under_cents` preflight assertion (type 6) is implemented **n8n-only**
in PR #2. On Make scenarios it returns an explicit, non-failing
`platform_unsupported` **warn** — never a silent zero and never a heuristic
estimate.

## Why Make cost cannot be extracted today

The Make adapter does not surface per-module (AI-node) results. From
`src/lib/platform-adapters/make.ts:186-191`:

```
/**
 * Trigger a Make scenario via /scenarios/{id}/run, then poll the most
 * recent log entry for completion. Returns the parsed log payload as the
 * "output" because Make does not expose direct module results in its
 * public v2 API. Pre-flight assertions are written against that envelope.
 */
```

`executeWorkflow` therefore returns the **scenario-log envelope**
(`{ id, status, error, timestamp, … }`), which contains no AI-node `usage`
blocks. The Make public v2 API (`/scenarios/{id}/logs`,
`https://www.make.com/en/api-documentation`) exposes execution *status* and
*metadata*, not per-module token usage or cost. There is structurally nothing
to parse from the current adapter output.

Extracting real Make cost would require **extending the `PlatformAdapter`
contract / Make adapter** (e.g. fetching `/scenarios/{id}/executions/{id}`
detail with `imt:` blob parsing, or requiring a customer-side Custom Apps SDK
hook). That refactor is explicitly **out of scope** for PR #2 (additive only,
no adapter refactor).

## Behaviour shipped in PR #2

- `src/lib/preflight/cost/extractors/make.ts` returns `{ unsupported: true }`
  (a per-platform seam so a future PR can swap in a real implementation
  without touching the assertion).
- `evaluateCostUnderCents(..., "make")` returns:
  `{ passed: false, reason: "platform_unsupported", forceWarn: true, message }`.
- The dispatcher forces `severity: "warn"` for this outcome regardless of the
  configured severity, so it never fails a run.
- Scenario create/update returns a **non-blocking** warning (Task E) when a
  `cost_under_cents` assertion is added to a Make-connection scenario, so the
  user opts in knowingly. When Make cost lands, those assertions activate
  automatically — and the attempts are an adoption signal.
- The UI renders this as a neutral gray "Not available on Make" pill, not a
  red failure (Task F).

## n8n caveats (also a partial gap)

n8n cost extraction parses the documented shapes — the
`{ totalTokenUsage, llmCalls:[{ nodeName, model, tokenUsage }] }` envelope and
standalone `tokenUsage` / `tokenUsageEstimate` objects with a sibling `model`
(verified 2026-05-15 against n8n docs + community threads).

Known limitation: the **n8n AI Agent node hides its Chat Model sub-node token
usage from downstream output** (n8n GitHub issue #26302). When a workflow uses
that pattern, no token usage is observable and the extractor reports a clean
zero. We cannot distinguish "no LLM activity" from "AI Agent hid the usage"
from `output_data` alone. Unpriced/unknown models and estimated token counts
are surfaced as extractor `warnings`; when usage is seen but unpriceable the
assertion returns a non-failing `cost_indeterminate` warn.

**Open follow-up / Stop-and-check-in:** the n8n golden test against a real
test-workspace fixture is **pending** — no fixture with AI/LangChain nodes was
available at implementation time. Tests use synthetic fixtures built from the
documented shape. Dawid to provide a real n8n run fixture so a golden test can
be added (tracked, not blocking PR #2).

## Proposed solutions (post-PR #2)

1. **Adapter extension (preferred):** add a Make execution-detail fetch
   (`/scenarios/{id}/executions` → blueprint/operations) and parse `usage`
   from AI modules; introduce a `fetchExecutionCost(executionId)` adapter
   method rather than changing `executeWorkflow`'s contract.
2. **`data_in`/`data_out` parsing:** if a customer's scenario writes AI usage
   into a downstream data store / webhook payload we already capture, parse
   it from there (no adapter change, customer-configuration dependent).
3. **Customer Custom Apps SDK hook:** document a small Make Custom App that
   emits per-module token usage to a Runmend ingestion endpoint.

## Decision

Do not break the `PlatformAdapter` contract in PR #2. Ship n8n-only cost with
an honest, non-failing Make gap and clear product/UX signposting. Re-evaluate
Make cost extraction as a dedicated PR #3 item.
