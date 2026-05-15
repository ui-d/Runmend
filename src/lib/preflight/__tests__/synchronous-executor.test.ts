import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/crypto", () => ({
  decrypt: (v: string) => v.replace(/^enc:/, ""),
  encrypt: (v: string) => `enc:${v}`,
}));

vi.mock("@/lib/platform-adapters", () => ({
  createAdapter: vi.fn(),
}));

import { createAdapter } from "@/lib/platform-adapters";
import {
  SynchronousRunExecutor,
  defaultBuildJudge,
} from "@/lib/preflight/executor/synchronous";
import { createSupabaseMock } from "@/test/supabase-mock";
import { createAnthropicMock } from "@/test/anthropic-mock";

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

  it("rolls llm_judge token cost into the run total via existing plumbing", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", [
      makeAssertion({
        id: "j1",
        assertion_type: "llm_judge",
        config: { criterion: "The reply greets the user politely and clearly." },
      }),
    ]);
    mock.setTable("preflight_inputs", [makePreflightInput({ id: "i1" })]);
    mock.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID }),
    ]);
    vi.mocked(adapter.executeWorkflow).mockResolvedValue({
      ok: true,
      output: { reply: "Hello, how can I help?" },
      latencyMs: 20,
    });
    const anthropic = createAnthropicMock();
    anthropic.create.mockResolvedValue({
      id: "m",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-5-20250929",
      stop_reason: "end_turn",
      content: [
        {
          type: "text",
          text: JSON.stringify({ score: 90, reasoning: "Polite.", confidence: "high" }),
        },
      ],
      // 1M in @ $3/M + 1M out @ $15/M = $18.00 = 1800 cents
      usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
    });

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
      buildJudge: () => ({ client: anthropic.client }),
    });
    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });

    expect(result.status).toBe("passed");
    expect(result.totalCostCents).toBe(1800);
    const finalize = mock
      .getCalls("preflight_runs")
      .find((c) => c.op === "update");
    expect(
      (finalize!.payload as Record<string, unknown>).total_cost_cents,
    ).toBe(1800);
    const resultInsert = mock
      .getCalls("preflight_run_results")
      .find((c) => c.op === "insert");
    expect((resultInsert!.payload as Record<string, unknown>).cost_cents).toBe(
      1800,
    );
  });

  it("records cost_under_cents on a Make scenario as a non-failing platform_unsupported warn", async () => {
    const { mock, client, adapter } = wire();
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("preflight_assertions", [
      makeAssertion({
        id: "c1",
        assertion_type: "cost_under_cents",
        config: { max_cents: 100 },
        severity: "fail",
      }),
    ]);
    mock.setTable("preflight_inputs", [makePreflightInput({ id: "i1" })]);
    mock.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID, platform: "make" }),
    ]);
    vi.mocked(adapter.executeWorkflow).mockResolvedValue({
      ok: true,
      output: { anything: 1 },
      latencyMs: 10,
    });

    const executor = new SynchronousRunExecutor({
      loadAdmin: loadAdmin(client),
      buildAdapter: buildAdapter(adapter),
    });
    const result = await executor.execute({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
    });

    // Product gap → warn, so the input (and run) still passes.
    expect(result.status).toBe("passed");
    const resultInsert = mock
      .getCalls("preflight_run_results")
      .find((c) => c.op === "insert");
    const outcomes = (resultInsert!.payload as Record<string, unknown>)
      .assertion_results as Array<Record<string, unknown>>;
    expect(outcomes[0]!.reason).toBe("platform_unsupported");
    expect(outcomes[0]!.severity).toBe("warn");
  });
});

describe("defaultBuildJudge", () => {
  const original = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = original;
  });

  it("returns a client holder when ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const holder = defaultBuildJudge();
    expect(holder).toBeDefined();
    expect(holder!.client).toBeTruthy();
  });

  it("returns undefined when ANTHROPIC_API_KEY is absent", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(defaultBuildJudge()).toBeUndefined();
  });
});
