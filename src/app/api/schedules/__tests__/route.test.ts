import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import { makeUser } from "@/test/factories";

let mock: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));

beforeEach(() => {
  mock = createSupabaseMock();
});

const ctx = { params: Promise.resolve({ profileId: "p-1" }) };

describe("schedules GET", () => {
  it("401 unauthenticated", async () => {
    const { GET } = await import("../[profileId]/route");
    const res = await GET(makeRequest("/api/schedules/p-1"), ctx);
    expect(res.status).toBe(401);
  });

  it("returns the schedule when authenticated", async () => {
    mock.setUser(makeUser());
    mock.setTable("audit_schedules", []);
    const { GET } = await import("../[profileId]/route");
    const res = await GET(makeRequest("/api/schedules/p-1"), ctx);
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { schedule: unknown };
    expect(body.schedule).toBeNull();
  });
});

describe("schedules POST", () => {
  it("400 invalid body", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../[profileId]/route");
    const res = await POST(
      makeRequest("/api/schedules/p-1", { method: "POST", body: {} }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("upserts a schedule", async () => {
    mock.setUser(makeUser());
    mock.setTable("audit_schedules", []);
    const { POST } = await import("../[profileId]/route");
    const res = await POST(
      makeRequest("/api/schedules/p-1", {
        method: "POST",
        body: { cronExpression: "0 8 * * *", isActive: true },
      }),
      ctx,
    );
    expect(res.status).toBe(200);
  });
});

describe("schedules PATCH", () => {
  it("401 unauthenticated", async () => {
    const { PATCH } = await import("../[profileId]/route");
    const res = await PATCH(
      makeRequest("/api/schedules/p-1", { method: "PATCH", body: { isActive: true } }),
      ctx,
    );
    expect(res.status).toBe(401);
  });

  it("400 invalid body", async () => {
    mock.setUser(makeUser());
    const { PATCH } = await import("../[profileId]/route");
    const res = await PATCH(
      makeRequest("/api/schedules/p-1", { method: "PATCH", body: {} }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("toggles is_active", async () => {
    mock.setUser(makeUser());
    const { PATCH } = await import("../[profileId]/route");
    const res = await PATCH(
      makeRequest("/api/schedules/p-1", {
        method: "PATCH",
        body: { isActive: false },
      }),
      ctx,
    );
    expect(res.status).toBe(200);
  });
});

describe("schedules POST unauthenticated", () => {
  it("401 unauthenticated", async () => {
    const { POST } = await import("../[profileId]/route");
    const res = await POST(
      makeRequest("/api/schedules/p-1", {
        method: "POST",
        body: { cronExpression: "0 8 * * *" },
      }),
      ctx,
    );
    expect(res.status).toBe(401);
  });
});
