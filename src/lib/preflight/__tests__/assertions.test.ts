import { describe, it, expect } from "vitest";
import {
  evaluateAssertion,
  evaluateAllAssertions,
} from "@/lib/preflight/assertions";
import { evaluateJsonSchema } from "@/lib/preflight/assertions/json-schema";
import { evaluateFieldPresent } from "@/lib/preflight/assertions/field-present";
import { evaluateFieldMatches } from "@/lib/preflight/assertions/field-matches";
import { evaluateFieldInSet } from "@/lib/preflight/assertions/field-in-set";
import { evaluateLatencyUnderMs } from "@/lib/preflight/assertions/latency-under-ms";
import { readPath, MISSING } from "@/lib/preflight/assertions/field-access";
import { makeAssertion } from "@/test/factories";

describe("readPath", () => {
  it("returns the value at a top-level field", () => {
    expect(readPath({ a: 1 }, "a")).toBe(1);
  });
  it("returns nested values via dot path", () => {
    expect(readPath({ a: { b: { c: "x" } } }, "a.b.c")).toBe("x");
  });
  it("returns MISSING for absent fields", () => {
    expect(readPath({ a: 1 }, "b")).toBe(MISSING);
  });
  it("supports array indexing", () => {
    expect(readPath({ items: [{ name: "a" }] }, "items.0.name")).toBe("a");
  });
  it("returns MISSING for out-of-range array indexes", () => {
    expect(readPath({ items: [1, 2] }, "items.5")).toBe(MISSING);
  });
  it("returns MISSING when traversing into a non-object", () => {
    expect(readPath({ a: 1 }, "a.b")).toBe(MISSING);
  });
  it("returns the root for empty path", () => {
    expect(readPath({ a: 1 }, "")).toEqual({ a: 1 });
  });
  it("returns MISSING when root is null", () => {
    expect(readPath(null, "a")).toBe(MISSING);
  });
  it("returns MISSING for non-numeric array index segment", () => {
    expect(readPath({ items: [1, 2] }, "items.abc")).toBe(MISSING);
  });
});

describe("evaluateJsonSchema", () => {
  it("passes valid output against simple schema", () => {
    const result = evaluateJsonSchema(
      { schema: { type: "object", required: ["a"], properties: { a: { type: "string" } } } },
      { a: "hi" },
    );
    expect(result.passed).toBe(true);
  });
  it("fails when output violates schema", () => {
    const result = evaluateJsonSchema(
      { schema: { type: "object", required: ["a"] } },
      { b: 1 },
    );
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/required|a/);
  });
  it("fails when output is null", () => {
    const result = evaluateJsonSchema({ schema: { type: "object" } }, null);
    expect(result.passed).toBe(false);
  });
  it("returns a clean fallback when schema compilation throws", () => {
    const result = evaluateJsonSchema(
      { schema: { type: "object", properties: { a: { type: "bogus" as unknown as string } } } },
      { a: "hi" },
    );
    expect(result.passed).toBe(false);
    expect(result.message).toBeTruthy();
  });
});

describe("evaluateFieldPresent", () => {
  it("passes when the field exists with a non-empty value", () => {
    expect(evaluateFieldPresent({ field: "a" }, { a: "x" })).toEqual({
      passed: true,
      message: null,
    });
  });
  it("fails when the field is missing", () => {
    const r = evaluateFieldPresent({ field: "a" }, { b: 1 });
    expect(r.passed).toBe(false);
  });
  it("fails when the field is null", () => {
    const r = evaluateFieldPresent({ field: "a" }, { a: null });
    expect(r.passed).toBe(false);
  });
  it("fails when the field is an empty string", () => {
    const r = evaluateFieldPresent({ field: "a" }, { a: "" });
    expect(r.passed).toBe(false);
  });
  it("fails on misconfiguration", () => {
    const r = evaluateFieldPresent({ field: "" }, { a: 1 });
    expect(r.passed).toBe(false);
  });
});

describe("evaluateJsonSchema fallback paths", () => {
  it("handles empty errors array gracefully", () => {
    // Use a schema that always passes, so errors stays null
    const r = evaluateJsonSchema({ schema: { type: "string" } }, "ok");
    expect(r.passed).toBe(true);
  });
});

describe("evaluateFieldMatches", () => {
  it("returns false when comparing string vs number with equals", () => {
    const r = evaluateFieldMatches({ field: "a", equals: "5" }, { a: 5 });
    expect(r.passed).toBe(false);
  });

  it("returns false when array vs object differ via JSON compare", () => {
    const r = evaluateFieldMatches(
      { field: "a", equals: [1, 2, 3] },
      { a: { 0: 1, 1: 2, 2: 3 } },
    );
    expect(r.passed).toBe(false);
  });

  it("passes when regex matches", () => {
    const r = evaluateFieldMatches({ field: "a", pattern: "^h" }, { a: "hello" });
    expect(r.passed).toBe(true);
  });
  it("fails when regex does not match", () => {
    const r = evaluateFieldMatches({ field: "a", pattern: "^z" }, { a: "hello" });
    expect(r.passed).toBe(false);
  });
  it("fails when target field is not a string", () => {
    const r = evaluateFieldMatches({ field: "a", pattern: "^h" }, { a: 5 });
    expect(r.passed).toBe(false);
  });
  it("rejects invalid regex patterns", () => {
    const r = evaluateFieldMatches({ field: "a", pattern: "(" }, { a: "x" });
    expect(r.passed).toBe(false);
  });
  it("supports equals on primitives", () => {
    const r = evaluateFieldMatches({ field: "a", equals: 5 }, { a: 5 });
    expect(r.passed).toBe(true);
  });
  it("supports equals on objects via deep equality", () => {
    const r = evaluateFieldMatches(
      { field: "a", equals: { nested: 1 } },
      { a: { nested: 1 } },
    );
    expect(r.passed).toBe(true);
  });
  it("fails equals when objects differ", () => {
    const r = evaluateFieldMatches(
      { field: "a", equals: { nested: 1 } },
      { a: { nested: 2 } },
    );
    expect(r.passed).toBe(false);
  });
  it("fails when neither pattern nor equals is provided", () => {
    const r = evaluateFieldMatches({ field: "a" }, { a: 1 });
    expect(r.passed).toBe(false);
  });
  it("fails when field is missing", () => {
    const r = evaluateFieldMatches({ field: "missing", pattern: "x" }, { a: 1 });
    expect(r.passed).toBe(false);
  });
  it("fails on empty field name", () => {
    const r = evaluateFieldMatches({ field: "", pattern: "x" }, { a: 1 });
    expect(r.passed).toBe(false);
  });
});

describe("evaluateFieldInSet edge cases", () => {
  it("does not match when one side is null and the other is not", () => {
    const r = evaluateFieldInSet({ field: "a", values: [null, "x"] }, { a: "y" });
    expect(r.passed).toBe(false);
  });

  it("does not match across primitive type boundaries", () => {
    const r = evaluateFieldInSet({ field: "a", values: [5, 6] }, { a: "5" });
    expect(r.passed).toBe(false);
  });

  it("matches null exactly", () => {
    const r = evaluateFieldInSet({ field: "a", values: [null] }, { a: null });
    // Field-present-style guards: null is "missing" only when the path itself
    // resolves to undefined. Reading a present null returns null, which
    // matches the membership candidate.
    expect(r.passed).toBe(true);
  });
});

describe("evaluateFieldInSet", () => {
  it("passes when value is in the set", () => {
    const r = evaluateFieldInSet({ field: "a", values: ["x", "y", "z"] }, { a: "y" });
    expect(r.passed).toBe(true);
  });
  it("fails when value is not in the set", () => {
    const r = evaluateFieldInSet({ field: "a", values: ["x", "y"] }, { a: "z" });
    expect(r.passed).toBe(false);
  });
  it("supports object-equality membership via JSON compare", () => {
    const r = evaluateFieldInSet(
      { field: "a", values: [{ k: 1 }, { k: 2 }] },
      { a: { k: 2 } },
    );
    expect(r.passed).toBe(true);
  });
  it("fails when values is empty", () => {
    const r = evaluateFieldInSet({ field: "a", values: [] }, { a: "x" });
    expect(r.passed).toBe(false);
  });
  it("fails on empty field name", () => {
    const r = evaluateFieldInSet({ field: "", values: ["x"] }, { a: "x" });
    expect(r.passed).toBe(false);
  });
  it("fails when field is missing", () => {
    const r = evaluateFieldInSet({ field: "missing", values: ["x"] }, { a: "x" });
    expect(r.passed).toBe(false);
  });
});

describe("evaluateLatencyUnderMs", () => {
  it("passes when latency is under the limit", () => {
    expect(evaluateLatencyUnderMs({ max_ms: 800 }, 500)).toEqual({
      passed: true,
      message: null,
    });
  });
  it("passes at the exact boundary (latency === max_ms)", () => {
    expect(evaluateLatencyUnderMs({ max_ms: 800 }, 800)).toEqual({
      passed: true,
      message: null,
    });
  });
  it("fails when latency exceeds the limit with a human-readable overage", () => {
    const r = evaluateLatencyUnderMs({ max_ms: 800 }, 1240);
    expect(r.passed).toBe(false);
    expect(r.message).toBe("Took 1240ms, limit 800ms (55% over)");
  });
  it("fails when latency was not recorded (null)", () => {
    const r = evaluateLatencyUnderMs({ max_ms: 800 }, null);
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/not recorded/i);
  });
  it("fails on misconfiguration: zero max_ms", () => {
    expect(evaluateLatencyUnderMs({ max_ms: 0 }, 100).passed).toBe(false);
  });
  it("fails on misconfiguration: negative max_ms", () => {
    expect(evaluateLatencyUnderMs({ max_ms: -1 }, 100).passed).toBe(false);
  });
  it("fails on misconfiguration: non-integer max_ms", () => {
    expect(evaluateLatencyUnderMs({ max_ms: 1.5 }, 1).passed).toBe(false);
  });
  it("fails on misconfiguration: max_ms over the 600000 ceiling", () => {
    expect(evaluateLatencyUnderMs({ max_ms: 600_001 }, 1).passed).toBe(false);
  });
});

describe("evaluateAssertion dispatcher", () => {
  it("routes to json_schema_valid", () => {
    const a = makeAssertion({
      assertion_type: "json_schema_valid",
      config: { schema: { type: "string" } },
    });
    const out = evaluateAssertion(a, { output: "hi", latency_ms: 0, cost_cents: 0 });
    expect(out.passed).toBe(true);
    expect(out.assertion_type).toBe("json_schema_valid");
  });
  it("routes to field_present", () => {
    const a = makeAssertion({
      assertion_type: "field_present",
      config: { field: "x" },
    });
    const out = evaluateAssertion(a, {
      output: { x: 1 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.passed).toBe(true);
  });
  it("routes to field_matches", () => {
    const a = makeAssertion({
      assertion_type: "field_matches",
      config: { field: "x", equals: 1 },
    });
    const out = evaluateAssertion(a, {
      output: { x: 1 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.passed).toBe(true);
  });
  it("routes to field_in_set", () => {
    const a = makeAssertion({
      assertion_type: "field_in_set",
      config: { field: "x", values: [1, 2] },
    });
    const out = evaluateAssertion(a, {
      output: { x: 2 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.passed).toBe(true);
  });
  it("routes to latency_under_ms and reads ctx.latency_ms", () => {
    const a = makeAssertion({
      assertion_type: "latency_under_ms",
      config: { max_ms: 1000 },
    });
    const pass = evaluateAssertion(a, {
      output: {},
      latency_ms: 900,
      cost_cents: 0,
    });
    expect(pass.passed).toBe(true);
    expect(pass.assertion_type).toBe("latency_under_ms");
    const fail = evaluateAssertion(a, {
      output: {},
      latency_ms: 1500,
      cost_cents: 0,
    });
    expect(fail.passed).toBe(false);
  });
  it("routes to cost_under_cents for n8n and carries details", () => {
    const a = makeAssertion({
      assertion_type: "cost_under_cents",
      config: { max_cents: 100 },
    });
    const out = evaluateAssertion(a, {
      output: {
        llmCalls: [
          {
            nodeName: "n",
            model: "openai/gpt-4o-mini",
            tokenUsage: { promptTokens: 1000, completionTokens: 1000, totalTokens: 2000 },
          },
        ],
      },
      latency_ms: 0,
      cost_cents: 0,
      platform: "n8n",
    });
    expect(out.passed).toBe(true);
    expect(out.assertion_type).toBe("cost_under_cents");
    expect(out.details).toBeTruthy();
  });
  it("forces warn severity for cost_under_cents on a Make scenario", () => {
    const a = makeAssertion({
      assertion_type: "cost_under_cents",
      config: { max_cents: 100 },
      severity: "fail",
    });
    const out = evaluateAssertion(a, {
      output: { anything: 1 },
      latency_ms: 0,
      cost_cents: 0,
      platform: "make",
    });
    expect(out.passed).toBe(false);
    expect(out.severity).toBe("warn");
    expect(out.reason).toBe("platform_unsupported");
  });
  it("still returns a passed=true skipped result for not-yet-wired PR #2 types", () => {
    const a = makeAssertion({ assertion_type: "llm_judge", config: {} });
    const out = evaluateAssertion(a, { output: {}, latency_ms: 0, cost_cents: 0 });
    expect(out.passed).toBe(true);
    expect(out.message).toMatch(/not yet supported/);
  });
  it("normalizes invalid severity to 'fail'", () => {
    const a = makeAssertion({
      assertion_type: "field_present",
      config: { field: "x" },
      severity: "bogus" as "fail",
    });
    const out = evaluateAssertion(a, {
      output: { x: 1 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.severity).toBe("fail");
  });
  it("preserves explicit warn severity", () => {
    const a = makeAssertion({
      assertion_type: "field_present",
      config: { field: "missing" },
      severity: "warn",
    });
    const out = evaluateAssertion(a, {
      output: { x: 1 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.severity).toBe("warn");
    expect(out.passed).toBe(false);
  });
});

describe("evaluateAllAssertions", () => {
  it("passes when every fail-severity assertion passes", () => {
    const out = evaluateAllAssertions(
      [
        makeAssertion({
          id: "a1",
          assertion_type: "field_present",
          config: { field: "x" },
        }),
        makeAssertion({
          id: "a2",
          assertion_type: "field_matches",
          config: { field: "x", equals: 1 },
        }),
      ],
      { output: { x: 1 }, latency_ms: 0, cost_cents: 0 },
    );
    expect(out.passed).toBe(true);
    expect(out.outcomes).toHaveLength(2);
  });
  it("fails when any fail-severity assertion fails", () => {
    const out = evaluateAllAssertions(
      [
        makeAssertion({
          id: "a1",
          assertion_type: "field_present",
          config: { field: "x" },
        }),
        makeAssertion({
          id: "a2",
          assertion_type: "field_present",
          config: { field: "missing" },
        }),
      ],
      { output: { x: 1 }, latency_ms: 0, cost_cents: 0 },
    );
    expect(out.passed).toBe(false);
  });
  it("does not fail the input when only warn assertions fail", () => {
    const out = evaluateAllAssertions(
      [
        makeAssertion({
          id: "a1",
          assertion_type: "field_present",
          config: { field: "missing" },
          severity: "warn",
        }),
      ],
      { output: { x: 1 }, latency_ms: 0, cost_cents: 0 },
    );
    expect(out.passed).toBe(true);
  });
});
