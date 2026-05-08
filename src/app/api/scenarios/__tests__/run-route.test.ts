import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import {
  daysAgo,
  hoursAgo,
  makeMember,
  makeRun,
  makeScenario,
  makeSubscription,
  makeUser,
  TEST_SCENARIO_ID,
  TEST_USER_ID,
  TEST_UUID,
} from "@/test/factories";

let mock: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));

vi.mock("@/lib/preflight/executor", () => ({
  runExecutor: { execute: vi.fn() },
}));

import { runExecutor } from "@/lib/preflight/executor";
import { POST } from "../[id]/run/route";

const executeMock = vi.mocked(runExecutor.execute);

beforeEach(() => {
  mock = createSupabaseMock();
  executeMock.mockReset();
});

describe("POST /api/scenarios/[id]/run", () => {
  it("401 when unauthenticated", async () => {
    const res = await POST(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}/run`, { method: "POST" }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(401);
  });

  it("404 when scenario missing", async () => {
    mock.setUser(makeUser());
    mock.setTable("preflight_scenarios", []);
    const res = await POST(
      makeRequest(`/api/scenarios/missing/run`, { method: "POST" }),
      { params: { id: "missing" } },
    );
    expect(res.status).toBe(404);
  });

  it("409 when scenario is archived", async () => {
    mock.setUser(makeUser());
    mock.setTable("preflight_scenarios", [
      makeScenario({
        id: TEST_SCENARIO_ID,
        archived_at: new Date().toISOString(),
      }),
    ]);
    const res = await POST(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}/run`, { method: "POST" }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(409);
  });

  it("403 for non-admin members", async () => {
    mock.setUser(makeUser({ id: TEST_USER_ID }));
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("workspace_members", [makeMember({ role: "member" })]);
    const res = await POST(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}/run`, { method: "POST" }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(403);
  });

  it("403 with upgrade hint when over monthly run quota", async () => {
    mock.setUser(makeUser({ id: TEST_USER_ID }));
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("workspace_members", [makeMember({ role: "owner" })]);
    mock.setTable("subscriptions", [makeSubscription({ plan: "pro" })]);
    const runs = Array.from({ length: 50 }, (_, i) =>
      makeRun({ id: `r-${i}`, workspace_id: TEST_UUID, started_at: hoursAgo(i + 1) }),
    );
    mock.setTable("preflight_runs", runs);
    const res = await POST(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}/run`, { method: "POST" }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(403);
    const data = await readJson(res);
    expect(data.upgrade_required).toBe(true);
  });

  it("200 dispatches the executor when quota allows", async () => {
    mock.setUser(makeUser({ id: TEST_USER_ID }));
    mock.setTable("preflight_scenarios", [makeScenario()]);
    mock.setTable("workspace_members", [makeMember({ role: "owner" })]);
    mock.setTable("subscriptions", [makeSubscription({ plan: "agency" })]);
    mock.setTable("preflight_runs", [
      makeRun({ id: "old", workspace_id: TEST_UUID, started_at: daysAgo(60) }),
    ]);
    executeMock.mockResolvedValue({
      runId: "r-new",
      status: "passed",
      totalInputs: 1,
      passedCount: 1,
      failedCount: 0,
      erroredCount: 0,
      totalCostCents: 0,
    });
    const res = await POST(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}/run`, { method: "POST" }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(200);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock.mock.calls[0]![0]).toMatchObject({
      scenarioId: TEST_SCENARIO_ID,
      triggeredBy: "manual",
      triggeredByUser: TEST_USER_ID,
    });
  });
});
