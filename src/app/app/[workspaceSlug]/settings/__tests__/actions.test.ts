import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeMember, makeUser, TEST_UUID } from "@/test/factories";

let mock: SupabaseMock;

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));

beforeEach(() => {
  mock = createSupabaseMock();
});

describe("updateWorkspaceNameAction", () => {
  it("rejects invalid input", async () => {
    const { updateWorkspaceNameAction } = await import("../actions");
    const res = await updateWorkspaceNameAction({
      workspaceId: "not-a-uuid",
      name: "New",
      workspaceSlug: "slug",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects when not authenticated", async () => {
    const { updateWorkspaceNameAction } = await import("../actions");
    const res = await updateWorkspaceNameAction({
      workspaceId: TEST_UUID,
      name: "New",
      workspaceSlug: "slug",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects non-admin members", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember({ role: "viewer" })]);
    const { updateWorkspaceNameAction } = await import("../actions");
    const res = await updateWorkspaceNameAction({
      workspaceId: TEST_UUID,
      name: "New",
      workspaceSlug: "slug",
    });
    expect(res.ok).toBe(false);
  });

  it("updates the workspace name for an owner", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember({ role: "owner" })]);
    const { updateWorkspaceNameAction } = await import("../actions");
    const res = await updateWorkspaceNameAction({
      workspaceId: TEST_UUID,
      name: "Acme Renamed",
      workspaceSlug: "acme",
    });
    expect(res.ok).toBe(true);
  });
});

describe("updateAccountNameAction", () => {
  it("rejects invalid input", async () => {
    const { updateAccountNameAction } = await import("../actions");
    const res = await updateAccountNameAction({
      fullName: "x".repeat(200),
      workspaceSlug: "s",
    });
    expect(res.ok).toBe(false);
  });

  it("rejects when not authenticated", async () => {
    const { updateAccountNameAction } = await import("../actions");
    const res = await updateAccountNameAction({
      fullName: "Alice",
      workspaceSlug: "s",
    });
    expect(res.ok).toBe(false);
  });

  it("updates the account name", async () => {
    mock.setUser(makeUser());
    const { updateAccountNameAction } = await import("../actions");
    const res = await updateAccountNameAction({
      fullName: "Alice",
      workspaceSlug: "s",
    });
    expect(res.ok).toBe(true);
  });

  it("writes null when fullName is empty string", async () => {
    mock.setUser(makeUser());
    const { updateAccountNameAction } = await import("../actions");
    await updateAccountNameAction({ fullName: "", workspaceSlug: "s" });
    const update = mock.getCalls("users").find((c) => c.op === "update");
    expect((update!.payload as Record<string, unknown>).full_name).toBeNull();
  });
});

describe("updateNotificationPreferenceAction", () => {
  const fullConfig = {
    severities: ["critical", "warning", "info"],
    event_types: ["issue_detected"],
    muted_profile_ids: [],
    quiet_hours: null,
    digest: null,
  };

  it("rejects invalid input", async () => {
    const { updateNotificationPreferenceAction } = await import("../actions");
    const res = await updateNotificationPreferenceAction({
      workspaceId: "bad",
      workspaceSlug: "s",
      channel: "email",
      is_enabled: true,
      config: fullConfig,
    });
    expect(res.ok).toBe(false);
  });

  it("rejects unauthenticated", async () => {
    const { updateNotificationPreferenceAction } = await import("../actions");
    const res = await updateNotificationPreferenceAction({
      workspaceId: TEST_UUID,
      workspaceSlug: "s",
      channel: "email",
      is_enabled: true,
      config: fullConfig,
    });
    expect(res.ok).toBe(false);
  });

  it("rejects non-members", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", []);
    const { updateNotificationPreferenceAction } = await import("../actions");
    const res = await updateNotificationPreferenceAction({
      workspaceId: TEST_UUID,
      workspaceSlug: "s",
      channel: "email",
      is_enabled: true,
      config: fullConfig,
    });
    expect(res.ok).toBe(false);
  });

  it("upserts for a member", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember()]);
    const { updateNotificationPreferenceAction } = await import("../actions");
    const res = await updateNotificationPreferenceAction({
      workspaceId: TEST_UUID,
      workspaceSlug: "s",
      channel: "email",
      is_enabled: true,
      config: fullConfig,
    });
    expect(res.ok).toBe(true);
  });
});
