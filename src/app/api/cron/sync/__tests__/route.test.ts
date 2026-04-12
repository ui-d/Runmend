import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => "mock-admin-client"),
}));

vi.mock("@/lib/sync/engine", () => ({
  syncProfile: vi.fn(),
}));

vi.mock("@/lib/queries/schedules", () => ({
  getDueSchedules: vi.fn(),
  updateScheduleAfterRun: vi.fn(),
}));

import { syncProfile } from "@/lib/sync/engine";
import { getDueSchedules, updateScheduleAfterRun } from "@/lib/queries/schedules";

const mockSync = vi.mocked(syncProfile);
const mockGetDue = vi.mocked(getDueSchedules);
const mockUpdateSchedule = vi.mocked(updateScheduleAfterRun);

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) {
    headers.set("authorization", authHeader);
  }
  return new NextRequest("http://localhost:3000/api/cron/sync", {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.CRON_SECRET = "test-secret";
});

describe("GET /api/cron/sync", () => {
  it("returns 401 without authorization header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 with wrong token", async () => {
    const res = await GET(makeRequest("Bearer wrong-token"));
    expect(res.status).toBe(401);
  });

  it("returns 401 if CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(401);
  });

  it("syncs due profiles and returns summary", async () => {
    mockGetDue.mockResolvedValueOnce([
      { id: "sched-1", profile_id: "p-1", cron_expression: "0 8 * * *" },
      { id: "sched-2", profile_id: "p-2", cron_expression: "0 12 * * *" },
    ]);
    mockSync
      .mockResolvedValueOnce({
        automationsUpserted: 5,
        executionsInserted: 10,
        issuesDetected: 2,
        healthScore: 85,
        errors: [],
      })
      .mockResolvedValueOnce({
        automationsUpserted: 3,
        executionsInserted: 7,
        issuesDetected: 0,
        healthScore: 95,
        errors: [],
      });
    mockUpdateSchedule.mockResolvedValue(undefined);

    const res = await GET(makeRequest("Bearer test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.synced).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.total).toBe(2);
    expect(body.results).toHaveLength(2);
    expect(body.results[0].status).toBe("success");
    expect(body.results[0].healthScore).toBe(85);
  });

  it("handles sync failure for individual profiles", async () => {
    mockGetDue.mockResolvedValueOnce([
      { id: "sched-1", profile_id: "p-1", cron_expression: "0 8 * * *" },
    ]);
    mockSync.mockRejectedValueOnce(new Error("Connection not found"));
    mockUpdateSchedule.mockResolvedValue(undefined);

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();

    expect(body.synced).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.results[0].status).toBe("error");
    expect(body.results[0].error).toBe("Connection not found");
  });

  it("returns empty results when no schedules are due", async () => {
    mockGetDue.mockResolvedValueOnce([]);

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();

    expect(body.synced).toBe(0);
    expect(body.total).toBe(0);
    expect(body.results).toHaveLength(0);
  });
});
