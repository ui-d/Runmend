/**
 * Cross-route tests for 500/error branches. Kept separate from the per-route
 * happy-path test files so each branch-coverage nudge lives in one place.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest } from "@/test/next-mocks";
import {
  makeConnection,
  makeMember,
  makeUser,
  TEST_UUID,
} from "@/test/factories";

let mock: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));
vi.mock("@/lib/crypto", () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace(/^enc:/, ""),
}));
vi.mock("@/lib/platform-adapters", () => ({
  createAdapter: vi.fn(() => ({
    testConnection: vi.fn(async () => ({ ok: true })),
    fetchAutomations: vi.fn(async () => []),
    fetchExecutionLogs: vi.fn(async () => []),
  })),
}));

beforeEach(() => {
  mock = createSupabaseMock();
});

describe("500 error paths", () => {
  it("connections POST returns 500 when supabase throws", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTableError("platform_connections", { message: "db down" });
    const { POST } = await import("../connections/route");
    const res = await POST(
      makeRequest("/api/connections", {
        method: "POST",
        body: {
          workspaceId: TEST_UUID,
          platform: "make",
          apiKey: "k",
          zone: "eu1",
        },
      }),
    );
    expect(res.status).toBe(500);
  });

  it("connections DELETE returns 500 on error", async () => {
    mock.setUser(makeUser());
    mock.setTableError("platform_connections", { message: "db" });
    const { DELETE } = await import(
      "../connections/[connectionId]/route"
    );
    const res = await DELETE(
      makeRequest("/api/connections/c-1", { method: "DELETE" }),
      { params: Promise.resolve({ connectionId: "c-1" }) },
    );
    expect(res.status).toBe(500);
  });

  it("connection test POST handles connection with no api_key", async () => {
    mock.setUser(makeUser());
    mock.setTable("platform_connections", [
      makeConnection({
        id: "c-1",
        platform: "make",
        api_key_encrypted: null,
        zone: "eu1",
      }),
    ]);
    const { POST } = await import(
      "../connections/[connectionId]/test/route"
    );
    const res = await POST(
      makeRequest("/api/connections/c-1/test", { method: "POST" }),
      { params: Promise.resolve({ connectionId: "c-1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("schedules GET returns 500 when supabase throws", async () => {
    mock.setUser(makeUser());
    mock.setTableError("audit_schedules", { message: "db" });
    const { GET } = await import("../schedules/[profileId]/route");
    const res = await GET(makeRequest("/api/schedules/p-1"), {
      params: Promise.resolve({ profileId: "p-1" }),
    });
    expect(res.status).toBe(500);
  });

  it("schedules POST returns 500 when upsert throws", async () => {
    mock.setUser(makeUser());
    mock.setTableError("audit_schedules", { message: "db" });
    const { POST } = await import("../schedules/[profileId]/route");
    const res = await POST(
      makeRequest("/api/schedules/p-1", {
        method: "POST",
        body: { cronExpression: "0 8 * * *", isActive: true },
      }),
      { params: Promise.resolve({ profileId: "p-1" }) },
    );
    expect(res.status).toBe(500);
  });

  it("schedules PATCH returns 500 when toggle throws", async () => {
    mock.setUser(makeUser());
    mock.setTableError("audit_schedules", { message: "db" });
    const { PATCH } = await import("../schedules/[profileId]/route");
    const res = await PATCH(
      makeRequest("/api/schedules/p-1", {
        method: "PATCH",
        body: { isActive: false },
      }),
      { params: Promise.resolve({ profileId: "p-1" }) },
    );
    expect(res.status).toBe(500);
  });

  it("mark-all-read returns 500 on failure", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", [makeMember()]);
    mock.setTableError("notifications", { message: "rls" });
    const { POST } = await import("../notifications/mark-all-read/route");
    const res = await POST(
      makeRequest("/api/notifications/mark-all-read", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(500);
  });

  it("portal returns 401 unauthenticated", async () => {
    const { POST } = await import("../billing/portal/route");
    const res = await POST(
      makeRequest("/api/billing/portal", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("portal returns 400 on invalid body", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../billing/portal/route");
    const res = await POST(
      makeRequest("/api/billing/portal", { method: "POST", body: {} }),
    );
    expect(res.status).toBe(400);
  });

  it("portal returns 403 when not a member", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", []);
    const { POST } = await import("../billing/portal/route");
    const res = await POST(
      makeRequest("/api/billing/portal", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("invoices returns 401 unauthenticated", async () => {
    const { GET } = await import("../billing/invoices/route");
    const res = await GET(makeRequest("/api/billing/invoices"));
    expect(res.status).toBe(401);
  });

  it("invoices returns 403 when not member", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", []);
    const { GET } = await import("../billing/invoices/route");
    const res = await GET(
      makeRequest("/api/billing/invoices", {
        searchParams: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("claim-ltd returns 503 when not configured", async () => {
    const prev = process.env.STRIPE_PRICE_LTD;
    process.env.STRIPE_PRICE_LTD = "";
    vi.resetModules();
    mock.setUser(makeUser());
    const { POST } = await import("../billing/claim-ltd/route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect([401, 503]).toContain(res.status);
    process.env.STRIPE_PRICE_LTD = prev ?? "price_ltd";
    vi.resetModules();
  });

  it("claim-ltd returns 401 unauthenticated", async () => {
    const { POST } = await import("../billing/claim-ltd/route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("claim-ltd returns 400 on invalid body", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../billing/claim-ltd/route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", { method: "POST", body: {} }),
    );
    expect(res.status).toBe(400);
  });

  it("claim-ltd returns 403 when not member", async () => {
    mock.setUser(makeUser());
    mock.setTable("workspace_members", []);
    const { POST } = await import("../billing/claim-ltd/route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(403);
  });

});
