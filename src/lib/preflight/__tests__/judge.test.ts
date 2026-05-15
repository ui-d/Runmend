import { describe, it, expect, beforeEach } from "vitest";
import { buildJudgePrompt } from "@/lib/preflight/judge/prompt";
import { runJudge } from "@/lib/preflight/judge/client";
import { evaluateLlmJudge } from "@/lib/preflight/assertions/llm-judge";
import { createAnthropicMock, type AnthropicMock } from "@/test/anthropic-mock";

const CRITERION = "The reply is polite and answers the customer question.";

describe("buildJudgePrompt", () => {
  it("includes the criterion, the output, and strict JSON instructions", () => {
    const r = buildJudgePrompt({ criterion: CRITERION, output: { reply: "Hi!" } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.prompt).toContain(CRITERION);
    expect(r.prompt).toContain("Hi!");
    expect(r.prompt).toMatch(/score/i);
    expect(r.prompt).toMatch(/confidence/i);
    expect(r.prompt).not.toMatch(/this is how the workflow behaved before/i);
  });
  it("adds a baseline comparison section when baselineOutput is provided", () => {
    const r = buildJudgePrompt({
      criterion: CRITERION,
      output: { reply: "new" },
      baselineOutput: { reply: "old" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.prompt).toMatch(/before/i);
    expect(r.prompt).toContain("old");
  });
  it("rejects an output that would exceed the prompt size cap", () => {
    const huge = { blob: "x".repeat(40_000) };
    const r = buildJudgePrompt({ criterion: CRITERION, output: huge });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/too large/i);
  });
});

describe("runJudge", () => {
  let mock: AnthropicMock;
  beforeEach(() => {
    mock = createAnthropicMock();
  });

  it("parses a valid JSON judgement and prices the call from usage", async () => {
    mock.create.mockResolvedValue(
      mock.scriptResponse(
        JSON.stringify({ score: 85, reasoning: "Clear and polite.", confidence: "high" }),
      ),
    );
    const out = await runJudge(mock.client, "prompt");
    expect(out.evaluation).toEqual({
      score: 85,
      reasoning: "Clear and polite.",
      confidence: "high",
    });
    // claude-sonnet-4-5 default: 100 in @ $3/M + 200 out @ $15/M = 0.33 cents
    expect(out.costCents).toBeCloseTo(0.33, 4);
    expect(out.error).toBeUndefined();
  });
  it("strips markdown fences before parsing", async () => {
    mock.create.mockResolvedValue(
      mock.scriptResponse(
        '```json\n{"score":50,"reasoning":"meh","confidence":"medium"}\n```',
      ),
    );
    const out = await runJudge(mock.client, "prompt");
    expect(out.evaluation?.score).toBe(50);
  });
  it("returns a structured error (not a throw) on malformed JSON", async () => {
    mock.create.mockResolvedValue(mock.scriptResponse("not json at all"));
    const out = await runJudge(mock.client, "prompt");
    expect(out.evaluation).toBeNull();
    expect(out.error).toBeTruthy();
  });
  it("returns a structured error (not a throw) when the transport fails", async () => {
    mock.create.mockRejectedValue(new Error("network down"));
    const out = await runJudge(mock.client, "prompt");
    expect(out.evaluation).toBeNull();
    expect(out.error).toMatch(/network down/);
  });
  it("rejects an out-of-range score as malformed", async () => {
    mock.create.mockResolvedValue(
      mock.scriptResponse(JSON.stringify({ score: 150, reasoning: "x", confidence: "high" })),
    );
    const out = await runJudge(mock.client, "prompt");
    expect(out.evaluation).toBeNull();
  });
});

describe("evaluateLlmJudge", () => {
  let mock: AnthropicMock;
  const deps = (m: AnthropicMock, baseline: unknown = null) => ({
    client: m.client,
    getBaselineResult: async () => baseline as never,
  });
  beforeEach(() => {
    mock = createAnthropicMock();
  });

  function script(score: number, confidence = "high", reasoning = "ok") {
    mock.create.mockResolvedValue(
      mock.scriptResponse(JSON.stringify({ score, reasoning, confidence })),
    );
  }

  it("passes when score >= min_score and confidence is not low", async () => {
    script(85);
    const r = await evaluateLlmJudge({ criterion: CRITERION }, { reply: "hi" }, deps(mock));
    expect(r.passed).toBe(true);
    expect(r.costCents).toBeGreaterThan(0);
  });
  it("passes at the exact threshold (score === min_score)", async () => {
    script(70);
    const r = await evaluateLlmJudge(
      { criterion: CRITERION, min_score: 70 },
      {},
      deps(mock),
    );
    expect(r.passed).toBe(true);
  });
  it("fails when score is below min_score", async () => {
    script(69);
    const r = await evaluateLlmJudge(
      { criterion: CRITERION, min_score: 70 },
      {},
      deps(mock),
    );
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/69/);
  });
  it("warns (not fails) on low confidence even with a high score", async () => {
    script(95, "low");
    const r = await evaluateLlmJudge({ criterion: CRITERION }, {}, deps(mock));
    expect(r.passed).toBe(false);
    expect(r.forceWarn).toBe(true);
    expect(r.reason).toBe("judge_low_confidence");
  });
  it("fetches and includes the baseline when baseline_run_id is set", async () => {
    script(80);
    let called = "";
    const r = await evaluateLlmJudge(
      { criterion: CRITERION, baseline_run_id: "123e4567-e89b-12d3-a456-426614174000" },
      { reply: "new" },
      {
        client: mock.client,
        getBaselineResult: async (id: string) => {
          called = id;
          return { reply: "old" };
        },
      },
    );
    expect(called).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(r.passed).toBe(true);
    const sentPrompt = mock.create.mock.calls[0]![0].messages[0].content as string;
    expect(sentPrompt).toContain("old");
  });
  it("returns a non-fatal warn when judge deps are not configured", async () => {
    const r = await evaluateLlmJudge({ criterion: CRITERION }, {}, undefined);
    expect(r.passed).toBe(false);
    expect(r.forceWarn).toBe(true);
    expect(r.reason).toBe("judge_unavailable");
  });
  it("never throws when the client fails — returns a warn", async () => {
    mock.create.mockRejectedValue(new Error("boom"));
    const r = await evaluateLlmJudge({ criterion: CRITERION }, {}, deps(mock));
    expect(r.passed).toBe(false);
    expect(r.forceWarn).toBe(true);
    expect(r.reason).toBe("judge_unavailable");
  });
  it("warns when the judge response is unparseable", async () => {
    mock.create.mockResolvedValue(mock.scriptResponse("garbage"));
    const r = await evaluateLlmJudge({ criterion: CRITERION }, {}, deps(mock));
    expect(r.passed).toBe(false);
    expect(r.forceWarn).toBe(true);
  });
  it("fails misconfiguration: criterion too short", async () => {
    const r = await evaluateLlmJudge({ criterion: "short" }, {}, deps(mock));
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/misconfigured/i);
  });
  it("fails misconfiguration: min_score out of range", async () => {
    const r = await evaluateLlmJudge(
      { criterion: CRITERION, min_score: 250 },
      {},
      deps(mock),
    );
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/misconfigured/i);
  });
});
