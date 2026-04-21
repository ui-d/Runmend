import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeConnection, makeMember, makeUser, TEST_UUID } from "@/test/factories";

let mock: SupabaseMock;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));
vi.mock("@/lib/sync/engine", () => ({ syncProfile: vi.fn(async () => ({})) }));

import { syncProfile } from "@/lib/sync/engine";

beforeEach(() => {
  mock = createSupabaseMock();
  vi.mocked(syncProfile).mockReset().mockResolvedValue({
    automationsUpserted: 0,
    executionsInserted: 0,
    issuesDetected: 0,
    healthScore: 100,
    errors: [],
  });
});

describe("syncConnectionAction", () => {
  it("rejects unauthenticated", async () => {
    const { syncConnectionAction } = await import("../actions");
    const res = await syncConnectionAction("c-1");
    expect(res.ok).toBe(false);
  });

  it("returns 'Connection not found' when missing", async () => {
    mock.setUser(makeUser());
    mock.setTable("platform_connections", []);
    const { syncConnectionAction } = await import("../actions");
    const res = await syncConnectionAction("c-missing");
    expect(res.ok).toBe(false);
  });

  it("reports 'No profiles on this platform' when no linked or matching profiles", async () => {
    mock.setUser(makeUser());
    mock.setTable("platform_connections", [
      {
        ...makeConnection({ id: "c-1", platform: "make" }),
        workspaces: { slug: "acme" },
      },
    ]);
    mock.setTable("automations", []);
    mock.setTable("automation_profiles", []);
    const { syncConnectionAction } = await import("../actions");
    const res = await syncConnectionAction("c-1");
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/No profiles/);
  });

  it("syncs all matching profiles", async () => {
    mock.setUser(makeUser());
    mock.setTable("platform_connections", [
      {
        ...makeConnection({ id: "c-1", platform: "make" }),
        workspaces: { slug: "acme" },
      },
    ]);
    mock.setTable("automations", [
      { connection_id: "c-1", profile_id: "p-1" },
      { connection_id: "c-1", profile_id: "p-2" },
    ]);
    const { syncConnectionAction } = await import("../actions");
    const res = await syncConnectionAction("c-1");
    expect(res.ok).toBe(true);
    expect(res.profilesSynced).toBe(2);
  });
});

describe("toggleInterestAction", () => {
  it("rejects unauthenticated", async () => {
    const { toggleInterestAction } = await import("../actions");
    const res = await toggleInterestAction(TEST_UUID, "bardeen");
    expect(res.ok).toBe(false);
  });

  it("rejects non-members", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", []);
    const { toggleInterestAction } = await import("../actions");
    const res = await toggleInterestAction(TEST_UUID, "bardeen");
    expect(res.ok).toBe(false);
  });

  it("inserts a vote when none exists", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember()]);
    mock.setTable("connection_interest", []);
    const { toggleInterestAction } = await import("../actions");
    const res = await toggleInterestAction(TEST_UUID, "bardeen");
    expect(res.ok).toBe(true);
    expect(res.voted).toBe(true);
  });

  it("removes a vote when it exists", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember()]);
    mock.setTable("connection_interest", [
      {
        id: "int-1",
        workspace_id: TEST_UUID,
        user_id: makeUser().id,
        platform_slug: "bardeen",
      },
    ]);
    const { toggleInterestAction } = await import("../actions");
    const res = await toggleInterestAction(TEST_UUID, "bardeen");
    expect(res.ok).toBe(true);
    expect(res.voted).toBe(false);
  });
});

describe("requestConnectorAction", () => {
  it("rejects unauthenticated", async () => {
    const { requestConnectorAction } = await import("../actions");
    const res = await requestConnectorAction(TEST_UUID, { platformSlug: "foo" });
    expect(res.ok).toBe(false);
  });

  it("rejects non-members", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", []);
    const { requestConnectorAction } = await import("../actions");
    const res = await requestConnectorAction(TEST_UUID, { platformSlug: "foo" });
    expect(res.ok).toBe(false);
  });

  it("rejects empty or overlong platform slug", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember()]);
    const { requestConnectorAction } = await import("../actions");
    expect((await requestConnectorAction(TEST_UUID, { platformSlug: "" })).ok).toBe(false);
    expect(
      (await requestConnectorAction(TEST_UUID, { platformSlug: "x".repeat(200) })).ok,
    ).toBe(false);
  });

  it("inserts a request when valid", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember()]);
    mock.setTable("connection_requests", []);
    const { requestConnectorAction } = await import("../actions");
    const res = await requestConnectorAction(TEST_UUID, {
      platformSlug: "flux",
      note: "please",
    });
    expect(res.ok).toBe(true);
  });
});
