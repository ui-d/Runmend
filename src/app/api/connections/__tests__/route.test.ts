import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import { makeMember, makeUser, makeConnection, TEST_UUID } from "@/test/factories";
import type { PlatformAdapter } from "@/lib/platform-adapters/types";

let mock: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace(/^enc:/, ""),
}));

const fakeAdapter: PlatformAdapter = {
  testConnection: vi.fn(async () => ({ ok: true, metadata: { teamId: 42 } })),
  fetchAutomations: vi.fn(async () => []),
  fetchExecutionLogs: vi.fn(async () => []),
};

vi.mock("@/lib/platform-adapters", () => ({
  createAdapter: vi.fn(() => fakeAdapter),
}));

import { POST } from "../route";

beforeEach(() => {
  mock = createSupabaseMock();
  vi.mocked(fakeAdapter.testConnection).mockReset().mockResolvedValue({
    ok: true,
    metadata: { teamId: 42 },
  });
});

describe("POST /api/connections", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await POST(
      makeRequest("/api/connections", {
        method: "POST",
        body: { workspaceId: TEST_UUID, platform: "make", apiKey: "key" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    mock.setUser(makeUser());
    const res = await POST(
      makeRequest("/api/connections", { method: "POST", body: {} }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when not a member of the workspace", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", []);
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
    expect(res.status).toBe(403);
  });

  it("creates and returns the connection when everything validates", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("platform_connections", []);
    const res = await POST(
      makeRequest("/api/connections", {
        method: "POST",
        body: {
          workspaceId: TEST_UUID,
          platform: "make",
          apiKey: "secret",
          zone: "eu1",
          displayName: "Primary",
        },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { connection?: unknown; testResult?: { ok: boolean } };
    expect(body.connection).toBeDefined();
    expect(body.testResult?.ok).toBe(true);
  });

  it("propagates adapter failures as error status in the connection row", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("platform_connections", []);
    vi.mocked(fakeAdapter.testConnection).mockResolvedValueOnce({
      ok: false,
      error: "Bad token",
    });
    const res = await POST(
      makeRequest("/api/connections", {
        method: "POST",
        body: {
          workspaceId: TEST_UUID,
          platform: "make",
          apiKey: "secret",
          zone: "eu1",
        },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { testResult?: { ok: boolean; error?: string } };
    expect(body.testResult?.ok).toBe(false);
    expect(body.testResult?.error).toBe("Bad token");
  });
});

describe("connections/[connectionId] DELETE", () => {
  it("deletes the connection when authenticated", async () => {
    const { DELETE } = await import(
      "../[connectionId]/route"
    );
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("platform_connections", [makeConnection({ id: "c-1" })]);
    const res = await DELETE(
      makeRequest("/api/connections/c-1", { method: "DELETE" }),
      { params: Promise.resolve({ connectionId: "c-1" }) },
    );
    expect(res.status).toBe(200);
  });

  it("returns 401 when unauthenticated", async () => {
    const { DELETE } = await import("../[connectionId]/route");
    const res = await DELETE(
      makeRequest("/api/connections/c-1", { method: "DELETE" }),
      { params: Promise.resolve({ connectionId: "c-1" }) },
    );
    expect(res.status).toBe(401);
  });
});

describe("connections/[connectionId]/test POST", () => {
  it("returns 401 when unauthenticated", async () => {
    const { POST: testPost } = await import(
      "../[connectionId]/test/route"
    );
    const res = await testPost(
      makeRequest("/api/connections/c-1/test", { method: "POST" }),
      { params: Promise.resolve({ connectionId: "c-1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when connection not found", async () => {
    const { POST: testPost } = await import("../[connectionId]/test/route");
    mock.setUser(makeUser());
    mock.setTable("platform_connections", []);
    const res = await testPost(
      makeRequest("/api/connections/c-1/test", { method: "POST" }),
      { params: Promise.resolve({ connectionId: "c-1" }) },
    );
    expect(res.status).toBe(404);
  });

  it("tests an existing connection", async () => {
    const { POST: testPost } = await import("../[connectionId]/test/route");
    mock.setUser(makeUser());
    mock.setTable("platform_connections", [
      makeConnection({
        id: "c-1",
        platform: "make",
        api_key_encrypted: "enc:k",
        zone: "eu1",
      }),
    ]);
    const res = await testPost(
      makeRequest("/api/connections/c-1/test", { method: "POST" }),
      { params: Promise.resolve({ connectionId: "c-1" }) },
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
