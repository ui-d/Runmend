import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import {
  makeConnection,
  makeMember,
  makeScenario,
  makeSubscription,
  makeUser,
  TEST_USER_ID,
  TEST_UUID,
  TEST_CONNECTION_ID,
} from "@/test/factories";

let mock: SupabaseMock;
let admin: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => admin.client,
}));

import { GET, POST } from "../route";

beforeEach(() => {
  mock = createSupabaseMock();
  admin = createSupabaseMock();
});

describe("GET /api/scenarios", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await GET(
      makeRequest("/api/scenarios", { searchParams: { workspaceId: TEST_UUID } }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when workspaceId is missing", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember()]);
    const res = await GET(makeRequest("/api/scenarios"));
    expect(res.status).toBe(400);
  });

  it("returns 403 for non-members", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", []);
    const res = await GET(
      makeRequest("/api/scenarios", { searchParams: { workspaceId: TEST_UUID } }),
    );
    expect(res.status).toBe(403);
  });

  it("returns scenarios for members", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember()]);
    mock.setTable("preflight_scenarios", [
      makeScenario({ id: "s-1", workspace_id: TEST_UUID }),
    ]);
    const res = await GET(
      makeRequest("/api/scenarios", { searchParams: { workspaceId: TEST_UUID } }),
    );
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect(data.scenarios).toHaveLength(1);
  });
});

describe("POST /api/scenarios", () => {
  const validBody = {
    workspaceId: TEST_UUID,
    connectionId: TEST_CONNECTION_ID,
    name: "Test",
    workflowExternalId: "wf-1",
    inputs: [{ input_data: { a: 1 } }],
    assertions: [{ assertion_type: "field_present", config: { field: "a" } }],
  };

  it("returns 401 when unauthenticated", async () => {
    const res = await POST(
      makeRequest("/api/scenarios", { method: "POST", body: validBody }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    mock.setUser(makeUser());
    const res = await POST(
      makeRequest("/api/scenarios", {
        method: "POST",
        body: { ...validBody, workspaceId: "not-a-uuid" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user is not an admin/owner", async () => {
    mock.setUser(makeUser({ id: TEST_USER_ID }));
    mock.setTable("workspace_members", [makeMember({ role: "member" })]);
    const res = await POST(
      makeRequest("/api/scenarios", { method: "POST", body: validBody }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 with upgrade hint when over plan quota", async () => {
    mock.setUser(makeUser({ id: TEST_USER_ID }));
    mock.setTable("workspace_members", [makeMember({ role: "owner" })]);
    mock.setTable("subscriptions", [makeSubscription({ plan: "free" })]);
    mock.setTable("preflight_scenarios", []);
    const res = await POST(
      makeRequest("/api/scenarios", { method: "POST", body: validBody }),
    );
    expect(res.status).toBe(403);
    const data = await readJson(res);
    expect(data.upgrade_required).toBe(true);
  });

  it("creates the scenario when auth + quota check pass", async () => {
    mock.setUser(makeUser({ id: TEST_USER_ID }));
    mock.setTable("workspace_members", [makeMember({ role: "owner" })]);
    mock.setTable("subscriptions", [makeSubscription({ plan: "pro" })]);
    mock.setTable("preflight_scenarios", []);
    admin.setTable("preflight_scenarios", []);
    admin.setTable("preflight_inputs", []);
    admin.setTable("preflight_assertions", []);

    const res = await POST(
      makeRequest("/api/scenarios", { method: "POST", body: validBody }),
    );
    expect(res.status).toBe(201);
    const data = await readJson(res);
    expect(data.scenario).toBeDefined();
  });

  function setupCreateOk() {
    mock.setUser(makeUser({ id: TEST_USER_ID }));
    mock.setTable("workspace_members", [makeMember({ role: "owner" })]);
    mock.setTable("subscriptions", [makeSubscription({ plan: "pro" })]);
    mock.setTable("preflight_scenarios", []);
    admin.setTable("preflight_scenarios", []);
    admin.setTable("preflight_inputs", []);
    admin.setTable("preflight_assertions", []);
  }
  const costBody = {
    ...validBody,
    assertions: [{ assertion_type: "cost_under_cents", config: { max_cents: 100 } }],
  };

  it("returns a non-blocking warning for cost_under_cents on a Make connection", async () => {
    setupCreateOk();
    admin.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID, platform: "make" }),
    ]);
    const res = await POST(
      makeRequest("/api/scenarios", { method: "POST", body: costBody }),
    );
    expect(res.status).toBe(201);
    const data = await readJson(res);
    expect(data.scenario).toBeDefined();
    expect(data.warnings).toHaveLength(1);
    expect(data.warnings[0].code).toBe("cost_unsupported_make");
  });

  it("does not warn for cost_under_cents on an n8n connection", async () => {
    setupCreateOk();
    admin.setTable("platform_connections", [
      makeConnection({ id: TEST_CONNECTION_ID, platform: "n8n" }),
    ]);
    const res = await POST(
      makeRequest("/api/scenarios", { method: "POST", body: costBody }),
    );
    expect(res.status).toBe(201);
    const data = await readJson(res);
    expect(data.warnings).toBeUndefined();
  });
});
