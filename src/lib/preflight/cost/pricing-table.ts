/**
 * Hardcoded per-token pricing for the LLM models Runmend recognizes when
 * extracting cost from n8n LangChain node output.
 *
 * Rates are USD per 1,000,000 tokens (input / output), verified 2026-05-15
 * via web search against vendor pricing pages:
 *   - Anthropic Sonnet 4.5: $3.00 in / $15.00 out
 *   - Anthropic Haiku 4.5:  $1.00 in / $5.00 out
 *       (https://platform.claude.com/docs/en/about-claude/pricing)
 *   - OpenAI GPT-4o:        $2.50 in / $10.00 out
 *   - OpenAI GPT-4o-mini:   $0.15 in / $0.60 out
 *   - OpenAI GPT-5:         $1.25 in / $10.00 out
 *       (https://openai.com/api/pricing/)
 *
 * When a model is not in this table we DO NOT guess a price — the extractor
 * records the token usage with zero cents plus an `unpriced_model` warning so
 * the gap is surfaced rather than silently mis-reported. Update this table
 * (and the verification date) when vendor pricing changes.
 */
export interface ModelRate {
  inputPerMTokUsd: number;
  outputPerMTokUsd: number;
}

export const PRICING: Record<string, ModelRate> = {
  "claude-sonnet-4-5": { inputPerMTokUsd: 3.0, outputPerMTokUsd: 15.0 },
  "claude-haiku-4-5": { inputPerMTokUsd: 1.0, outputPerMTokUsd: 5.0 },
  "gpt-4o": { inputPerMTokUsd: 2.5, outputPerMTokUsd: 10.0 },
  "gpt-4o-mini": { inputPerMTokUsd: 0.15, outputPerMTokUsd: 0.6 },
  "gpt-5": { inputPerMTokUsd: 1.25, outputPerMTokUsd: 10.0 },
};

// Longest keys first so "gpt-4o-mini" wins over the "gpt-4o" prefix.
const KEYS_BY_SPECIFICITY = Object.keys(PRICING).sort(
  (a, b) => b.length - a.length,
);

/**
 * Map a raw model identifier (e.g. "openai/gpt-4o-mini",
 * "claude-sonnet-4-5-20250929") to a canonical pricing-table key, or null
 * when the model is not recognized.
 */
export function normalizeModelKey(model: string): string | null {
  if (!model) return null;
  const bare = model.toLowerCase().split("/").pop() ?? "";
  for (const key of KEYS_BY_SPECIFICITY) {
    if (bare.startsWith(key)) return key;
  }
  return null;
}

export interface CostResult {
  cents: number;
  matched: boolean;
}

/**
 * Cost in cents for a model's token usage. `matched: false` (and 0 cents)
 * when the model is unknown — callers must surface that as a gap, never as
 * a confident zero.
 */
export function costCentsFor(
  model: string,
  promptTokens: number,
  completionTokens: number,
): CostResult {
  const key = normalizeModelKey(model);
  if (key === null) return { cents: 0, matched: false };
  const rate = PRICING[key]!;
  const usd =
    (promptTokens / 1_000_000) * rate.inputPerMTokUsd +
    (completionTokens / 1_000_000) * rate.outputPerMTokUsd;
  return { cents: usd * 100, matched: true };
}
