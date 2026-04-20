import { describe, it, expect } from "vitest";
import { detectIssues } from "../issue-detector";
import type { Database } from "@/lib/database.types";

type AutomationRow = Database["public"]["Tables"]["automations"]["Row"];
type ExecutionLogRow = Database["public"]["Tables"]["execution_logs"]["Row"];
type ConnectionRow = Database["public"]["Tables"]["platform_connections"]["Row"];

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

function makeConnection(
  overrides: Partial<ConnectionRow> = {}
): ConnectionRow {
  return {
    id: "conn-1",
    workspace_id: "ws-1",
    platform: "make",
    auth_type: "api_key",
    credentials_vault_id: null,
    access_token_encrypted: null,
    refresh_token_encrypted: null,
    token_expires_at: null,
    api_key_encrypted: "encrypted-key",
    instance_url: null,
    zone: null,
    team_id: null,
    display_name: "Primary",
    last_tested_at: null,
    status: "active",
    last_synced_at: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// --- Tests ---

describe("detectIssues", () => {
  describe("Rule 1: Silent failure", () => {
    it("detects active automation with old executions but none in 7 days", () => {
      const auto = makeAutomation({ id: "a1" });
      const oldExec = makeExecution("a1", { started_at: daysAgo(10) });
      const issues = detectIssues([auto], [oldExec], makeConnection());
      const silent = issues.find((i) => i.name === "Silent failure detected");
      expect(silent).toBeDefined();
      expect(silent!.severity).toBe("critical");
    });

    it("does not flag automations with recent executions", () => {
      const auto = makeAutomation({ id: "a1" });
      const recentExec = makeExecution("a1", { started_at: hoursAgo(2) });
      const issues = detectIssues([auto], [recentExec], makeConnection());
      expect(issues.find((i) => i.name === "Silent failure detected")).toBeUndefined();
    });

    it("does not flag inactive automations", () => {
      const auto = makeAutomation({ id: "a1", status: "inactive" });
      const oldExec = makeExecution("a1", { started_at: daysAgo(10) });
      const issues = detectIssues([auto], [oldExec], makeConnection());
      expect(issues.find((i) => i.name === "Silent failure detected")).toBeUndefined();
    });
  });

  describe("Rule 2: High error rate", () => {
    it("detects >30% error rate in last 24h with 3+ executions", () => {
      const auto = makeAutomation({ id: "a1" });
      const execs = [
        makeExecution("a1", { started_at: hoursAgo(1), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(2), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(3), status: "success" }),
      ];
      const issues = detectIssues([auto], execs, makeConnection());
      const highError = issues.find((i) => i.name === "High error rate");
      expect(highError).toBeDefined();
      expect(highError!.severity).toBe("critical");
    });

    it("does not flag if fewer than 3 executions in 24h", () => {
      const auto = makeAutomation({ id: "a1" });
      const execs = [
        makeExecution("a1", { started_at: hoursAgo(1), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(2), status: "error" }),
      ];
      const issues = detectIssues([auto], execs, makeConnection());
      expect(issues.find((i) => i.name === "High error rate")).toBeUndefined();
    });

    it("does not flag if error rate is below 30%", () => {
      const auto = makeAutomation({ id: "a1" });
      const execs = [
        makeExecution("a1", { started_at: hoursAgo(1), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(2), status: "success" }),
        makeExecution("a1", { started_at: hoursAgo(3), status: "success" }),
        makeExecution("a1", { started_at: hoursAgo(4), status: "success" }),
      ];
      const issues = detectIssues([auto], execs, makeConnection());
      expect(issues.find((i) => i.name === "High error rate")).toBeUndefined();
    });
  });

  describe("Rule 3: Error rate spike", () => {
    it("detects when daily error rate is 2x weekly average", () => {
      const auto = makeAutomation({ id: "a1" });
      // Weekly: 10 execs, 1 error (10%)
      const weeklyExecs = Array.from({ length: 9 }, () =>
        makeExecution("a1", { started_at: daysAgo(3) })
      );
      weeklyExecs.push(
        makeExecution("a1", { started_at: daysAgo(3), status: "error" })
      );
      // Daily: 4 execs, 3 errors (75%) — more than 2x
      const dailyExecs = [
        makeExecution("a1", { started_at: hoursAgo(1), status: "success" }),
        makeExecution("a1", { started_at: hoursAgo(2), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(3), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(4), status: "error" }),
      ];
      const issues = detectIssues(
        [auto],
        [...weeklyExecs, ...dailyExecs],
        makeConnection()
      );
      expect(issues.find((i) => i.name === "Error rate spike")).toBeDefined();
    });
  });

  describe("Rule 4: Consecutive failures", () => {
    it("detects 5+ consecutive failures", () => {
      const auto = makeAutomation({ id: "a1" });
      const execs = Array.from({ length: 6 }, (_, i) =>
        makeExecution("a1", {
          started_at: hoursAgo(i + 1),
          status: "error",
        })
      );
      const issues = detectIssues([auto], execs, makeConnection());
      const consecutive = issues.find((i) => i.name === "Consecutive failures");
      expect(consecutive).toBeDefined();
      expect(consecutive!.severity).toBe("critical");
    });

    it("does not flag if a success breaks the streak", () => {
      const auto = makeAutomation({ id: "a1" });
      const execs = [
        makeExecution("a1", { started_at: hoursAgo(1), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(2), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(3), status: "success" }),
        makeExecution("a1", { started_at: hoursAgo(4), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(5), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(6), status: "error" }),
      ];
      const issues = detectIssues([auto], execs, makeConnection());
      expect(issues.find((i) => i.name === "Consecutive failures")).toBeUndefined();
    });
  });

  describe("Rule 5: Zombie automation", () => {
    it("detects active automation with zero executions ever", () => {
      const auto = makeAutomation({ id: "a1" });
      const issues = detectIssues([auto], [], makeConnection());
      const zombie = issues.find((i) => i.name === "Zombie automation");
      expect(zombie).toBeDefined();
      expect(zombie!.severity).toBe("info");
    });

    it("does not flag if automation has any executions", () => {
      const auto = makeAutomation({ id: "a1" });
      const exec = makeExecution("a1", { started_at: daysAgo(45) });
      const issues = detectIssues([auto], [exec], makeConnection());
      expect(issues.find((i) => i.name === "Zombie automation")).toBeUndefined();
    });
  });

  describe("Rule 6: Credential expiration", () => {
    it("detects credentials expiring within 7 days", () => {
      const conn = makeConnection({
        token_expires_at: daysFromNow(3),
      });
      const issues = detectIssues([], [], conn);
      const expiring = issues.find((i) => i.name === "Credential expiring soon");
      expect(expiring).toBeDefined();
      expect(expiring!.severity).toBe("warning");
    });

    it("detects already-expired credentials", () => {
      const conn = makeConnection({
        token_expires_at: daysAgo(1),
      });
      const issues = detectIssues([], [], conn);
      const expired = issues.find((i) => i.name === "Credentials expired");
      expect(expired).toBeDefined();
      expect(expired!.severity).toBe("critical");
    });

    it("does not flag if token_expires_at is null", () => {
      const conn = makeConnection({ token_expires_at: null });
      const issues = detectIssues([], [], conn);
      expect(
        issues.find(
          (i) =>
            i.name === "Credential expiring soon" ||
            i.name === "Credentials expired"
        )
      ).toBeUndefined();
    });

    it("does not flag if token expires in more than 7 days", () => {
      const conn = makeConnection({
        token_expires_at: daysFromNow(30),
      });
      const issues = detectIssues([], [], conn);
      expect(
        issues.find(
          (i) =>
            i.name === "Credential expiring soon" ||
            i.name === "Credentials expired"
        )
      ).toBeUndefined();
    });
  });

  describe("multiple rules", () => {
    it("can trigger multiple issues on the same automation", () => {
      const auto = makeAutomation({ id: "a1" });
      // 6 consecutive errors in last 24h (triggers rule 2 + rule 4)
      const execs = Array.from({ length: 6 }, (_, i) =>
        makeExecution("a1", {
          started_at: hoursAgo(i + 1),
          status: "error",
        })
      );
      const issues = detectIssues([auto], execs, makeConnection());
      expect(issues.find((i) => i.name === "High error rate")).toBeDefined();
      expect(issues.find((i) => i.name === "Consecutive failures")).toBeDefined();
    });
  });

  describe("detector type stamping", () => {
    it("stamps silent_failure type", () => {
      const auto = makeAutomation({ id: "a1" });
      const oldExec = makeExecution("a1", { started_at: daysAgo(10) });
      const issues = detectIssues([auto], [oldExec], makeConnection());
      const found = issues.find((i) => i.name === "Silent failure detected");
      expect(found?.type).toBe("silent_failure");
    });

    it("stamps high_error_rate type", () => {
      const auto = makeAutomation({ id: "a1" });
      const execs = [
        makeExecution("a1", { started_at: hoursAgo(1), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(2), status: "error" }),
        makeExecution("a1", { started_at: hoursAgo(3), status: "success" }),
      ];
      const issues = detectIssues([auto], execs, makeConnection());
      const found = issues.find((i) => i.name === "High error rate");
      expect(found?.type).toBe("high_error_rate");
    });

    it("stamps consecutive_failures type", () => {
      const auto = makeAutomation({ id: "a1" });
      const execs = Array.from({ length: 6 }, (_, i) =>
        makeExecution("a1", {
          started_at: hoursAgo(i + 1),
          status: "error",
        })
      );
      const issues = detectIssues([auto], execs, makeConnection());
      const found = issues.find((i) => i.name === "Consecutive failures");
      expect(found?.type).toBe("consecutive_failures");
    });

    it("stamps zombie_automation type", () => {
      const auto = makeAutomation({ id: "a1" });
      const issues = detectIssues([auto], [], makeConnection());
      const found = issues.find((i) => i.name === "Zombie automation");
      expect(found?.type).toBe("zombie_automation");
    });

    it("stamps credential_expiration type for both warn and critical variants", () => {
      const expiringSoon = detectIssues(
        [],
        [],
        makeConnection({ token_expires_at: daysFromNow(3) })
      );
      const expired = detectIssues(
        [],
        [],
        makeConnection({ token_expires_at: daysAgo(1) })
      );
      expect(
        expiringSoon.find((i) => i.name === "Credential expiring soon")?.type
      ).toBe("credential_expiration");
      expect(
        expired.find((i) => i.name === "Credentials expired")?.type
      ).toBe("credential_expiration");
    });
  });
});
