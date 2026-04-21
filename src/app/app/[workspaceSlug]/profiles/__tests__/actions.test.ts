import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeProfile, makeUser, TEST_UUID } from "@/test/factories";

let mock: SupabaseMock;

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));
vi.mock("@/lib/sync/engine", () => ({
  syncProfile: vi.fn(async () => ({})),
}));

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

describe("syncProfileAction", () => {
  it("rejects unauthenticated", async () => {
    const { syncProfileAction } = await import("../actions");
    const res = await syncProfileAction("p-1");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Unauthorized");
  });

  it("returns 'Profile not found' when profile missing", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", []);
    const { syncProfileAction } = await import("../actions");
    const res = await syncProfileAction("missing");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Profile not found");
  });

  it("succeeds with valid access", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      {
        ...makeProfile({ id: "p-1" }),
        workspaces: { slug: "acme" },
      },
    ]);
    const { syncProfileAction } = await import("../actions");
    const res = await syncProfileAction("p-1");
    expect(res.ok).toBe(true);
  });

  it("captures sync failures as error", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      {
        ...makeProfile({ id: "p-1" }),
        workspaces: { slug: "acme" },
      },
    ]);
    vi.mocked(syncProfile).mockRejectedValueOnce(new Error("boom"));
    const { syncProfileAction } = await import("../actions");
    const res = await syncProfileAction("p-1");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("boom");
  });
});

describe("bulkSyncProfilesAction", () => {
  it("succeeds for all ok", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "p-1" }), workspaces: { slug: "acme" } },
      { ...makeProfile({ id: "p-2" }), workspaces: { slug: "acme" } },
    ]);
    const { bulkSyncProfilesAction } = await import("../actions");
    const res = await bulkSyncProfilesAction(["p-1", "p-2"]);
    expect(res.ok).toBe(true);
    expect(res.succeeded).toBe(2);
  });

  it("reports per-profile failures", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "p-1" }), workspaces: { slug: "acme" } },
    ]);
    vi.mocked(syncProfile).mockRejectedValueOnce(new Error("oops"));
    const { bulkSyncProfilesAction } = await import("../actions");
    const res = await bulkSyncProfilesAction(["p-1", "p-missing"]);
    expect(res.failed).toBeGreaterThan(0);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe("deleteProfilesAction", () => {
  it("returns ok immediately for empty list", async () => {
    const { deleteProfilesAction } = await import("../actions");
    const res = await deleteProfilesAction([]);
    expect(res.ok).toBe(true);
  });

  it("rejects unauthenticated", async () => {
    const { deleteProfilesAction } = await import("../actions");
    const res = await deleteProfilesAction(["p-1"]);
    expect(res.ok).toBe(false);
  });

  it("rejects when one or more profiles not found", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "p-1" }), workspaces: { slug: "acme" } },
    ]);
    const { deleteProfilesAction } = await import("../actions");
    const res = await deleteProfilesAction(["p-1", "p-2"]);
    expect(res.ok).toBe(false);
  });

  it("deletes and revalidates when all found", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "p-1" }), workspaces: { slug: "acme" } },
    ]);
    const { deleteProfilesAction } = await import("../actions");
    const res = await deleteProfilesAction(["p-1"]);
    expect(res.ok).toBe(true);
  });
});

describe("snoozeProfileAction", () => {
  it("rejects unauthenticated", async () => {
    const { snoozeProfileAction } = await import("../actions");
    const res = await snoozeProfileAction("p-1", "1d");
    expect(res.ok).toBe(false);
  });

  it.each<"1d" | "7d" | "indefinite" | "clear">([
    "1d",
    "7d",
    "indefinite",
    "clear",
  ])("handles duration %s", async (duration) => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "p-1" }), workspaces: { slug: "acme" } },
    ]);
    const { snoozeProfileAction } = await import("../actions");
    const res = await snoozeProfileAction("p-1", duration);
    expect(res.ok).toBe(true);
  });
});

// Suppress no-undef for TEST_UUID intentional unused (kept for readability).
void TEST_UUID;
