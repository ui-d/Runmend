import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import { makeIssue, makeUser, TEST_UUID, TEST_UUID_2 } from "@/test/factories";

let mock: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));

beforeEach(() => {
  mock = createSupabaseMock();
});

describe("POST /api/issues/dismiss", () => {
  it("401 unauthenticated", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: [TEST_UUID] },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400 invalid body (empty array)", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: [] },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 when ids are not UUIDs", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: ["not-a-uuid"] },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns dismissed count on success", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_issues", [
      makeIssue({ id: TEST_UUID, status: "open" }),
      makeIssue({ id: TEST_UUID_2, status: "open" }),
    ]);
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: [TEST_UUID, TEST_UUID_2] },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as {
      dismissed: number;
      requested: number;
    };
    expect(body.requested).toBe(2);
  });

  it("500 on db error", async () => {
    mock.setUser(makeUser());
    mock.setTableError("automation_issues", { message: "rls denied" });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: [TEST_UUID] },
      }),
    );
    expect(res.status).toBe(500);
  });
});
