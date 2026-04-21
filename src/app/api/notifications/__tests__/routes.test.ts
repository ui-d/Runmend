import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import {
  makeMember,
  makeNotification,
  makeUser,
  TEST_UUID,
  TEST_NOTIFICATION_ID,
} from "@/test/factories";

let mock: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));

beforeEach(() => {
  mock = createSupabaseMock();
});

describe("GET /api/notifications", () => {
  it("401 unauthenticated", async () => {
    const { GET } = await import("../route");
    const res = await GET(makeRequest("/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("falls back to defaults when query params are invalid", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("notifications", [
      makeNotification({ id: "n-1", user_id: "u-1" }),
    ]);
    const { GET } = await import("../route");
    const res = await GET(
      makeRequest("/api/notifications", {
        searchParams: { limit: "NaN", workspaceId: "not-uuid" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("500 when query throws", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTableError("notifications", { message: "rls" });
    const { GET } = await import("../route");
    const res = await GET(makeRequest("/api/notifications"));
    expect(res.status).toBe(500);
  });

  it("returns notifications for the user", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("notifications", [
      makeNotification({ id: "n-1", user_id: "u-1" }),
      makeNotification({ id: "n-2", user_id: "u-2" }),
    ]);
    const { GET } = await import("../route");
    const res = await GET(makeRequest("/api/notifications"));
    const body = (await readJson(res)) as { notifications: Array<{ id: string }> };
    expect(body.notifications.map((n) => n.id)).toEqual(["n-1"]);
  });

  it("applies unreadOnly filter", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("notifications", [
      makeNotification({ id: "n-1", user_id: "u-1", is_read: true }),
      makeNotification({ id: "n-2", user_id: "u-1", is_read: false }),
    ]);
    const { GET } = await import("../route");
    const res = await GET(
      makeRequest("/api/notifications", {
        searchParams: { unreadOnly: "true" },
      }),
    );
    const body = (await readJson(res)) as { notifications: Array<{ id: string }> };
    expect(body.notifications.map((n) => n.id)).toEqual(["n-2"]);
  });
});

describe("PATCH /api/notifications/[id]/read", () => {
  const ctx = { params: Promise.resolve({ notificationId: TEST_NOTIFICATION_ID }) };
  const path = `/api/notifications/${TEST_NOTIFICATION_ID}/read`;

  it("401 unauthenticated", async () => {
    const { PATCH } = await import("../[notificationId]/read/route");
    const res = await PATCH(makeRequest(path, { method: "PATCH" }), ctx);
    expect(res.status).toBe(401);
  });

  it("400 when id is not a UUID", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    const { PATCH } = await import("../[notificationId]/read/route");
    const res = await PATCH(
      makeRequest("/api/notifications/garbage/read", { method: "PATCH" }),
      { params: Promise.resolve({ notificationId: "garbage" }) },
    );
    expect(res.status).toBe(400);
  });

  it("500 when update throws", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTableError("notifications", { message: "rls" });
    const { PATCH } = await import("../[notificationId]/read/route");
    const res = await PATCH(makeRequest(path, { method: "PATCH" }), ctx);
    expect(res.status).toBe(500);
  });

  it("marks a notification as read", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("notifications", [
      makeNotification({
        id: TEST_NOTIFICATION_ID,
        user_id: "u-1",
        is_read: false,
      }),
    ]);
    const { PATCH } = await import("../[notificationId]/read/route");
    const res = await PATCH(makeRequest(path, { method: "PATCH" }), ctx);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/notifications/mark-all-read", () => {
  it("401 unauthenticated", async () => {
    const { POST } = await import("../mark-all-read/route");
    const res = await POST(
      makeRequest("/api/notifications/mark-all-read", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400 invalid body", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../mark-all-read/route");
    const res = await POST(
      makeRequest("/api/notifications/mark-all-read", {
        method: "POST",
        body: {},
      }),
    );
    expect(res.status).toBe(400);
  });

  it("403 when not member", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", []);
    const { POST } = await import("../mark-all-read/route");
    const res = await POST(
      makeRequest("/api/notifications/mark-all-read", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("marks all when member", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    const { POST } = await import("../mark-all-read/route");
    const res = await POST(
      makeRequest("/api/notifications/mark-all-read", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(200);
  });
});
