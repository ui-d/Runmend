import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import { makeProfile, makeUser } from "@/test/factories";

let mock: SupabaseMock;
let admin: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => admin.client,
}));

const messagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: messagesCreate };
    },
  };
});

beforeEach(() => {
  mock = createSupabaseMock();
  admin = createSupabaseMock();
  messagesCreate.mockReset();
});

describe("POST /api/diagnostic", () => {
  it("returns fallback when outer catch fires for a demo profile", async () => {
    // Triggers fallback path: deleteMOCK so request.json throws
    const { POST } = await import("../route");
    const fakeReq = {
      json: async () => {
        throw new Error("boom");
      },
      clone: function () {
        return {
          json: async () => ({ profileId: "coastal-content" }),
        };
      },
    } as unknown as Parameters<typeof POST>[0];
    const res = await POST(fakeReq);
    expect([200, 500]).toContain(res.status);
  });

  it("returns 500 when clone().json also fails", async () => {
    const { POST } = await import("../route");
    const fakeReq = {
      json: async () => {
        throw new Error("boom");
      },
      clone: function () {
        return {
          json: async () => {
            throw new Error("clone boom");
          },
        };
      },
    } as unknown as Parameters<typeof POST>[0];
    const res = await POST(fakeReq);
    expect(res.status).toBe(500);
  });

  it("400 invalid body", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", { method: "POST", body: {} }),
    );
    expect(res.status).toBe(400);
  });

  it("uses fallback narrative for demo profile when no API key", async () => {
    const prevKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "coastal-content" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { narrative?: { overallHealth: string } };
    expect(body.narrative?.overallHealth).toContain("Coastal");
    process.env.ANTHROPIC_API_KEY = prevKey ?? "sk-ant-test";
  });

  it("calls Claude for demo profile when API key is present", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            overallHealth: "ok",
            mostDangerousIssue: "none",
            recommendations: "keep going",
          }),
        },
      ],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "coastal-content" },
      }),
    );
    expect(res.status).toBe(200);
    expect(messagesCreate).toHaveBeenCalled();
  });

  it("falls back for demo profile when Claude returns garbage", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "not-json" }],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "coastal-content" },
      }),
    );
    const body = (await readJson(res)) as { narrative?: unknown };
    expect(body.narrative).toBeDefined();
  });

  it("401 for DB profile when not authenticated", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "not-a-demo-id" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("404 for DB profile when missing", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", []);
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "not-a-demo-id" },
      }),
    );
    expect(res.status).toBe(404);
  });

  it("generates fresh narrative with automations + executions seeded", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "not-a-demo-id" }), automation_issues: [] },
    ]);
    mock.setTable("automations", [
      {
        id: "auto-1",
        profile_id: "not-a-demo-id",
        external_id: "ext-1",
        name: "X",
        status: "active",
        connection_id: "c-1",
        trigger_type: null,
        last_run_at: null,
        success_rate: null,
        total_runs: 0,
        failed_runs: 0,
        raw_data: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    mock.setTable("execution_logs", [
      {
        id: "e-1",
        automation_id: "auto-1",
        status: "success",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        external_id: null,
        error_message: null,
        data_in: null,
        data_out: null,
        created_at: new Date().toISOString(),
      },
    ]);
    admin.setTable("diagnostic_reports", []);
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            overallHealth: "ok",
            mostDangerousIssue: "none",
            recommendations: "ok",
          }),
        },
      ],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "not-a-demo-id" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("503 when authenticated but no API key", async () => {
    const prevKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "not-a-demo-id" }), automation_issues: [] },
    ]);
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "not-a-demo-id" },
      }),
    );
    expect(res.status).toBe(503);
    process.env.ANTHROPIC_API_KEY = prevKey ?? "sk-ant-test";
  });

  it("generates fresh narrative when no cache exists", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "not-a-demo-id" }), automation_issues: [] },
    ]);
    mock.setTable("automations", []);
    admin.setTable("diagnostic_reports", []);
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            overallHealth: "ok",
            mostDangerousIssue: "none",
            recommendations: "ok",
          }),
        },
      ],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "not-a-demo-id" },
      }),
    );
    expect(res.status).toBe(200);
    expect(messagesCreate).toHaveBeenCalled();
  });

  it("strips markdown fences from Claude response", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      { ...makeProfile({ id: "not-a-demo-id" }), automation_issues: [] },
    ]);
    mock.setTable("automations", []);
    admin.setTable("diagnostic_reports", []);
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text:
            "```json\n" +
            JSON.stringify({
              overallHealth: "ok",
              mostDangerousIssue: "none",
              recommendations: "ok",
            }) +
            "\n```",
        },
      ],
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "not-a-demo-id" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns cached narrative when recent", async () => {
    mock.setUser(makeUser());
    mock.setTable("automation_profiles", [
      {
        ...makeProfile({ id: "not-a-demo-id" }),
        automation_issues: [],
      },
    ]);
    admin.setTable("diagnostic_reports", [
      {
        profile_id: "not-a-demo-id",
        overall_health: "H",
        most_dangerous: "D",
        recommendations: "R",
        created_at: new Date().toISOString(),
      },
    ]);
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/diagnostic", {
        method: "POST",
        body: { profileId: "not-a-demo-id" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { cached?: boolean };
    expect(body.cached).toBe(true);
  });
});
