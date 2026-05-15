import type { Json } from "@/lib/database.types";
import { JUDGE_MAX_PROMPT_CHARS } from "@/lib/preflight/limits";

export interface BuildJudgeArgs {
  criterion: string;
  output: Json | null;
  baselineOutput?: Json | null;
}

export type BuildJudgeResult =
  | { ok: true; prompt: string }
  | { ok: false; error: string };

function serialize(value: Json | null): string {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return String(value);
  }
}

/**
 * Build the LLM-judge prompt. Patterned on
 * `src/lib/diagnostic/enhanced-prompt.ts`: a plain, operational instruction
 * that forces a strict JSON object so the response is machine-parseable.
 * Returns an error (rather than silently truncating) when the serialized
 * output would push the prompt past `JUDGE_MAX_PROMPT_CHARS`.
 */
export function buildJudgePrompt(args: BuildJudgeArgs): BuildJudgeResult {
  const outputBlock = serialize(args.output);
  const hasBaseline =
    args.baselineOutput !== undefined && args.baselineOutput !== null;
  const baselineBlock = hasBaseline ? serialize(args.baselineOutput ?? null) : "";

  const baselineSection = hasBaseline
    ? `\nThis is how the workflow behaved BEFORE (baseline) — judge whether the new output is at least as good; flag regressions:\n\`\`\`json\n${baselineBlock}\n\`\`\`\n`
    : "";

  const prompt = `You are a strict quality judge for an automation workflow's output.

Criterion to evaluate against:
${args.criterion}

Workflow output to judge:
\`\`\`json
${outputBlock}
\`\`\`
${baselineSection}
Score how well the output satisfies the criterion on a 0-100 integer scale
(0 = fails completely, 100 = perfectly satisfies it).

Respond with ONLY a JSON object with exactly these fields:
- "score": integer 0-100.
- "reasoning": 2-4 plain sentences explaining the score. No preamble.
- "confidence": one of "high", "medium", "low" — your confidence in this
  judgement given how clear the output and criterion are.

No markdown fences, no extra text — only the JSON object.`;

  if (prompt.length > JUDGE_MAX_PROMPT_CHARS) {
    return {
      ok: false,
      error: `Judge prompt too large (${prompt.length} chars, limit ${JUDGE_MAX_PROMPT_CHARS}). Reduce the workflow output size.`,
    };
  }
  return { ok: true, prompt };
}
