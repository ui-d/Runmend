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

/**
 * PR #1 evaluator covers assertion types 1-4 (json_schema_valid,
 * field_present, field_matches, field_in_set). Types 5-7 (llm_judge,
 * latency_under_ms, cost_under_cents) land in PR #2 — until then they
 * record as a non-fatal "unsupported" outcome so a misconfigured DB row
 * does not crash a run.
 */
export function evaluateAssertion(
  assertion: Pick<AssertionRow, "id" | "assertion_type" | "config" | "severity">,
  ctx: ExecutionContext,
): SingleAssertionOutcome {
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
    case "llm_judge":
    case "latency_under_ms":
    case "cost_under_cents":
      return {
        assertion_id: assertion.id,
        assertion_type: type,
        passed: true,
        severity,
        message: `Assertion type "${type}" is not yet supported in PR #1; skipped`,
      };
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
export function evaluateAllAssertions(
  assertions: ReadonlyArray<
    Pick<AssertionRow, "id" | "assertion_type" | "config" | "severity">
  >,
  ctx: ExecutionContext,
): { passed: boolean; outcomes: SingleAssertionOutcome[] } {
  const outcomes = assertions.map((a) => evaluateAssertion(a, ctx));
  const passed = outcomes.every((o) => o.passed || o.severity === "warn");
  return { passed, outcomes };
}
