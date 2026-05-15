import type { Json } from "@/lib/database.types";
import type {
  AssertionRow,
  AssertionType,
  ExecutionContext,
  SingleAssertionOutcome,
} from "@/lib/preflight/types";
import {
  evaluateJsonSchema,
  type JsonSchemaConfig,
} from "./json-schema";
import {
  evaluateFieldPresent,
  type FieldPresentConfig,
} from "./field-present";
import {
  evaluateFieldMatches,
  type FieldMatchesConfig,
} from "./field-matches";
import { evaluateFieldInSet, type FieldInSetConfig } from "./field-in-set";
import {
  evaluateLatencyUnderMs,
  type LatencyUnderMsConfig,
} from "./latency-under-ms";
import {
  evaluateCostUnderCents,
  type CostUnderCentsConfig,
} from "./cost-under-cents";
import {
  evaluateLlmJudge,
  type LlmJudgeConfig,
  type JudgeDeps,
} from "./llm-judge";

/**
 * Assertion router for all 7 types. Types 1-6 evaluate synchronously in
 * runtime (the function is async only so `llm_judge` can do I/O — the
 * synchronous evaluators are still called directly, not wrapped in a
 * needless `Promise.resolve`). `llm_judge` awaits an injected Claude client
 * (`ctx.judge`); when judge deps are absent it degrades to a non-fatal warn
 * so a run never crashes on a missing API key.
 */
export async function evaluateAssertion(
  assertion: Pick<AssertionRow, "id" | "assertion_type" | "config" | "severity">,
  ctx: ExecutionContext,
): Promise<SingleAssertionOutcome> {
  const type = assertion.assertion_type as AssertionType;
  const config = (assertion.config ?? {}) as Record<string, Json>;
  const severity = (assertion.severity === "warn" ? "warn" : "fail") as
    | "fail"
    | "warn";

  switch (type) {
    case "json_schema_valid": {
      const result = evaluateJsonSchema(config as unknown as JsonSchemaConfig, ctx.output);
      return {
        assertion_id: assertion.id,
        assertion_type: type,
        passed: result.passed,
        severity,
        message: result.message,
      };
    }
    case "field_present": {
      const result = evaluateFieldPresent(
        config as unknown as FieldPresentConfig,
        ctx.output,
      );
      return {
        assertion_id: assertion.id,
        assertion_type: type,
        passed: result.passed,
        severity,
        message: result.message,
      };
    }
    case "field_matches": {
      const result = evaluateFieldMatches(
        config as unknown as FieldMatchesConfig,
        ctx.output,
      );
      return {
        assertion_id: assertion.id,
        assertion_type: type,
        passed: result.passed,
        severity,
        message: result.message,
      };
    }
    case "field_in_set": {
      const result = evaluateFieldInSet(
        config as unknown as FieldInSetConfig,
        ctx.output,
      );
      return {
        assertion_id: assertion.id,
        assertion_type: type,
        passed: result.passed,
        severity,
        message: result.message,
      };
    }
    case "latency_under_ms": {
      const result = evaluateLatencyUnderMs(
        config as unknown as LatencyUnderMsConfig,
        ctx.latency_ms,
      );
      return {
        assertion_id: assertion.id,
        assertion_type: type,
        passed: result.passed,
        severity,
        message: result.message,
      };
    }
    case "cost_under_cents": {
      const result = evaluateCostUnderCents(
        config as unknown as CostUnderCentsConfig,
        ctx.output,
        ctx.platform,
      );
      return {
        assertion_id: assertion.id,
        assertion_type: type,
        passed: result.passed,
        // Product-gap outcomes never fail a run, regardless of config.
        severity: result.forceWarn ? "warn" : severity,
        message: result.message,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.details !== undefined ? { details: result.details } : {}),
      };
    }
    case "llm_judge": {
      const result = await evaluateLlmJudge(
        config as unknown as LlmJudgeConfig,
        ctx.output,
        ctx.judge as JudgeDeps | undefined,
      );
      return {
        assertion_id: assertion.id,
        assertion_type: type,
        passed: result.passed,
        // Judge degradations (no key, low confidence, transport) never fail.
        severity: result.forceWarn ? "warn" : severity,
        message: result.message,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.details !== undefined ? { details: result.details } : {}),
        ...(result.costCents !== undefined
          ? { costCents: result.costCents }
          : {}),
      };
    }
    default:
      return {
        assertion_id: assertion.id,
        assertion_type: type,
        passed: false,
        severity,
        message: `Unknown assertion type: ${String(type)}`,
      };
  }
}

/**
 * Run every assertion against an output. The input is considered passed
 * only when every `severity='fail'` assertion passes; warnings record but
 * do not fail the input.
 */
export async function evaluateAllAssertions(
  assertions: ReadonlyArray<
    Pick<AssertionRow, "id" | "assertion_type" | "config" | "severity">
  >,
  ctx: ExecutionContext,
): Promise<{ passed: boolean; outcomes: SingleAssertionOutcome[] }> {
  const outcomes = await Promise.all(
    assertions.map((a) => evaluateAssertion(a, ctx)),
  );
  const passed = outcomes.every((o) => o.passed || o.severity === "warn");
  return { passed, outcomes };
}
