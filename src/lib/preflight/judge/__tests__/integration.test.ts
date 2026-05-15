import { describe, it, expect } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { buildJudgePrompt } from "@/lib/preflight/judge/prompt";
import { runJudge, type AnthropicLike } from "@/lib/preflight/judge/client";

/**
 * Real-API integration test for the LLM judge. Skipped in CI and by default;
 * run locally with:
 *
 *   RUN_INTEGRATION_TESTS=true ANTHROPIC_API_KEY=sk-... npx vitest run \
 *     src/lib/preflight/judge/__tests__/integration.test.ts
 *
 * It makes ONE small real Claude call and asserts the response conforms to
 * the JudgeResult schema (the contract the rest of the system relies on).
 */
const RUN = process.env.RUN_INTEGRATION_TESTS === "true";

describe.skipIf(!RUN)("llm_judge real-API integration", () => {
  it("returns a schema-valid judgement for a tiny fixture", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    expect(apiKey, "ANTHROPIC_API_KEY required for integration test").toBeTruthy();

    const client = new Anthropic({ apiKey }) as unknown as AnthropicLike;
    const built = buildJudgePrompt({
      criterion: "The reply politely greets the customer by saying hello.",
      output: { reply: "Hello! How can I help you today?" },
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const res = await runJudge(client, built.prompt);
    expect(res.error).toBeUndefined();
    expect(res.evaluation).not.toBeNull();
    expect(res.evaluation!.score).toBeGreaterThanOrEqual(0);
    expect(res.evaluation!.score).toBeLessThanOrEqual(100);
    expect(["high", "medium", "low"]).toContain(res.evaluation!.confidence);
    expect(typeof res.evaluation!.reasoning).toBe("string");
    expect(res.costCents).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.info(
      `[integration] judge cost: ${res.costCents.toFixed(4)}¢ score=${res.evaluation!.score}`,
    );
  }, 30_000);
});
