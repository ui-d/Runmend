import { z } from "zod";
import { withBackoff } from "@/lib/platform-adapters/retry";
import { costCentsFor } from "@/lib/preflight/cost/pricing-table";
import { JUDGE_MAX_OUTPUT_TOKENS } from "@/lib/preflight/limits";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

const JUDGE_SYSTEM =
  "You are a strict, fair quality judge. You respond with ONLY a valid JSON " +
  "object — no markdown fences, no extra text. Keep reasoning plain and " +
  "operational, no marketing tone.";

export interface JudgeResult {
  score: number;
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

const judgeResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasoning: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
});

interface AnthropicCreateParams {
  model: string;
  max_tokens: number;
  system: string;
  messages: Array<{ role: "user"; content: string }>;
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

/** Minimal surface of the Anthropic SDK we depend on (also satisfied by the test mock). */
export interface AnthropicLike {
  messages: { create(params: AnthropicCreateParams): Promise<AnthropicResponse> };
}

export interface RunJudgeOutput {
  evaluation: JudgeResult | null;
  costCents: number;
  error?: string;
}

function parseJudgeText(text: string): JudgeResult | null {
  const raw = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  try {
    const parsed = judgeResultSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Call Claude to score an output against a criterion. Anthropic wiring mirrors
 * `src/app/api/diagnostic/route.ts` (model from `CLAUDE_MODEL`, JSON-only
 * system, fence-strip + parse). The call is wrapped in `withBackoff` (the
 * documented SDK-call retry helper). Never throws: transport and parse
 * failures return a structured error so a single bad input cannot crash a run.
 * Token cost is computed from `usage` so it can roll into the run total.
 */
export async function runJudge(
  client: AnthropicLike,
  prompt: string,
  model: string = process.env.CLAUDE_MODEL ?? DEFAULT_MODEL,
): Promise<RunJudgeOutput> {
  let response: AnthropicResponse;
  try {
    response = await withBackoff(() =>
      client.messages.create({
        model,
        max_tokens: JUDGE_MAX_OUTPUT_TOKENS,
        system: JUDGE_SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
    );
  } catch (err: unknown) {
    return {
      evaluation: null,
      costCents: 0,
      error: err instanceof Error ? err.message : "Judge transport failed",
    };
  }

  const usage = response.usage;
  const costCents = usage
    ? costCentsFor(model, usage.input_tokens, usage.output_tokens).cents
    : 0;

  const textPart = response.content.find((c) => c.type === "text");
  const text = textPart?.text;
  if (!text) {
    return { evaluation: null, costCents, error: "Judge returned no text" };
  }
  const evaluation = parseJudgeText(text);
  if (!evaluation) {
    return {
      evaluation: null,
      costCents,
      error: "Judge response was not valid JSON in the required shape",
    };
  }
  return { evaluation, costCents };
}
