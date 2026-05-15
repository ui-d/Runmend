import { describe, it, expect } from "vitest";
import {
  PRICING,
  normalizeModelKey,
  costCentsFor,
} from "@/lib/preflight/cost/pricing-table";
import { extractN8nCost } from "@/lib/preflight/cost/extractors/n8n";
import { extractMakeCost } from "@/lib/preflight/cost/extractors/make";
import { evaluateCostUnderCents } from "@/lib/preflight/assertions/cost-under-cents";

describe("pricing-table", () => {
  it("prices every recognized model", () => {
    for (const key of Object.keys(PRICING)) {
      expect(PRICING[key]!.inputPerMTokUsd).toBeGreaterThan(0);
      expect(PRICING[key]!.outputPerMTokUsd).toBeGreaterThan(0);
    }
  });
  it("normalizes Anthropic dated model ids", () => {
    expect(normalizeModelKey("claude-sonnet-4-5-20250929")).toBe(
      "claude-sonnet-4-5",
    );
    expect(normalizeModelKey("claude-haiku-4-5-20251001")).toBe(
      "claude-haiku-4-5",
    );
  });
  it("normalizes provider-prefixed OpenAI ids", () => {
    expect(normalizeModelKey("openai/gpt-4o-mini")).toBe("gpt-4o-mini");
    expect(normalizeModelKey("gpt-4o")).toBe("gpt-4o");
    expect(normalizeModelKey("gpt-5")).toBe("gpt-5");
  });
  it("returns null for unknown models", () => {
    expect(normalizeModelKey("llama-3-70b")).toBeNull();
    expect(normalizeModelKey("")).toBeNull();
  });
  it("computes cost in cents for a known model", () => {
    // gpt-4o-mini: $0.15/M in, $0.60/M out.
    // 1,000,000 in + 1,000,000 out = $0.75 = 75 cents.
    const r = costCentsFor("openai/gpt-4o-mini", 1_000_000, 1_000_000);
    expect(r.matched).toBe(true);
    expect(r.cents).toBeCloseTo(75, 4);
  });
  it("does not guess a price for an unknown model", () => {
    const r = costCentsFor("mystery-model", 1000, 1000);
    expect(r.matched).toBe(false);
    expect(r.cents).toBe(0);
  });
});

describe("extractMakeCost", () => {
  it("always returns the platform_unsupported sentinel", () => {
    expect(extractMakeCost()).toEqual({ unsupported: true });
  });
});

describe("extractN8nCost", () => {
  it("extracts a single LLM node from the llmCalls envelope", () => {
    const out = extractN8nCost({
      totalTokenUsage: { promptTokens: 1000, completionTokens: 2000, totalTokens: 3000 },
      llmCalls: [
        {
          nodeName: "OpenAI Chat Model",
          model: "openai/gpt-4o-mini",
          tokenUsage: { promptTokens: 1000, completionTokens: 2000, totalTokens: 3000 },
        },
      ],
    });
    expect(out.breakdown).toHaveLength(1);
    expect(out.breakdown[0]!.node).toBe("OpenAI Chat Model");
    expect(out.breakdown[0]!.isLlm).toBe(true);
    // 1000 in @0.15/M + 2000 out @0.60/M = 0.00015 + 0.0012 = 0.00135 USD = 0.135 cents
    expect(out.breakdown[0]!.cents).toBeCloseTo(0.135, 4);
    expect(out.warnings).toHaveLength(0);
  });
  it("sums three LLM nodes across different models", () => {
    const out = extractN8nCost({
      llmCalls: [
        { nodeName: "a", model: "openai/gpt-4o-mini", tokenUsage: { promptTokens: 1_000_000, completionTokens: 1_000_000, totalTokens: 2_000_000 } },
        { nodeName: "b", model: "gpt-4o", tokenUsage: { promptTokens: 1_000_000, completionTokens: 0, totalTokens: 1_000_000 } },
        { nodeName: "c", model: "claude-sonnet-4-5-20250929", tokenUsage: { promptTokens: 0, completionTokens: 1_000_000, totalTokens: 1_000_000 } },
      ],
    });
    expect(out.breakdown).toHaveLength(3);
    // 75 + 250 + 1500 = 1825 cents
    expect(out.total_cents).toBe(1825);
  });
  it("finds a deeply nested standalone tokenUsage with a sibling model", () => {
    const out = extractN8nCost({
      data: { main: [[{ json: { response: { model: "gpt-4o", tokenUsage: { promptTokens: 1_000_000, completionTokens: 0, totalTokens: 1_000_000 } } } }]] },
    });
    expect(out.total_cents).toBe(250);
    expect(out.breakdown[0]!.isLlm).toBe(true);
  });
  it("records a warning and zero cost when token usage has an unpriced model", () => {
    const out = extractN8nCost({
      llmCalls: [{ nodeName: "x", model: "llama-3-70b", tokenUsage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 } }],
    });
    expect(out.total_cents).toBe(0);
    expect(out.warnings.some((w) => w.includes("unpriced_model"))).toBe(true);
    expect(out.breakdown[0]!.cents).toBe(0);
  });
  it("flags estimated token usage with a warning", () => {
    const out = extractN8nCost({
      tokenUsageEstimate: { promptTokens: 1_000_000, completionTokens: 0, totalTokens: 1_000_000 },
      model: "gpt-4o",
    });
    expect(out.total_cents).toBe(250);
    expect(out.warnings.some((w) => w.includes("estimate"))).toBe(true);
  });
  it("returns a clean zero when there is no LLM activity", () => {
    const out = extractN8nCost({ result: "ok", items: [1, 2, 3] });
    expect(out.total_cents).toBe(0);
    expect(out.breakdown).toHaveLength(0);
    expect(out.warnings).toHaveLength(0);
  });
  it("handles null output without throwing", () => {
    const out = extractN8nCost(null);
    expect(out.total_cents).toBe(0);
  });
});

describe("evaluateCostUnderCents", () => {
  const n8nOut = {
    llmCalls: [
      { nodeName: "a", model: "openai/gpt-4o-mini", tokenUsage: { promptTokens: 1_000_000, completionTokens: 1_000_000, totalTokens: 2_000_000 } },
    ],
  };

  it("passes when n8n cost is at or under the limit", () => {
    const r = evaluateCostUnderCents({ max_cents: 100 }, n8nOut, "n8n");
    expect(r.passed).toBe(true);
    expect(r.details).toBeTruthy();
  });
  it("fails when n8n cost exceeds the limit", () => {
    const r = evaluateCostUnderCents({ max_cents: 10 }, n8nOut, "n8n");
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/75/);
  });
  it("returns platform_unsupported warn for Make scenarios", () => {
    const r = evaluateCostUnderCents({ max_cents: 100 }, { x: 1 }, "make");
    expect(r.passed).toBe(false);
    expect(r.reason).toBe("platform_unsupported");
    expect(r.forceWarn).toBe(true);
    expect(r.message).toMatch(/Make/);
  });
  it("treats an undefined platform as unsupported, not n8n", () => {
    const r = evaluateCostUnderCents({ max_cents: 100 }, n8nOut, undefined);
    expect(r.reason).toBe("platform_unsupported");
    expect(r.forceWarn).toBe(true);
  });
  it("warns (not fails) when cost is indeterminate due to extractor warnings", () => {
    const r = evaluateCostUnderCents(
      { max_cents: 100 },
      { llmCalls: [{ nodeName: "x", model: "llama-3-70b", tokenUsage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 } }] },
      "n8n",
    );
    expect(r.passed).toBe(false);
    expect(r.reason).toBe("cost_indeterminate");
    expect(r.forceWarn).toBe(true);
  });
  it("passes with a clean zero when there is genuinely no LLM cost", () => {
    const r = evaluateCostUnderCents({ max_cents: 1 }, { ok: true }, "n8n");
    expect(r.passed).toBe(true);
  });
  it("respects scope=llm_only", () => {
    const r = evaluateCostUnderCents(
      { max_cents: 100, scope: "llm_only" },
      n8nOut,
      "n8n",
    );
    expect(r.passed).toBe(true);
  });
  it("fails on misconfiguration: negative max_cents", () => {
    expect(evaluateCostUnderCents({ max_cents: -1 }, n8nOut, "n8n").passed).toBe(false);
  });
  it("fails on misconfiguration: max_cents over the ceiling", () => {
    expect(
      evaluateCostUnderCents({ max_cents: 100_001 }, n8nOut, "n8n").passed,
    ).toBe(false);
  });
  it("fails on misconfiguration: invalid scope", () => {
    expect(
      evaluateCostUnderCents(
        { max_cents: 100, scope: "bogus" as "total" },
        n8nOut,
        "n8n",
      ).passed,
    ).toBe(false);
  });
});
