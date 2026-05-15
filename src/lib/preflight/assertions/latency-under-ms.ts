import type { Json } from "@/lib/database.types";
import { latencyUnderMsConfigSchema } from "@/lib/validation/preflight-schemas";
import type { AssertionEvaluation } from "./json-schema";

export interface LatencyUnderMsConfig {
  max_ms: number;
}

export interface LatencyEvaluation extends AssertionEvaluation {
  /** `{ latency_ms, max_ms }` so the UI can render an actual-vs-limit bar. */
  details?: Json;
}

/**
 * Assertion type 5: `latency_under_ms`.
 *
 * Passes iff the recorded wall-clock latency for the input is at or under
 * `config.max_ms`. The executor already records `latency_ms` per input, so
 * no new data is needed. A `null` latency (run never observed) fails rather
 * than silently passing. The failure message is written for a non-engineer
 * agency operator: "Took 1240ms, limit 800ms (55% over)".
 */
export function evaluateLatencyUnderMs(
  config: LatencyUnderMsConfig,
  latencyMs: number | null,
): LatencyEvaluation {
  const parsed = latencyUnderMsConfigSchema.safeParse(config);
  if (!parsed.success) {
    return {
      passed: false,
      message: `Assertion misconfigured: ${parsed.error.issues[0]?.message ?? "invalid latency_under_ms config"}`,
    };
  }
  const { max_ms } = parsed.data;
  const details: Json = { latency_ms: latencyMs, max_ms };

  if (latencyMs === null) {
    return {
      passed: false,
      message: "Latency was not recorded for this run; cannot evaluate.",
      details,
    };
  }
  if (latencyMs <= max_ms) {
    return { passed: true, message: null, details };
  }
  const overPct = Math.round(((latencyMs - max_ms) / max_ms) * 100);
  return {
    passed: false,
    message: `Took ${latencyMs}ms, limit ${max_ms}ms (${overPct}% over)`,
    details,
  };
}
