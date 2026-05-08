import { describe, it, expect } from "vitest";
import {
  scenarioCreateSchema,
  scenarioUpdateSchema,
  runTriggerSchema,
  assertionInputSchema,
  inputDraftSchema,
} from "@/lib/validation/preflight-schemas";

const validUuid = "00000000-0000-4000-8000-000000000001";

describe("scenarioCreateSchema", () => {
  const base = {
    workspaceId: validUuid,
    connectionId: validUuid,
    name: "Lead Enrichment",
    workflowExternalId: "wf-1",
    inputs: [{ input_data: { example: "value" } }],
    assertions: [{ assertion_type: "field_present", config: { field: "x" } }],
  };

  it("accepts a valid payload", () => {
    const r = scenarioCreateSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rejects missing inputs", () => {
    const r = scenarioCreateSchema.safeParse({ ...base, inputs: [] });
    expect(r.success).toBe(false);
  });

  it("rejects more than 50 inputs", () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => ({
      input_data: { i },
    }));
    const r = scenarioCreateSchema.safeParse({ ...base, inputs: tooMany });
    expect(r.success).toBe(false);
  });

  it("rejects missing assertions", () => {
    const r = scenarioCreateSchema.safeParse({ ...base, assertions: [] });
    expect(r.success).toBe(false);
  });

  it("rejects malformed UUIDs", () => {
    const r = scenarioCreateSchema.safeParse({ ...base, workspaceId: "nope" });
    expect(r.success).toBe(false);
  });

  it("rejects an oversized name", () => {
    const r = scenarioCreateSchema.safeParse({
      ...base,
      name: "x".repeat(200),
    });
    expect(r.success).toBe(false);
  });

  it("validates cron expressions", () => {
    const r = scenarioCreateSchema.safeParse({
      ...base,
      scheduleCron: "*/15 * * * *",
    });
    expect(r.success).toBe(true);
  });

  it("rejects bogus cron expressions", () => {
    const r = scenarioCreateSchema.safeParse({
      ...base,
      scheduleCron: "not a cron",
    });
    expect(r.success).toBe(false);
  });
});

describe("scenarioUpdateSchema", () => {
  it("accepts a partial patch", () => {
    const r = scenarioUpdateSchema.safeParse({ name: "Updated" });
    expect(r.success).toBe(true);
  });

  it("rejects an empty patch", () => {
    const r = scenarioUpdateSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rejects out-of-range cost cap", () => {
    const r = scenarioUpdateSchema.safeParse({ costCapCents: 9_999_999 });
    expect(r.success).toBe(false);
  });
});

describe("runTriggerSchema", () => {
  it("accepts an empty body", () => {
    const r = runTriggerSchema.safeParse(undefined);
    expect(r.success).toBe(true);
  });

  it("accepts an explicit triggeredBy", () => {
    const r = runTriggerSchema.safeParse({ triggeredBy: "schedule" });
    expect(r.success).toBe(true);
  });
});

describe("assertionInputSchema", () => {
  it("accepts each supported assertion type", () => {
    for (const type of [
      "json_schema_valid",
      "field_present",
      "field_matches",
      "field_in_set",
      "llm_judge",
      "latency_under_ms",
      "cost_under_cents",
    ]) {
      const r = assertionInputSchema.safeParse({
        assertion_type: type,
        config: { field: "x" },
      });
      expect(r.success).toBe(true);
    }
  });

  it("rejects unknown assertion types", () => {
    const r = assertionInputSchema.safeParse({
      assertion_type: "bogus",
      config: {},
    });
    expect(r.success).toBe(false);
  });
});

describe("inputDraftSchema", () => {
  it("accepts arbitrary JSON input_data", () => {
    const r = inputDraftSchema.safeParse({
      input_data: { nested: { array: [1, 2, 3] } },
    });
    expect(r.success).toBe(true);
  });

  it("accepts a valid source label", () => {
    const r = inputDraftSchema.safeParse({
      input_data: { x: 1 },
      source: "production_trace",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an unknown source", () => {
    const r = inputDraftSchema.safeParse({
      input_data: { x: 1 },
      source: "bogus",
    });
    expect(r.success).toBe(false);
  });
});
