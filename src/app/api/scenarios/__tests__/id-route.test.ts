import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import {
  makeAssertion,
  makeMember,
  makePreflightInput,
  makeScenario,
  makeUser,
  TEST_SCENARIO_ID,
  TEST_USER_ID,
  TEST_UUID,
} from "@/test/factories";

let mock: SupabaseMock;
let admin: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => admin.client,
}));

import { GET, PATCH, DELETE } from "../[id]/route";

beforeEach(() => {
  mock = createSupabaseMock();
  admin = createSupabaseMock();
});

function seedScenario() {
  mock.setTable("preflight_scenarios", [
    makeScenario({ id: TEST_SCENARIO_ID, workspace_id: TEST_UUID }),
  ]);
  mock.setTable("preflight_assertions", [
    makeAssertion({ scenario_id: TEST_SCENARIO_ID }),
  ]);
  mock.setTable("preflight_inputs", [
    makePreflightInput({ scenario_id: TEST_SCENARIO_ID }),
  ]);
}

describe("GET /api/scenarios/[id]", () => {
  it("401 when unauthenticated", async () => {
    const res = await GET(makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`), {
      params: { id: TEST_SCENARIO_ID },
    });
    expect(res.status).toBe(401);
  });

  it("404 when not found", async () => {
    mock.setUser(makeUser());
    mock.setTable("preflight_scenarios", []);
    const res = await GET(makeRequest(`/api/scenarios/missing`), {
      params: { id: "missing" },
    });
    expect(res.status).toBe(404);
  });

  it("403 for non-members", async () => {
    mock.setUser(makeUser());
    seedScenario();
    mock.setTable("workspace_members", []);
    const res = await GET(makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`), {
      params: { id: TEST_SCENARIO_ID },
    });
    expect(res.status).toBe(403);
  });

  it("200 returns scenario, assertions, inputs", async () => {
    mock.setUser(makeUser());
    seedScenario();
    mock.setTable("workspace_members", [makeMember()]);
    const res = await GET(makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`), {
      params: { id: TEST_SCENARIO_ID },
    });
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect(data.scenario.id).toBe(TEST_SCENARIO_ID);
    expect(data.assertions).toHaveLength(1);
    expect(data.inputs).toHaveLength(1);
  });
});

describe("PATCH /api/scenarios/[id]", () => {
  it("401 when unauthenticated", async () => {
    const res = await PATCH(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`, {
        method: "PATCH",
        body: { name: "x" },
      }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(401);
  });

  it("400 on invalid payload", async () => {
    mock.setUser(makeUser());
    seedScenario();
    mock.setTable("workspace_members", [makeMember({ role: "owner" })]);
    const res = await PATCH(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`, {
        method: "PATCH",
        body: {},
      }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(400);
  });

  it("403 for members without admin role", async () => {
    mock.setUser(makeUser({ id: TEST_USER_ID }));
    seedScenario();
    mock.setTable("workspace_members", [makeMember({ role: "member" })]);
    const res = await PATCH(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`, {
        method: "PATCH",
        body: { name: "x" },
      }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(403);
  });

  it("404 when scenario missing", async () => {
    mock.setUser(makeUser());
    mock.setTable("preflight_scenarios", []);
    const res = await PATCH(
      makeRequest(`/api/scenarios/missing`, {
        method: "PATCH",
        body: { name: "x" },
      }),
      { params: { id: "missing" } },
    );
    expect(res.status).toBe(404);
  });

  it("200 applies the patch", async () => {
    mock.setUser(makeUser());
    seedScenario();
    mock.setTable("workspace_members", [makeMember({ role: "owner" })]);
    admin.setTable("preflight_scenarios", [
      makeScenario({ id: TEST_SCENARIO_ID }),
    ]);
    const res = await PATCH(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`, {
        method: "PATCH",
        body: { name: "Renamed", costCapCents: 1000, enabled: false },
      }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/scenarios/[id]", () => {
  it("401 when unauthenticated", async () => {
    const res = await DELETE(makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`, { method: "DELETE" }), {
      params: { id: TEST_SCENARIO_ID },
    });
    expect(res.status).toBe(401);
  });

  it("404 when scenario missing", async () => {
    mock.setUser(makeUser());
    mock.setTable("preflight_scenarios", []);
    const res = await DELETE(makeRequest(`/api/scenarios/missing`, { method: "DELETE" }), {
      params: { id: "missing" },
    });
    expect(res.status).toBe(404);
  });

  it("403 for members without admin role", async () => {
    mock.setUser(makeUser());
    seedScenario();
    mock.setTable("workspace_members", [makeMember({ role: "member" })]);
    const res = await DELETE(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`, { method: "DELETE" }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(403);
  });

  it("200 archives the scenario for admins", async () => {
    mock.setUser(makeUser());
    seedScenario();
    mock.setTable("workspace_members", [makeMember({ role: "owner" })]);
    admin.setTable("preflight_scenarios", [
      makeScenario({ id: TEST_SCENARIO_ID }),
    ]);
    const res = await DELETE(
      makeRequest(`/api/scenarios/${TEST_SCENARIO_ID}`, { method: "DELETE" }),
      { params: { id: TEST_SCENARIO_ID } },
    );
    expect(res.status).toBe(200);
  });
});
