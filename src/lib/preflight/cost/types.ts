/**
 * Shared types for per-platform cost extractors. Extractors parse the
 * workflow `output_data` jsonb and report token-derived LLM cost without
 * touching the PlatformAdapter contract.
 */
export interface CostBreakdownEntry {
  node: string;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  cents: number;
  /** True for nodes whose cost comes from LLM token usage. */
  isLlm: boolean;
}

export interface CostExtraction {
  /** Sum of priced LLM cents, rounded to the nearest integer cent. */
  total_cents: number;
  breakdown: CostBreakdownEntry[];
  /** Non-fatal gaps (unpriced model, estimated tokens, truncated walk). */
  warnings: string[];
}

/** Returned by platforms that cannot expose per-module cost (e.g. Make v2). */
export interface CostUnsupported {
  unsupported: true;
}

export type ExtractorResult = CostExtraction | CostUnsupported;
