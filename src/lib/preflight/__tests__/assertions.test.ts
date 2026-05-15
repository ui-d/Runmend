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
  it("returns the value at a top-level field", async () => {
    expect(readPath({ a: 1 }, "a")).toBe(1);
  });
  it("returns nested values via dot path", async () => {
    expect(readPath({ a: { b: { c: "x" } } }, "a.b.c")).toBe("x");
  });
  it("returns MISSING for absent fields", async () => {
    expect(readPath({ a: 1 }, "b")).toBe(MISSING);
  });
  it("supports array indexing", async () => {
    expect(readPath({ items: [{ name: "a" }] }, "items.0.name")).toBe("a");
  });
  it("returns MISSING for out-of-range array indexes", async () => {
    expect(readPath({ items: [1, 2] }, "items.5")).toBe(MISSING);
  });
  it("returns MISSING when traversing into a non-object", async () => {
    expect(readPath({ a: 1 }, "a.b")).toBe(MISSING);
  });
  it("returns the root for empty path", async () => {
    expect(readPath({ a: 1 }, "")).toEqual({ a: 1 });
  });
  it("returns MISSING when root is null", async () => {
    expect(readPath(null, "a")).toBe(MISSING);
  });
  it("returns MISSING for non-numeric array index segment", async () => {
    expect(readPath({ items: [1, 2] }, "items.abc")).toBe(MISSING);
  });
});

describe("evaluateJsonSchema", () => {
  it("passes valid output against simple schema", async () => {
    const result = evaluateJsonSchema(
      { schema: { type: "object", required: ["a"], properties: { a: { type: "string" } } } },
      { a: "hi" },
    );
    expect(result.passed).toBe(true);
  });
  it("fails when output violates schema", async () => {
    const result = evaluateJsonSchema(
      { schema: { type: "object", required: ["a"] } },
      { b: 1 },
    );
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/required|a/);
  });
  it("fails when output is null", async () => {
    const result = evaluateJsonSchema({ schema: { type: "object" } }, null);
    expect(result.passed).toBe(false);
  });
  it("returns a clean fallback when schema compilation throws", async () => {
    const result = evaluateJsonSchema(
      { schema: { type: "object", properties: { a: { type: "bogus" as unknown as string } } } },
      { a: "hi" },
    );
    expect(result.passed).toBe(false);
    expect(result.message).toBeTruthy();
  });
});

describe("evaluateFieldPresent", () => {
  it("passes when the field exists with a non-empty value", async () => {
    expect(evaluateFieldPresent({ field: "a" }, { a: "x" })).toEqual({
      passed: true,
      message: null,
    });
  });
  it("fails when the field is missing", async () => {
    const r = evaluateFieldPresent({ field: "a" }, { b: 1 });
    expect(r.passed).toBe(false);
  });
  it("fails when the field is null", async () => {
    const r = evaluateFieldPresent({ field: "a" }, { a: null });
    expect(r.passed).toBe(false);
  });
  it("fails when the field is an empty string", async () => {
    const r = evaluateFieldPresent({ field: "a" }, { a: "" });
    expect(r.passed).toBe(false);
  });
  it("fails on misconfiguration", async () => {
    const r = evaluateFieldPresent({ field: "" }, { a: 1 });
    expect(r.passed).toBe(false);
  });
});

describe("evaluateJsonSchema fallback paths", () => {
  it("handles empty errors array gracefully", async () => {
    // Use a schema that always passes, so errors stays null
    const r = evaluateJsonSchema({ schema: { type: "string" } }, "ok");
    expect(r.passed).toBe(true);
  });
});

describe("evaluateFieldMatches", () => {
  it("returns false when comparing string vs number with equals", async () => {
    const r = evaluateFieldMatches({ field: "a", equals: "5" }, { a: 5 });
    expect(r.passed).toBe(false);
  });

  it("returns false when array vs object differ via JSON compare", async () => {
    const r = evaluateFieldMatches(
      { field: "a", equals: [1, 2, 3] },
      { a: { 0: 1, 1: 2, 2: 3 } },
    );
    expect(r.passed).toBe(false);
  });

  it("passes when regex matches", async () => {
    const r = evaluateFieldMatches({ field: "a", pattern: "^h" }, { a: "hello" });
    expect(r.passed).toBe(true);
  });
  it("fails when regex does not match", async () => {
    const r = evaluateFieldMatches({ field: "a", pattern: "^z" }, { a: "hello" });
    expect(r.passed).toBe(false);
  });
  it("fails when target field is not a string", async () => {
    const r = evaluateFieldMatches({ field: "a", pattern: "^h" }, { a: 5 });
    expect(r.passed).toBe(false);
  });
  it("rejects invalid regex patterns", async () => {
    const r = evaluateFieldMatches({ field: "a", pattern: "(" }, { a: "x" });
    expect(r.passed).toBe(false);
  });
  it("supports equals on primitives", async () => {
    const r = evaluateFieldMatches({ field: "a", equals: 5 }, { a: 5 });
    expect(r.passed).toBe(true);
  });
  it("supports equals on objects via deep equality", async () => {
    const r = evaluateFieldMatches(
      { field: "a", equals: { nested: 1 } },
      { a: { nested: 1 } },
    );
    expect(r.passed).toBe(true);
  });
  it("fails equals when objects differ", async () => {
    const r = evaluateFieldMatches(
      { field: "a", equals: { nested: 1 } },
      { a: { nested: 2 } },
    );
    expect(r.passed).toBe(false);
  });
  it("fails when neither pattern nor equals is provided", async () => {
    const r = evaluateFieldMatches({ field: "a" }, { a: 1 });
    expect(r.passed).toBe(false);
  });
  it("fails when field is missing", async () => {
    const r = evaluateFieldMatches({ field: "missing", pattern: "x" }, { a: 1 });
    expect(r.passed).toBe(false);
  });
  it("fails on empty field name", async () => {
    const r = evaluateFieldMatches({ field: "", pattern: "x" }, { a: 1 });
    expect(r.passed).toBe(false);
  });
});

describe("evaluateFieldInSet edge cases", () => {
  it("does not match when one side is null and the other is not", async () => {
    const r = evaluateFieldInSet({ field: "a", values: [null, "x"] }, { a: "y" });
    expect(r.passed).toBe(false);
  });

  it("does not match across primitive type boundaries", async () => {
    const r = evaluateFieldInSet({ field: "a", values: [5, 6] }, { a: "5" });
    expect(r.passed).toBe(false);
  });

  it("matches null exactly", async () => {
    const r = evaluateFieldInSet({ field: "a", values: [null] }, { a: null });
    // Field-present-style guards: null is "missing" only when the path itself
    // resolves to undefined. Reading a present null returns null, which
    // matches the membership candidate.
    expect(r.passed).toBe(true);
  });
});

describe("evaluateFieldInSet", () => {
  it("passes when value is in the set", async () => {
    const r = evaluateFieldInSet({ field: "a", values: ["x", "y", "z"] }, { a: "y" });
    expect(r.passed).toBe(true);
  });
  it("fails when value is not in the set", async () => {
    const r = evaluateFieldInSet({ field: "a", values: ["x", "y"] }, { a: "z" });
    expect(r.passed).toBe(false);
  });
  it("supports object-equality membership via JSON compare", async () => {
    const r = evaluateFieldInSet(
      { field: "a", values: [{ k: 1 }, { k: 2 }] },
      { a: { k: 2 } },
    );
    expect(r.passed).toBe(true);
  });
  it("fails when values is empty", async () => {
    const r = evaluateFieldInSet({ field: "a", values: [] }, { a: "x" });
    expect(r.passed).toBe(false);
  });
  it("fails on empty field name", async () => {
    const r = evaluateFieldInSet({ field: "", values: ["x"] }, { a: "x" });
    expect(r.passed).toBe(false);
  });
  it("fails when field is missing", async () => {
    const r = evaluateFieldInSet({ field: "missing", values: ["x"] }, { a: "x" });
    expect(r.passed).toBe(false);
  });
});

describe("evaluateLatencyUnderMs", () => {
  it("passes when latency is under the limit", async () => {
    expect(evaluateLatencyUnderMs({ max_ms: 800 }, 500)).toMatchObject({
      passed: true,
      message: null,
    });
  });
  it("passes at the exact boundary (latency === max_ms)", async () => {
    expect(evaluateLatencyUnderMs({ max_ms: 800 }, 800)).toMatchObject({
      passed: true,
      message: null,
    });
  });
  it("fails when latency exceeds the limit with a human-readable overage", async () => {
    const r = evaluateLatencyUnderMs({ max_ms: 800 }, 1240);
    expect(r.passed).toBe(false);
    expect(r.message).toBe("Took 1240ms, limit 800ms (55% over)");
  });
  it("fails when latency was not recorded (null)", async () => {
    const r = evaluateLatencyUnderMs({ max_ms: 800 }, null);
    expect(r.passed).toBe(false);
    expect(r.message).toMatch(/not recorded/i);
  });
  it("fails on misconfiguration: zero max_ms", async () => {
    expect(evaluateLatencyUnderMs({ max_ms: 0 }, 100).passed).toBe(false);
  });
  it("fails on misconfiguration: negative max_ms", async () => {
    expect(evaluateLatencyUnderMs({ max_ms: -1 }, 100).passed).toBe(false);
  });
  it("fails on misconfiguration: non-integer max_ms", async () => {
    expect(evaluateLatencyUnderMs({ max_ms: 1.5 }, 1).passed).toBe(false);
  });
  it("fails on misconfiguration: max_ms over the 600000 ceiling", async () => {
    expect(evaluateLatencyUnderMs({ max_ms: 600_001 }, 1).passed).toBe(false);
  });
});

describe("evaluateAssertion dispatcher", () => {
  it("routes to json_schema_valid", async () => {
    const a = makeAssertion({
      assertion_type: "json_schema_valid",
      config: { schema: { type: "string" } },
    });
    const out = await evaluateAssertion(a, { output: "hi", latency_ms: 0, cost_cents: 0 });
    expect(out.passed).toBe(true);
    expect(out.assertion_type).toBe("json_schema_valid");
  });
  it("routes to field_present", async () => {
    const a = makeAssertion({
      assertion_type: "field_present",
      config: { field: "x" },
    });
    const out = await evaluateAssertion(a, {
      output: { x: 1 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.passed).toBe(true);
  });
  it("routes to field_matches", async () => {
    const a = makeAssertion({
      assertion_type: "field_matches",
      config: { field: "x", equals: 1 },
    });
    const out = await evaluateAssertion(a, {
      output: { x: 1 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.passed).toBe(true);
  });
  it("routes to field_in_set", async () => {
    const a = makeAssertion({
      assertion_type: "field_in_set",
      config: { field: "x", values: [1, 2] },
    });
    const out = await evaluateAssertion(a, {
      output: { x: 2 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.passed).toBe(true);
  });
  it("routes to latency_under_ms and reads ctx.latency_ms", async () => {
    const a = makeAssertion({
      assertion_type: "latency_under_ms",
      config: { max_ms: 1000 },
    });
    const pass = await evaluateAssertion(a, {
      output: {},
      latency_ms: 900,
      cost_cents: 0,
    });
    expect(pass.passed).toBe(true);
    expect(pass.assertion_type).toBe("latency_under_ms");
    const fail = await evaluateAssertion(a, {
      output: {},
      latency_ms: 1500,
      cost_cents: 0,
    });
    expect(fail.passed).toBe(false);
  });
  it("routes to cost_under_cents for n8n and carries details", async () => {
    const a = makeAssertion({
      assertion_type: "cost_under_cents",
      config: { max_cents: 100 },
    });
    const out = await evaluateAssertion(a, {
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
  it("forces warn severity for cost_under_cents on a Make scenario", async () => {
    const a = makeAssertion({
      assertion_type: "cost_under_cents",
      config: { max_cents: 100 },
      severity: "fail",
    });
    const out = await evaluateAssertion(a, {
      output: { anything: 1 },
      latency_ms: 0,
      cost_cents: 0,
      platform: "make",
    });
    expect(out.passed).toBe(false);
    expect(out.severity).toBe("warn");
    expect(out.reason).toBe("platform_unsupported");
  });
  it("routes to llm_judge and forces warn when judge deps are absent", async () => {
    const a = makeAssertion({
      assertion_type: "llm_judge",
      config: { criterion: "The reply is polite and on-topic." },
      severity: "fail",
    });
    const out = await evaluateAssertion(a, {
      output: { reply: "hi" },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.assertion_type).toBe("llm_judge");
    expect(out.passed).toBe(false);
    expect(out.severity).toBe("warn");
    expect(out.reason).toBe("judge_unavailable");
  });
  it("routes to llm_judge and surfaces misconfiguration as a fail", async () => {
    const a = makeAssertion({
      assertion_type: "llm_judge",
      config: { criterion: "short" },
    });
    const out = await evaluateAssertion(a, {
      output: {},
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.passed).toBe(false);
    expect(out.message).toMatch(/misconfigured/i);
  });
  it("normalizes invalid severity to 'fail'", async () => {
    const a = makeAssertion({
      assertion_type: "field_present",
      config: { field: "x" },
      severity: "bogus" as "fail",
    });
    const out = await evaluateAssertion(a, {
      output: { x: 1 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.severity).toBe("fail");
  });
  it("preserves explicit warn severity", async () => {
    const a = makeAssertion({
      assertion_type: "field_present",
      config: { field: "missing" },
      severity: "warn",
    });
    const out = await evaluateAssertion(a, {
      output: { x: 1 },
      latency_ms: 0,
      cost_cents: 0,
    });
    expect(out.severity).toBe("warn");
    expect(out.passed).toBe(false);
  });
});

describe("evaluateAllAssertions", () => {
  it("passes when every fail-severity assertion passes", async () => {
    const out = await evaluateAllAssertions(
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
  it("fails when any fail-severity assertion fails", async () => {
    const out = await evaluateAllAssertions(
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
  it("does not fail the input when only warn assertions fail", async () => {
    const out = await evaluateAllAssertions(
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
