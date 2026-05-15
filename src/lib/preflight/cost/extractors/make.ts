import type { CostUnsupported } from "../types";

/**
 * Make.com cost extractor — intentionally a no-op sentinel.
 *
 * The Make adapter (`src/lib/platform-adapters/make.ts:186-191`) returns the
 * polled *scenario-log envelope* as `output` because the Make public v2 API
 * does not expose per-module bundle results, so there is no AI-node `usage`
 * to parse. Extracting real Make cost would require extending the adapter,
 * which is explicitly out of scope for PR #2 (additive only). This keeps a
 * per-platform seam so a future PR can swap in a real implementation without
 * touching the assertion. See `docs/MAKE_COST_EXTRACTION_GAP.md`.
 */
export function extractMakeCost(): CostUnsupported {
  return { unsupported: true };
}
