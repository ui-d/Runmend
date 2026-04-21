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
    const { POST } = await import("../dismiss/route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: [TEST_UUID] },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400 invalid body", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../dismiss/route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: [] },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 when body is not JSON", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../dismiss/route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns dismissed and requested counts", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_issues", [
      makeIssue({ id: "i-1", status: "open" }),
      makeIssue({ id: "i-2", status: "open" }),
    ]);
    const { POST } = await import("../dismiss/route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: [TEST_UUID, TEST_UUID_2] },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { dismissed: number; requested: number };
    expect(body.requested).toBe(2);
  });

  it("propagates supabase errors as 500", async () => {
    mock.setUser(makeUser());
    mock.setTableError("automation_issues", { message: "RLS denied" });
    const { POST } = await import("../dismiss/route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: [TEST_UUID] },
      }),
    );
    expect(res.status).toBe(500);
  });

  it("returns dismissed=0 when no open issues match", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_issues", []);
    const { POST } = await import("../dismiss/route");
    const res = await POST(
      makeRequest("/api/issues/dismiss", {
        method: "POST",
        body: { issueIds: [TEST_UUID] },
      }),
    );
    expect(res.status).toBe(200);
  });
});
