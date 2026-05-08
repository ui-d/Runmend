import { describe, it, expect } from "vitest";
import {
  archiveScenario,
  countActiveScenarios,
  countRunsThisMonth,
  createScenario,
  getRun,
  getRunResults,
  getScenario,
  getScenarioWithDetails,
  listRunsForScenario,
  listScenarios,
  updateScenario,
} from "@/lib/queries/preflight";
import { createSupabaseMock } from "@/test/supabase-mock";
import {
  daysAgo,
  hoursAgo,
  makeAssertion,
  makePreflightInput,
  makeRun,
  makeRunResult,
  makeScenario,
  TEST_CONNECTION_ID,
  TEST_SCENARIO_ID,
  TEST_UUID,
} from "@/test/factories";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  const client = mock.client as unknown as SupabaseClient<Database>;
  return { mock, client };
}

describe("listScenarios", () => {
  it("returns non-archived scenarios in the workspace", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", [
      makeScenario({ id: "s-active", workspace_id: TEST_UUID }),
      makeScenario({
        id: "s-archived",
        workspace_id: TEST_UUID,
        archived_at: new Date().toISOString(),
      }),
      makeScenario({ id: "s-other-ws", workspace_id: "other-ws" }),
    ]);
    const result = await listScenarios(client, TEST_UUID);
    expect(result.map((r) => r.id)).toEqual(["s-active"]);
  });

  it("propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("preflight_scenarios", { message: "RLS denied" });
    await expect(listScenarios(client, TEST_UUID)).rejects.toMatchObject({
      message: "RLS denied",
    });
  });
});

describe("getScenario", () => {
  it("returns the scenario when found", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", [makeScenario({ id: "s-1" })]);
    const result = await getScenario(client, "s-1");
    expect(result?.id).toBe("s-1");
  });

  it("returns null when missing", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", []);
    const result = await getScenario(client, "missing");
    expect(result).toBeNull();
  });

  it("propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("preflight_scenarios", { message: "boom" });
    await expect(getScenario(client, "x")).rejects.toMatchObject({ message: "boom" });
  });
});

describe("getScenarioWithDetails", () => {
  it("bundles scenario, assertions, and inputs", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", [makeScenario({ id: "s-1" })]);
    mock.setTable("preflight_assertions", [
      makeAssertion({ id: "a1", scenario_id: "s-1" }),
    ]);
    mock.setTable("preflight_inputs", [
      makePreflightInput({ id: "i1", scenario_id: "s-1" }),
    ]);
    const result = await getScenarioWithDetails(client, "s-1");
    expect(result?.scenario.id).toBe("s-1");
    expect(result?.assertions).toHaveLength(1);
    expect(result?.inputs).toHaveLength(1);
  });

  it("returns null when scenario not found", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", []);
    const result = await getScenarioWithDetails(client, "missing");
    expect(result).toBeNull();
  });

  it("propagates assertion-table errors", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", [makeScenario({ id: "s-1" })]);
    mock.setTableError("preflight_assertions", { message: "no" });
    await expect(getScenarioWithDetails(client, "s-1")).rejects.toMatchObject({
      message: "no",
    });
  });
});

describe("countActiveScenarios", () => {
  it("counts non-archived rows for the workspace", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", [
      makeScenario({ id: "a", workspace_id: TEST_UUID }),
      makeScenario({ id: "b", workspace_id: TEST_UUID }),
      makeScenario({
        id: "c",
        workspace_id: TEST_UUID,
        archived_at: new Date().toISOString(),
      }),
      makeScenario({ id: "d", workspace_id: "other" }),
    ]);
    const count = await countActiveScenarios(client, TEST_UUID);
    expect(count).toBe(2);
  });

  it("propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("preflight_scenarios", { message: "boom" });
    await expect(countActiveScenarios(client, TEST_UUID)).rejects.toMatchObject({
      message: "boom",
    });
  });
});

describe("countRunsThisMonth", () => {
  it("counts runs since the start of the current UTC month", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_runs", [
      makeRun({ id: "r1", workspace_id: TEST_UUID, started_at: hoursAgo(2) }),
      makeRun({ id: "r2", workspace_id: TEST_UUID, started_at: hoursAgo(48) }),
      makeRun({ id: "r3", workspace_id: TEST_UUID, started_at: daysAgo(60) }),
      makeRun({ id: "r4", workspace_id: "other", started_at: hoursAgo(1) }),
    ]);
    const count = await countRunsThisMonth(client, TEST_UUID);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(2);
  });

  it("propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("preflight_runs", { message: "boom" });
    await expect(countRunsThisMonth(client, TEST_UUID)).rejects.toMatchObject({
      message: "boom",
    });
  });
});

describe("createScenario", () => {
  it("inserts the scenario, inputs, and assertions", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", []);
    mock.setTable("preflight_inputs", []);
    mock.setTable("preflight_assertions", []);
    const scenario = await createScenario(client, {
      workspaceId: TEST_UUID,
      connectionId: TEST_CONNECTION_ID,
      name: "Lead Enrichment",
      workflowExternalId: "wf-1",
      inputs: [{ input_data: { example: 1 } }],
      assertions: [{ assertion_type: "field_present", config: { field: "x" } }],
    });
    expect(scenario.name).toBe("Lead Enrichment");
    expect(mock.getCalls("preflight_inputs").some((c) => c.op === "insert")).toBe(true);
    expect(
      mock.getCalls("preflight_assertions").some((c) => c.op === "insert"),
    ).toBe(true);
  });

  it("rolls back the scenario when assertion insert fails", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", []);
    mock.setTable("preflight_inputs", []);
    mock.setTableError("preflight_assertions", { message: "constraint violated" });
    await expect(
      createScenario(client, {
        workspaceId: TEST_UUID,
        connectionId: TEST_CONNECTION_ID,
        name: "Bad",
        workflowExternalId: "wf-1",
        inputs: [{ input_data: { x: 1 } }],
        assertions: [{ assertion_type: "field_present", config: { field: "x" } }],
      }),
    ).rejects.toMatchObject({ message: "constraint violated" });
    const deletes = mock
      .getCalls("preflight_scenarios")
      .filter((c) => c.op === "delete");
    expect(deletes.length).toBeGreaterThan(0);
  });

  it("supports zero-input scenarios", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", []);
    const scenario = await createScenario(client, {
      workspaceId: TEST_UUID,
      connectionId: TEST_CONNECTION_ID,
      name: "Skeleton",
      workflowExternalId: "wf-1",
      inputs: [],
      assertions: [],
    });
    expect(scenario.name).toBe("Skeleton");
    expect(mock.getCalls("preflight_inputs").length).toBe(0);
    expect(mock.getCalls("preflight_assertions").length).toBe(0);
  });
});

describe("updateScenario", () => {
  it("applies the patch and returns the updated row", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", [makeScenario({ id: "s-1", name: "old" })]);
    const out = await updateScenario(client, "s-1", { name: "new" });
    expect(out.name).toBe("new");
  });

  it("propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("preflight_scenarios", { message: "no" });
    await expect(updateScenario(client, "s-1", { name: "x" })).rejects.toMatchObject({
      message: "no",
    });
  });
});

describe("archiveScenario", () => {
  it("sets archived_at and disables the scenario", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", [makeScenario({ id: "s-1" })]);
    await archiveScenario(client, "s-1");
    const upd = mock.getCalls("preflight_scenarios").find((c) => c.op === "update");
    expect(upd).toBeDefined();
    const payload = upd!.payload as Record<string, unknown>;
    expect(payload.enabled).toBe(false);
    expect(payload.archived_at).toBeTypeOf("string");
  });

  it("propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("preflight_scenarios", { message: "no" });
    await expect(archiveScenario(client, "s-1")).rejects.toMatchObject({
      message: "no",
    });
  });
});

describe("listRunsForScenario", () => {
  it("returns runs ordered desc and respects the limit", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_runs", [
      makeRun({ id: "r1", scenario_id: TEST_SCENARIO_ID, started_at: hoursAgo(2) }),
      makeRun({ id: "r2", scenario_id: TEST_SCENARIO_ID, started_at: hoursAgo(1) }),
      makeRun({ id: "r3", scenario_id: "other-scenario", started_at: hoursAgo(3) }),
    ]);
    const out = await listRunsForScenario(client, TEST_SCENARIO_ID, 5);
    expect(out.map((r) => r.id)).toEqual(["r2", "r1"]);
  });

  it("propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("preflight_runs", { message: "boom" });
    await expect(listRunsForScenario(client, TEST_SCENARIO_ID)).rejects.toMatchObject({
      message: "boom",
    });
  });
});

describe("getRun + getRunResults", () => {
  it("getRun returns the row by id", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_runs", [makeRun({ id: "r-1" })]);
    const out = await getRun(client, "r-1");
    expect(out?.id).toBe("r-1");
  });

  it("getRun returns null when missing", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_runs", []);
    const out = await getRun(client, "missing");
    expect(out).toBeNull();
  });

  it("getRun propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("preflight_runs", { message: "no" });
    await expect(getRun(client, "x")).rejects.toMatchObject({ message: "no" });
  });

  it("getRunResults returns rows for the run", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_run_results", [
      makeRunResult({ id: "rr1", run_id: "r-1" }),
      makeRunResult({ id: "rr2", run_id: "r-2" }),
    ]);
    const out = await getRunResults(client, "r-1");
    expect(out.map((r) => r.id)).toEqual(["rr1"]);
  });

  it("getRunResults propagates errors", async () => {
    const { mock, client } = wire();
    mock.setTableError("preflight_run_results", { message: "no" });
    await expect(getRunResults(client, "r-1")).rejects.toMatchObject({
      message: "no",
    });
  });
});
