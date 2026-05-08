import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/crypto", () => ({
  decrypt: (v: string) => v.replace(/^enc:/, ""),
  encrypt: (v: string) => `enc:${v}`,
}));

vi.mock("@/lib/platform-adapters", () => ({
  createAdapter: vi.fn(),
}));

import { createAdapter } from "@/lib/platform-adapters";
import { SynchronousRunExecutor } from "@/lib/preflight/executor/synchronous";
import { createSupabaseMock } from "@/test/supabase-mock";

const createAdapterMock = vi.mocked(createAdapter);
import {
  makeAssertion,
  makeConnection,
  makePreflightInput,
  makeScenario,
  TEST_CONNECTION_ID,
  TEST_SCENARIO_ID,
  TEST_UUID,
} from "@/test/factories";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { PlatformAdapter } from "@/lib/platform-adapters/types";

interface Wired {
  mock: ReturnType<typeof createSupabaseMock>;
  client: SupabaseClient<Database>;
  adapter: PlatformAdapter;
}

function wire(): Wired {
  const mock = createSupabaseMock();
  return {
    mock,
    client: mock.client as unknown as SupabaseClient<Database>,
    adapter: {
      testConnection: vi.fn(async () => ({ ok: true })),
      fetchAutomations: vi.fn(async () => []),
      fetchExecutionLogs: vi.fn(async () => []),
      executeWorkflow: vi.fn(),
    },
  };
}

function loadAdmin(client: SupabaseClient<Database>) {
  return () => client;
}

function buildAdapter(adapter: PlatformAdapter) {
  return () => adapter;
}

describe("SynchronousRunExecutor", () => {
  it("runs each input through the adapter and records pass/fail", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", [
      makeAssertion({
        id: "a1",
        assertion_type: "field_present",
        config: { field: "result" },
      }),
    ]);
    mock.setTable("preflight_inputs", [
      makePreflightInput({ id: "i1", input_data: { q: "1" } }),
      makePreflightInput({ id: "i2", input_data: { q: "2" } }),
    ]);
    mock.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID }),
    ]);
    vi.mocked(adapter.executeWorkflow)
      .mockResolvedValueOnce({ ok: true, output: { result: "ok" }, latencyMs: 50 })
      .mockResolvedValueOnce({ ok: true, output: { other: "x" }, latencyMs: 60 });

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });

    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });

    expect(result.totalInputs).toBe(2);
    expect(result.passedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.status).toBe("failed");
    const inserts = mock.getCalls("preflight_run_results").filter((c) => c.op === "insert");
    expect(inserts.length).toBe(2);
  });

  it("marks the run errored when adapter build fails", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", [makeAssertion()]);
    mock.setTable("preflight_inputs", [makePreflightInput({ id: "i1" })]);
    mock.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID }),
    ]);

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: () => {
        throw new Error("Bad credentials");
      },
    });

    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });
    expect(result.status).toBe("errored");
    expect(result.erroredCount).toBe(1);
    expect(adapter.executeWorkflow).not.toHaveBeenCalled();
  });

  it("counts a workflow exec failure as an errored input, not a failed input", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", [makeAssertion()]);
    mock.setTable("preflight_inputs", [makePreflightInput({ id: "i1" })]);
    mock.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID }),
    ]);
    vi.mocked(adapter.executeWorkflow).mockResolvedValue({
      ok: false,
      output: null,
      latencyMs: 100,
      error: "n8n 500",
    });

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });
    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });
    expect(result.erroredCount).toBe(1);
    expect(result.passedCount).toBe(0);
    expect(result.status).toBe("errored");
  });

  it("returns errored when the scenario has zero inputs", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", []);
    mock.setTable("preflight_inputs", []);
    mock.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID }),
    ]);

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });
    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });
    expect(result.status).toBe("errored");
    expect(result.totalInputs).toBe(0);
  });

  it("rejects archived scenarios", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [
      makeScenario({ archived_at: new Date().toISOString() }),
    ]);
    mock.setTable("preflight_assertions", []);
    mock.setTable("preflight_inputs", []);
    mock.setTable("platform_connections", []);

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });
    await expect(
      executor.execute({ scenarioId: TEST_SCENARIO_ID, triggeredBy: "manual" }),
    ).rejects.toThrow(/archived/);
  });

  it("rejects disabled scenarios", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario({ enabled: false })]);
    mock.setTable("preflight_assertions", []);
    mock.setTable("preflight_inputs", []);
    mock.setTable("platform_connections", []);

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });
    await expect(
      executor.execute({ scenarioId: TEST_SCENARIO_ID, triggeredBy: "manual" }),
    ).rejects.toThrow(/disabled/);
  });

  it("returns 'passed' status when every input passes", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", [
      makeAssertion({
        id: "a1",
        assertion_type: "field_present",
        config: { field: "result" },
      }),
    ]);
    mock.setTable("preflight_inputs", [
      makePreflightInput({ id: "i1" }),
      makePreflightInput({ id: "i2" }),
    ]);
    mock.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID }),
    ]);
    vi.mocked(adapter.executeWorkflow).mockResolvedValue({
      ok: true,
      output: { result: "ok" },
      latencyMs: 30,
    });

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });
    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });
    expect(result.status).toBe("passed");
    expect(result.passedCount).toBe(2);
    expect(result.failedCount).toBe(0);
  });

  it("triggers cost_capped when running cost meets cap before processing", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [
      makeScenario({ cost_cap_cents: 0 as unknown as number }),
    ]);
    mock.setTable("preflight_assertions", [makeAssertion()]);
    mock.setTable("preflight_inputs", [makePreflightInput({ id: "i1" })]);
    mock.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID }),
    ]);

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });
    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });
    expect(result.status).toBe("cost_capped");
    expect(adapter.executeWorkflow).not.toHaveBeenCalled();
  });

  it("uses defaultBuildAdapter when no override is provided", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", []);
    mock.setTable("preflight_inputs", [makePreflightInput({ id: "i1" })]);
    mock.setTable("platform_connections", [
      makeConnection({
        id: TEST_CONNECTION_ID,
        platform: "make",
        api_key_encrypted: "enc:make-key",
        zone: "us1",
        team_id: 42,
      }),
    ]);
    vi.mocked(adapter.executeWorkflow).mockResolvedValue({
      ok: true,
      output: { ok: true },
      latencyMs: 10,
    });
    createAdapterMock.mockReturnValue(adapter);

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
    });
    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });
    expect(result.status).toBe("passed");
    expect(createAdapterMock).toHaveBeenCalledWith("make", {
      apiKey: "make-key",
      instanceUrl: undefined,
      zone: "us1",
      teamId: 42,
    });
  });

  it("defaultBuildAdapter rejects connections with no api key", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", []);
    mock.setTable("preflight_inputs", [makePreflightInput({ id: "i1" })]);
    mock.setTable("platform_connections", [
      makeConnection({
        id: TEST_CONNECTION_ID,
        platform: "make",
        api_key_encrypted: null,
      }),
    ]);

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
    });
    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });
    expect(result.status).toBe("errored");
    expect(adapter.executeWorkflow).not.toHaveBeenCalled();
  });

  it("defaultBuildAdapter rejects unsupported platforms", async () => {
    const { mock, client } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", []);
    mock.setTable("preflight_inputs", [makePreflightInput({ id: "i1" })]);
    mock.setTable("platform_connections", [
      makeConnection({
        id: TEST_CONNECTION_ID,
        platform: "zapier",
        api_key_encrypted: "enc:x",
      }),
    ]);

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
    });
    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });
    expect(result.status).toBe("errored");
  });

  it("propagates query errors when scenario load fails", async () => {
    const { mock, client, adapter } = wire();
    mock.setTableError("preflight_scenarios", { message: "RLS denied" });

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });
    await expect(
      executor.execute({ scenarioId: TEST_SCENARIO_ID, triggeredBy: "manual" }),
    ).rejects.toBeTruthy();
  });

  it("passes triggeredBy and triggeredByUser through to the run row", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", []);
    mock.setTable("preflight_inputs", [makePreflightInput({ id: "i1" })]);
    mock.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID }),
    ]);
    vi.mocked(adapter.executeWorkflow).mockResolvedValue({
      ok: true,
      output: { ok: true },
      latencyMs: 30,
    });

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });
    await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "schedule",
      triggeredByUser: TEST_UUID,
    });

    const runInsert = mock
      .getCalls("preflight_runs")
      .find((c) => c.op === "insert");
    expect(runInsert).toBeDefined();
    const payload = runInsert!.payload as Record<string, unknown>;
    expect(payload.triggered_by).toBe("schedule");
    expect(payload.triggered_by_user).toBe(TEST_UUID);
  });
});
