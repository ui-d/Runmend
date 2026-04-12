import { describe, it, expect } from "vitest";
import { calculateHealthScore } from "../health-calculator";
import type { Database } from "@/lib/database.types";

type AutomationRow = Database["public"]["Tables"]["automations"]["Row"];
type ExecutionLogRow = Database["public"]["Tables"]["execution_logs"]["Row"];

// --- Helpers ---

function makeAutomation(
  overrides: Partial<AutomationRow> = {}
): AutomationRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    connection_id: "conn-1",
    profile_id: "profile-1",
    external_id: "ext-1",
    name: "Test Automation",
    status: "active",
    trigger_type: null,
    last_run_at: null,
    success_rate: null,
    total_runs: 0,
    failed_runs: 0,
    raw_data: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeExecution(
  automationId: string,
  overrides: Partial<ExecutionLogRow> = {}
): ExecutionLogRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    automation_id: automationId,
    external_id: null,
    status: "success",
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    error_message: null,
    data_in: null,
    data_out: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// --- Tests ---

describe("calculateHealthScore", () => {
  it("returns 100 for zero automations", () => {
    expect(calculateHealthScore([], [])).toBe(100);
  });

  it("returns 100 for all-success recent executions with full coverage", () => {
    const auto = makeAutomation({ id: "a1" });
    const execs = Array.from({ length: 10 }, () =>
      makeExecution("a1", { started_at: hoursAgo(2) })
    );
    const score = calculateHealthScore([auto], execs);
    expect(score).toBe(100);
  });

  it("returns a low score when all executions are errors", () => {
    const auto = makeAutomation({ id: "a1" });
    const execs = Array.from({ length: 10 }, () =>
      makeExecution("a1", {
        started_at: hoursAgo(2),
        status: "error",
      })
    );
    const score = calculateHealthScore([auto], execs);
    // Error rate = 0% success => errorRateScore=0 (40% weight = 0)
    // Inactive score = 100, Coverage = 100, Trend = 100 (ratio=1)
    // Total: 0*0.4 + 100*0.2 + 100*0.2 + 100*0.2 = 60
    expect(score).toBeLessThanOrEqual(60);
  });

  it("penalizes inactive automations", () => {
    const auto1 = makeAutomation({ id: "a1" });
    const auto2 = makeAutomation({ id: "a2" });
    // Only a1 has executions
    const execs = [makeExecution("a1", { started_at: hoursAgo(2) })];
    const score = calculateHealthScore([auto1, auto2], execs);
    // Inactive score: 1/2 active automations with execs = 50
    // Coverage: 1/2 covered = 50
    expect(score).toBeLessThan(100);
  });

  it("detects failure trend spike", () => {
    const auto = makeAutomation({ id: "a1" });
    // 7-day: 20 execs, 2 errors (10% error rate)
    const weeklyExecs = Array.from({ length: 18 }, () =>
      makeExecution("a1", { started_at: daysAgo(3) })
    );
    const weeklyErrors = Array.from({ length: 2 }, () =>
      makeExecution("a1", { started_at: daysAgo(3), status: "error" })
    );
    // Last 24h: 5 execs, 4 errors (80% error rate — 8x spike)
    const dailyExecs = [
      makeExecution("a1", { started_at: hoursAgo(2) }),
    ];
    const dailyErrors = Array.from({ length: 4 }, () =>
      makeExecution("a1", { started_at: hoursAgo(2), status: "error" })
    );

    const allExecs = [
      ...weeklyExecs,
      ...weeklyErrors,
      ...dailyExecs,
      ...dailyErrors,
    ];
    const score = calculateHealthScore([auto], allExecs);
    // High daily error rate should pull score down
    expect(score).toBeLessThan(80);
  });

  it("returns a score between 0 and 100 for mixed data", () => {
    const autos = [
      makeAutomation({ id: "a1" }),
      makeAutomation({ id: "a2" }),
      makeAutomation({ id: "a3", status: "inactive" }),
    ];
    const execs = [
      makeExecution("a1", { started_at: hoursAgo(1) }),
      makeExecution("a1", { started_at: hoursAgo(5), status: "error" }),
      makeExecution("a2", { started_at: daysAgo(2) }),
    ];
    const score = calculateHealthScore(autos, execs);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("ignores executions older than 7 days for error rate and inactive", () => {
    const auto = makeAutomation({ id: "a1" });
    // Old errors should not count
    const oldErrors = Array.from({ length: 10 }, () =>
      makeExecution("a1", { started_at: daysAgo(10), status: "error" })
    );
    // Recent successes
    const recentSuccess = [
      makeExecution("a1", { started_at: hoursAgo(1) }),
    ];
    const score = calculateHealthScore([auto], [...oldErrors, ...recentSuccess]);
    // Error rate should be 100% success (only 1 recent exec, success)
    expect(score).toBeGreaterThanOrEqual(80);
  });
});
