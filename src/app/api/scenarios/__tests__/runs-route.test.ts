import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import {
  makeMember,
  makeRun,
  makeRunResult,
  makeScenario,
  makeUser,
  TEST_RUN_ID,
  TEST_SCENARIO_ID,
} from "@/test/factories";

let mock: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));

import { GET } from "../[id]/runs/[runId]/route";

beforeEach(() => {
  mock = createSupabaseMock();
});

describe("GET /api/scenarios/[id]/runs/[runId]", () => {
  it("401 when unauthenticated", async () => {
    const res = await GET(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}/runs/${TEST_RUN_ID}`),
      { params: { id: TEST_SCENARIO_ID, runId: TEST_RUN_ID } },
    );
    expect(res.status).toBe(401);
  });

  it("404 when scenario missing", async () => {
    mock.setUser(makeUser());
    mock.setTable("preflight_scenarios", []);
    const res = await GET(makeRequest(`/api/scenarios/x/runs/y`), {
      params: { id: "x", runId: "y" },
    });
    expect(res.status).toBe(404);
  });

  it("403 for non-members", async () => {
    mock.setUser(makeUser());
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("workspace_members", []);
    const res = await GET(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}/runs/${TEST_RUN_ID}`),
      { params: { id: TEST_SCENARIO_ID, runId: TEST_RUN_ID } },
    );
    expect(res.status).toBe(403);
  });

  it("404 when run does not match the scenario", async () => {
    mock.setUser(makeUser());
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("workspace_members", [makeMember()]);
    mock.setTable("preflight_runs", [
      makeRun({ id: TEST_RUN_ID, scenario_id: "other-scenario" }),
    ]);
    const res = await GET(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}/runs/${TEST_RUN_ID}`),
      { params: { id: TEST_SCENARIO_ID, runId: TEST_RUN_ID } },
    );
    expect(res.status).toBe(404);
  });

  it("200 returns run + results", async () => {
    mock.setUser(makeUser());
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("workspace_members", [makeMember()]);
    mock.setTable("preflight_runs", [
      makeRun({ id: TEST_RUN_ID, scenario_id: TEST_SCENARIO_ID }),
    ]);
    mock.setTable("preflight_run_results", [
      makeRunResult({ run_id: TEST_RUN_ID }),
    ]);
    const res = await GET(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}/runs/${TEST_RUN_ID}`),
      { params: { id: TEST_SCENARIO_ID, runId: TEST_RUN_ID } },
    );
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect(data.results).toHaveLength(1);
  });
});
