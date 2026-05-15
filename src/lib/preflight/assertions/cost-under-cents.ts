import type { Json } from "@/lib/database.types";
import { costUnderCentsConfigSchema } from "@/lib/validation/preflight-schemas";
import { extractN8nCost } from "../cost/extractors/n8n";
import { extractMakeCost } from "../cost/extractors/make";
import type { CostBreakdownEntry } from "../cost/types";
import type { AssertionEvaluation } from "./json-schema";

export interface CostUnderCentsConfig {
  max_cents: number;
  scope?: "total" | "llm_only";
}

export interface CostEvaluation extends AssertionEvaluation {
  /** Set for product-gap outcomes (platform_unsupported, cost_indeterminate). */
  reason?: string;
  /** Forces the dispatcher to record this as a warn regardless of config. */
  forceWarn?: boolean;
  details?: Json;
}

const MAKE_UNSUPPORTED_MESSAGE =
  "Make does not expose per-module cost in its public v2 API. Cost monitoring " +
  "for Make requires an adapter extension (planned post-PR #2). Assertion skipped.";

function platformUnsupported(): CostEvaluation {
  return {
    passed: false,
    reason: "platform_unsupported",
    forceWarn: true,
    message: MAKE_UNSUPPORTED_MESSAGE,
  };
}

/**
 * Assertion type 6: `cost_under_cents` (n8n-only in PR #2).
 *
 * Parses LLM token cost from the n8n workflow output and passes iff the
 * scoped cost is at or under `max_cents`. Make returns an explicit
 * `platform_unsupported` warn (never a silent zero). When LLM activity is
 * seen but cannot be priced, the result is a non-failing `cost_indeterminate`
 * warn — the gap is surfaced, not hidden. See `docs/MAKE_COST_EXTRACTION_GAP.md`.
 */
export function evaluateCostUnderCents(
  config: CostUnderCentsConfig,
  output: Json | null,
  platform: "make" | "n8n" | undefined,
): CostEvaluation {
  const parsed = costUnderCentsConfigSchema.safeParse(config);
  if (!parsed.success) {
    return {
      passed: false,
      message: `Assertion misconfigured: ${parsed.error.issues[0]?.message ?? "invalid cost_under_cents config"}`,
    };
  }
  const { max_cents, scope } = parsed.data;

  if (platform === "make") {
    // Exercises the per-platform seam; returns the unsupported sentinel.
    extractMakeCost();
    return platformUnsupported();
  }
  if (platform !== "n8n") {
    return platformUnsupported();
  }

  const extraction = extractN8nCost(output);
  const entries: CostBreakdownEntry[] =
    scope === "llm_only"
      ? extraction.breakdown.filter((e) => e.isLlm)
      : extraction.breakdown;
  const scopedCents = Math.round(
    entries.reduce((sum, e) => sum + e.cents, 0),
  );
  const details: Json = {
    total_cents: scopedCents,
    scope,
    breakdown: entries as unknown as Json,
    warnings: extraction.warnings,
  };

  if (extraction.warnings.length > 0 && scopedCents === 0) {
    return {
      passed: false,
      reason: "cost_indeterminate",
      forceWarn: true,
      message:
        "LLM activity was detected but cost could not be determined " +
        `(${extraction.warnings.join(", ")}). Treated as a warning, not a failure.`,
      details,
    };
  }

  if (scopedCents <= max_cents) {
    return { passed: true, message: null, details };
  }
  return {
    passed: false,
    message: `Cost ${scopedCents}¢ exceeds limit ${max_cents}¢`,
    details,
  };
}
