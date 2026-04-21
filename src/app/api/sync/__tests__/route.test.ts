import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import {
  makeProfile,
  makeSubscription,
  makeUser,
  makeConnection,
  makeMember,
  daysAgo,
  TEST_PROFILE_ID,
  TEST_WORKSPACE_ID_2,
} from "@/test/factories";

let mock: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));

vi.mock("@/lib/sync/engine", () => ({
  syncProfile: vi.fn(async () => ({
    automationsUpserted: 2,
    executionsInserted: 3,
    issuesDetected: 0,
    healthScore: 90,
    errors: [],
  })),
}));

import { syncProfile } from "@/lib/sync/engine";

beforeEach(() => {
  mock = createSupabaseMock();
  vi.mocked(syncProfile)
    .mockReset()
    .mockResolvedValue({
      automationsUpserted: 2,
      executionsInserted: 3,
      issuesDetected: 0,
      healthScore: 90,
      errors: [],
    });
});

const ctx = { params: Promise.resolve({ profileId: TEST_PROFILE_ID }) };
const PATH = `/api/sync/${TEST_PROFILE_ID}`;

describe("POST /api/sync/[profileId]", () => {
  it("401 unauthenticated", async () => {
    const { POST } = await import("../[profileId]/route");
    const res = await POST(makeRequest(PATH, { method: "POST" }), ctx);
    expect(res.status).toBe(401);
  });

  it("400 when profileId is not a UUID", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../[profileId]/route");
    const res = await POST(makeRequest("/api/sync/not-uuid", { method: "POST" }), {
      params: Promise.resolve({ profileId: "not-uuid" }),
    });
    expect(res.status).toBe(400);
  });

  it("404 when profile not found", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", []);
    const { POST } = await import("../[profileId]/route");
    const res = await POST(makeRequest(PATH, { method: "POST" }), ctx);
    expect(res.status).toBe(404);
  });

  it("404 when not a member of the profile workspace", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      makeProfile({ id: TEST_PROFILE_ID, workspace_id: TEST_WORKSPACE_ID_2 }),
    ]);
    mock.setTable("workspace_members", []);
    const { POST } = await import("../[profileId]/route");
    const res = await POST(makeRequest(PATH, { method: "POST" }), ctx);
    expect(res.status).toBe(404);
  });

  it("403 when plan sync limit hit", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      makeProfile({ id: TEST_PROFILE_ID, workspace_id: TEST_WORKSPACE_ID_2 }),
    ]);
    mock.setTable("workspace_members", [
      makeMember({ workspace_id: TEST_WORKSPACE_ID_2 }),
    ]);
    mock.setTable("subscriptions", [
      makeSubscription({
        workspace_id: TEST_WORKSPACE_ID_2,
        plan: "free",
        is_ltd: false,
      }),
    ]);
    mock.setTable("platform_connections", [
      makeConnection({
        id: TEST_WORKSPACE_ID_2,
        workspace_id: TEST_WORKSPACE_ID_2,
        last_synced_at: new Date().toISOString(),
      }),
    ]);
    const { POST } = await import("../[profileId]/route");
    const res = await POST(makeRequest(PATH, { method: "POST" }), ctx);
    expect(res.status).toBe(403);
  });

  it("runs sync and returns result", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      makeProfile({ id: TEST_PROFILE_ID, workspace_id: TEST_WORKSPACE_ID_2 }),
    ]);
    mock.setTable("workspace_members", [
      makeMember({ workspace_id: TEST_WORKSPACE_ID_2 }),
    ]);
    mock.setTable("subscriptions", [
      makeSubscription({
        workspace_id: TEST_WORKSPACE_ID_2,
        plan: "pro",
        is_ltd: false,
      }),
    ]);
    mock.setTable("platform_connections", [
      makeConnection({
        id: TEST_WORKSPACE_ID_2,
        workspace_id: TEST_WORKSPACE_ID_2,
        last_synced_at: daysAgo(2),
      }),
    ]);
    const { POST } = await import("../[profileId]/route");
    const res = await POST(makeRequest(PATH, { method: "POST" }), ctx);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { result: { automationsUpserted: number } };
    expect(body.result.automationsUpserted).toBe(2);
    expect(syncProfile).toHaveBeenCalledWith(TEST_PROFILE_ID);
  });

  it("500 when sync throws", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      makeProfile({ id: TEST_PROFILE_ID, workspace_id: TEST_WORKSPACE_ID_2 }),
    ]);
    mock.setTable("workspace_members", [
      makeMember({ workspace_id: TEST_WORKSPACE_ID_2 }),
    ]);
    mock.setTable("subscriptions", []);
    vi.mocked(syncProfile).mockRejectedValueOnce(new Error("Sync error"));
    const { POST } = await import("../[profileId]/route");
    const res = await POST(makeRequest(PATH, { method: "POST" }), ctx);
    expect(res.status).toBe(500);
  });
});
