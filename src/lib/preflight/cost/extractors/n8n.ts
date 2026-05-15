import type { Json } from "@/lib/database.types";
import { costCentsFor } from "../pricing-table";
import type { CostBreakdownEntry, CostExtraction } from "../types";

const MAX_DEPTH = 15;
const MAX_NODES = 5_000;

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asTokenUsage(v: unknown): TokenUsage | null {
  if (!isRecord(v)) return null;
  const p = v.promptTokens;
  const c = v.completionTokens;
  if (typeof p === "number" && typeof c === "number") {
    return { promptTokens: p, completionTokens: c };
  }
  return null;
}

interface Accumulator {
  breakdown: CostBreakdownEntry[];
  warnings: string[];
  rawCents: number;
  nodes: number;
}

function record(
  acc: Accumulator,
  node: string,
  model: string | null,
  usage: TokenUsage,
  isEstimate: boolean,
): void {
  const { cents, matched } = costCentsFor(
    model ?? "",
    usage.promptTokens,
    usage.completionTokens,
  );
  if (!matched) {
    acc.warnings.push(`unpriced_model:${model ?? "unknown"}`);
  }
  if (isEstimate) {
    acc.warnings.push(`estimated_tokens:${node}`);
  }
  acc.rawCents += cents;
  acc.breakdown.push({
    node,
    model: model ?? null,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    cents,
    isLlm: true,
  });
}

/** Handle the `llmCalls: [{ nodeName, model, tokenUsage }]` envelope. */
function handleLlmCalls(acc: Accumulator, calls: unknown): void {
  if (!Array.isArray(calls)) return;
  for (const call of calls) {
    if (!isRecord(call)) continue;
    const usage = asTokenUsage(call.tokenUsage);
    if (!usage) {
      acc.warnings.push("malformed_token_usage:llmCall");
      continue;
    }
    const model = typeof call.model === "string" ? call.model : null;
    const node =
      typeof call.nodeName === "string" ? call.nodeName : "llm-call";
    record(acc, node, model, usage, false);
  }
}

/** Handle a standalone `tokenUsage` / `tokenUsageEstimate` on an object. */
function handleStandalone(acc: Accumulator, obj: Record<string, unknown>): void {
  const model = typeof obj.model === "string" ? obj.model : null;
  const node = typeof obj.nodeName === "string" ? obj.nodeName : "n8n-node";
  const exact = asTokenUsage(obj.tokenUsage);
  if (exact) record(acc, node, model, exact, false);
  const estimate = asTokenUsage(obj.tokenUsageEstimate);
  if (estimate) record(acc, node, model, estimate, true);
}

function walk(value: Json, acc: Accumulator, depth: number): void {
  if (depth > MAX_DEPTH || acc.nodes > MAX_NODES) {
    if (acc.nodes > MAX_NODES) acc.warnings.push("traversal_truncated");
    return;
  }
  acc.nodes += 1;
  if (Array.isArray(value)) {
    for (const item of value) walk(item, acc, depth + 1);
    return;
  }
  if (!isRecord(value)) return;

  if ("llmCalls" in value) handleLlmCalls(acc, value.llmCalls);
  handleStandalone(acc, value);

  for (const [key, child] of Object.entries(value)) {
    // `llmCalls` already handled; `totalTokenUsage` is an un-priceable
    // aggregate (no per-call model) — never recurse/count it.
    if (key === "llmCalls" || key === "totalTokenUsage") continue;
    walk(child as Json, acc, depth + 1);
  }
}

/**
 * Extract LLM token cost from an n8n workflow's `output_data` jsonb.
 *
 * Recognizes the documented n8n shapes: the `{ totalTokenUsage, llmCalls }`
 * envelope and standalone `tokenUsage` / `tokenUsageEstimate` objects with a
 * sibling `model`. Unknown/absent shapes yield zero cost (clean when there is
 * genuinely no LLM activity; warned when usage was seen but couldn't be
 * priced). Known limitation: the n8n AI Agent node hides its Chat Model
 * sub-node token usage from downstream output (n8n GitHub #26302) — see
 * `docs/MAKE_COST_EXTRACTION_GAP.md` "n8n caveats".
 */
export function extractN8nCost(output: Json | null): CostExtraction {
  const acc: Accumulator = {
    breakdown: [],
    warnings: [],
    rawCents: 0,
    nodes: 0,
  };
  if (output !== null) walk(output, acc, 0);
  return {
    total_cents: Math.round(acc.rawCents),
    breakdown: acc.breakdown,
    warnings: acc.warnings,
  };
}
