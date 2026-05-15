import type { Json } from "@/lib/database.types";
import { llmJudgeConfigSchema } from "@/lib/validation/preflight-schemas";
import { buildJudgePrompt } from "../judge/prompt";
import { runJudge, type AnthropicLike } from "../judge/client";

export interface LlmJudgeConfig {
  criterion: string;
  min_score?: number;
  baseline_run_id?: string;
}

/**
 * Injected via the executor's DI seam. `getBaselineResult` is pre-bound by
 * the executor to the current input so the assertion stays simple.
 */
export interface JudgeDeps {
  client: AnthropicLike;
  getBaselineResult: (baselineRunId: string) => Promise<Json | null>;
}

export interface JudgeEvaluation {
  passed: boolean;
  message: string | null;
  reason?: string;
  /** Forces the dispatcher to record this as a warn regardless of config. */
  forceWarn?: boolean;
  details?: Json;
  /** Token cost of the judge call, rolled into the run total by the executor. */
  costCents?: number;
}

function warn(reason: string, message: string, costCents = 0): JudgeEvaluation {
  return { passed: false, forceWarn: true, reason, message, costCents };
}

/**
 * Assertion type 7: `llm_judge` — the quality/drift signal.
 *
 * Scores the workflow output against `criterion` (optionally comparing to a
 * baseline run's output for the same input). Passes iff
 * `score >= min_score` AND confidence is not "low". Low confidence records a
 * non-failing warn (avoids noise on ambiguous outputs). Missing deps,
 * oversize prompt, transport, or parse failures all degrade to a non-fatal
 * warn — a single bad input never crashes a run.
 */
export async function evaluateLlmJudge(
  config: LlmJudgeConfig,
  output: Json | null,
  deps: JudgeDeps | undefined,
): Promise<JudgeEvaluation> {
  const parsed = llmJudgeConfigSchema.safeParse(config);
  if (!parsed.success) {
    return {
      passed: false,
      message: `Assertion misconfigured: ${parsed.error.issues[0]?.message ?? "invalid llm_judge config"}`,
    };
  }
  const { criterion, min_score, baseline_run_id } = parsed.data;

  if (!deps) {
    return warn(
      "judge_unavailable",
      "LLM judge is not configured for this run (no API key); recorded as a warning.",
    );
  }

  let baselineOutput: Json | null | undefined;
  if (baseline_run_id) {
    try {
      baselineOutput = await deps.getBaselineResult(baseline_run_id);
    } catch {
      baselineOutput = null;
    }
  }

  const built = buildJudgePrompt({ criterion, output, baselineOutput });
  if (!built.ok) {
    return warn("judge_prompt_too_large", built.error);
  }

  const res = await runJudge(deps.client, built.prompt);
  if (!res.evaluation) {
    return warn(
      "judge_unavailable",
      `Judge call failed: ${res.error ?? "unparseable response"}.`,
      res.costCents,
    );
  }

  const { score, reasoning, confidence } = res.evaluation;
  const details: Json = { score, reasoning, confidence };

  if (confidence === "low") {
    return {
      passed: false,
      forceWarn: true,
      reason: "judge_low_confidence",
      message: `Judge low confidence (score ${score}); recorded as a warning. ${reasoning}`,
      details,
      costCents: res.costCents,
    };
  }

  const passed = score >= min_score;
  return {
    passed,
    message: passed
      ? null
      : `Judge score ${score} below threshold ${min_score}. ${reasoning}`,
    details,
    costCents: res.costCents,
  };
}
