import { describe, it, expect } from "vitest";
import {
  getNotificationPreferences,
  upsertNotificationPreference,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  createNotificationsForWorkspaceMembers,
} from "@/lib/queries/notifications";
import { createSupabaseMock } from "@/test/supabase-mock";
import { makeNotification, makeMember } from "@/test/factories";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  return { mock, client: mock.client as unknown as SupabaseClient<Database> };
}

describe("getNotificationPreferences", () => {
  it("filters by user and workspace", async () => {
    const { mock, client } = wire();
    mock.setTable("notification_preferences", [
      { user_id: "u-1", workspace_id: "ws-1", channel: "email", is_enabled: true, config: {} },
      { user_id: "u-2", workspace_id: "ws-1", channel: "email", is_enabled: true, config: {} },
    ]);
    const result = await getNotificationPreferences(client, "u-1", "ws-1");
    expect(result).toHaveLength(1);
  });
});

describe("upsertNotificationPreference", () => {
  it("records an upsert with the right shape", async () => {
    const { mock, client } = wire();
    await upsertNotificationPreference(client, {
      userId: "u-1",
      workspaceId: "ws-1",
      channel: "email",
      is_enabled: true,
      config: { email: "test@example.com" } as never,
    });
    const calls = mock.getCalls("notification_preferences");
    const upsert = calls.find((c) => c.op === "upsert");
    expect(upsert).toBeDefined();
    expect(upsert!.payload).toMatchObject({
      user_id: "u-1",
      workspace_id: "ws-1",
      channel: "email",
      is_enabled: true,
    });
  });
});

describe("getUserNotifications", () => {
  it("returns up to limit for the user", async () => {
    const { mock, client } = wire();
    mock.setTable(
      "notifications",
      Array.from({ length: 30 }, (_, i) =>
        makeNotification({ id: `n${i}`, user_id: "u-1" }),
      ),
    );
    const result = await getUserNotifications(client, "u-1", { limit: 10 });
    expect(result).toHaveLength(10);
  });

  it("filters to unread only when requested", async () => {
    const { mock, client } = wire();
    mock.setTable("notifications", [
      makeNotification({ id: "a", user_id: "u-1", is_read: true }),
      makeNotification({ id: "b", user_id: "u-1", is_read: false }),
    ]);
    const result = await getUserNotifications(client, "u-1", { unreadOnly: true });
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });

  it("restricts to workspace when workspaceId is set", async () => {
    const { mock, client } = wire();
    mock.setTable("notifications", [
      makeNotification({ id: "a", user_id: "u-1", workspace_id: "ws-1" }),
      makeNotification({ id: "b", user_id: "u-1", workspace_id: "ws-2" }),
    ]);
    const result = await getUserNotifications(client, "u-1", { workspaceId: "ws-1" });
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("markNotificationRead", () => {
  it("updates is_read=true for the id", async () => {
    const { mock, client } = wire();
    await markNotificationRead(client, "n-1");
    const calls = mock.getCalls("notifications");
    const upd = calls.find((c) => c.op === "update");
    expect(upd!.payload).toMatchObject({ is_read: true });
    expect(upd!.eq).toContainEqual(["id", "n-1"]);
  });
});

describe("markAllNotificationsRead", () => {
  it("filters by user, workspace, and is_read=false", async () => {
    const { mock, client } = wire();
    await markAllNotificationsRead(client, "u-1", "ws-1");
    const upd = mock.getCalls("notifications").find((c) => c.op === "update");
    expect(upd!.eq).toContainEqual(["user_id", "u-1"]);
    expect(upd!.eq).toContainEqual(["workspace_id", "ws-1"]);
    expect(upd!.eq).toContainEqual(["is_read", false]);
  });
});

describe("createNotification", () => {
  it("inserts and returns the row", async () => {
    const { mock, client } = wire();
    const result = await createNotification(client, {
      user_id: "u-1",
      workspace_id: "ws-1",
      title: "Hi",
      body: "Body",
      type: "issue_detected",
    });
    expect(result.title).toBe("Hi");
    expect(mock.getCalls("notifications").some((c) => c.op === "insert")).toBe(true);
  });
});

describe("createNotificationsForWorkspaceMembers", () => {
  it("fans out one notification per member", async () => {
    const { mock, client } = wire();
    mock.setTable("workspace_members", [
      makeMember({ workspace_id: "ws-1", user_id: "u-1" }),
      makeMember({ workspace_id: "ws-1", user_id: "u-2" }),
      makeMember({ workspace_id: "ws-2", user_id: "u-3" }),
    ]);
    await createNotificationsForWorkspaceMembers(client, "ws-1", {
      title: "Hi",
      body: "Body",
      type: "issue_detected",
    });
    const insert = mock.getCalls("notifications").find((c) => c.op === "insert");
    expect(Array.isArray(insert!.payload)).toBe(true);
    expect((insert!.payload as unknown[]).length).toBe(2);
  });

  it("no-ops when there are no members", async () => {
    const { mock, client } = wire();
    mock.setTable("workspace_members", []);
    await createNotificationsForWorkspaceMembers(client, "ws-1", {
      title: "x",
      body: "y",
      type: "t",
    });
    expect(mock.getCalls("notifications").some((c) => c.op === "insert")).toBe(false);
  });
});
