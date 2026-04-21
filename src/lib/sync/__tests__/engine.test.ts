import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeProfile, makeConnection } from "@/test/factories";
import type { PlatformAdapter } from "@/lib/platform-adapters/types";

let mock: SupabaseMock;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mock.client,
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: (v: string) => `decrypted:${v}`,
  encrypt: (v: string) => `enc:${v}`,
  hashToken: (v: string) => `hash:${v}`,
}));

const fakeAdapter: PlatformAdapter = {
  testConnection: vi.fn(async () => ({ ok: true })),
  fetchAutomations: vi.fn(async () => []),
  fetchExecutionLogs: vi.fn(async () => []),
};

vi.mock("@/lib/platform-adapters", () => ({
  createAdapter: vi.fn(() => fakeAdapter),
}));

vi.mock("@/lib/sync/issue-detector", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sync/issue-detector")>(
    "@/lib/sync/issue-detector",
  );
  return {
    ...actual,
    detectIssues: vi.fn(() => []),
  };
});

import { syncProfile } from "@/lib/sync/engine";
import { createAdapter } from "@/lib/platform-adapters";
import { detectIssues } from "@/lib/sync/issue-detector";

beforeEach(() => {
  mock = createSupabaseMock();
  vi.mocked(createAdapter).mockClear();
  vi.mocked(fakeAdapter.fetchAutomations).mockReset().mockResolvedValue([]);
  vi.mocked(fakeAdapter.fetchExecutionLogs).mockReset().mockResolvedValue([]);
  vi.mocked(detectIssues).mockReset().mockReturnValue([]);
});

function seedProfile() {
  mock.setTable("automation_profiles", [
    makeProfile({ id: "p-1", workspace_id: "ws-1", platform: "make", name: "Acme" }),
  ]);
  mock.setTable("platform_connections", [
    makeConnection({
      id: "c-1",
      workspace_id: "ws-1",
      platform: "make",
      status: "active",
      api_key_encrypted: "encrypted-key",
      zone: "eu1",
      team_id: 42,
    }),
  ]);
  mock.setTable("automations", []);
  mock.setTable("execution_logs", []);
  mock.setTable("automation_issues", []);
  mock.setTable("profile_health_snapshots", []);
}

describe("syncProfile", () => {
  it("throws when the profile is not found", async () => {
    mock.setTable("automation_profiles", []);
    await expect(syncProfile("missing")).rejects.toThrow(/Profile not found/);
  });

  it("throws when no active connection exists for the platform", async () => {
    mock.setTable("automation_profiles", [makeProfile({ id: "p-1", platform: "make" })]);
    mock.setTable("platform_connections", []);
    await expect(syncProfile("p-1")).rejects.toThrow(/No active make connection/);
  });

  it("runs end-to-end and returns aggregated stats", async () => {
    seedProfile();
    vi.mocked(fakeAdapter.fetchAutomations).mockResolvedValue([
      { externalId: "ext-1", name: "Scn 1", status: "active", triggerType: null, lastRunAt: null },
    ]);
    vi.mocked(fakeAdapter.fetchExecutionLogs).mockResolvedValue([]);

    const result = await syncProfile("p-1");

    expect(result.automationsUpserted).toBe(1);
    expect(result.executionsInserted).toBe(0);
    expect(result.errors).toEqual([]);
    expect(createAdapter).toHaveBeenCalledWith("make", {
      apiKey: "decrypted:encrypted-key",
      instanceUrl: undefined,
      zone: "eu1",
      teamId: 42,
    });
  });

  it("records adapter exceptions as errors without throwing", async () => {
    seedProfile();
    vi.mocked(fakeAdapter.fetchAutomations).mockRejectedValue(new Error("boom"));
    const result = await syncProfile("p-1");
    expect(result.automationsUpserted).toBe(0);
    expect(result.errors).toContain("boom");
  });

  it("issues an update for the profile health score and last_audit_at", async () => {
    seedProfile();
    vi.mocked(fakeAdapter.fetchAutomations).mockResolvedValue([]);
    await syncProfile("p-1");

    const profileUpdates = mock
      .getCalls()
      .filter((c) => c.table === "automation_profiles" && c.op === "update");
    expect(profileUpdates.length).toBe(1);
    const payload = profileUpdates[0]!.payload as Record<string, unknown>;
    expect(payload).toHaveProperty("health_score");
    expect(payload).toHaveProperty("last_audit_at");
  });

  it("writes a daily health snapshot", async () => {
    seedProfile();
    await syncProfile("p-1");
    const snapshotCalls = mock
      .getCalls()
      .filter((c) => c.table === "profile_health_snapshots" && c.op === "upsert");
    expect(snapshotCalls.length).toBe(1);
    const payload = snapshotCalls[0]!.payload as Record<string, unknown>;
    expect(payload).toMatchObject({ profile_id: "p-1" });
  });

  it("calls the RPC helpers for scenario count and automation stats", async () => {
    seedProfile();
    await syncProfile("p-1");
    const rpcs = mock.getCalls().filter((c) => c.op === "rpc");
    const names = rpcs.map((r) => r.table);
    expect(names).toContain("rpc:update_profile_scenario_count");
    expect(names).toContain("rpc:update_automation_stats");
  });

  it("records automation upsert errors", async () => {
    seedProfile();
    vi.mocked(fakeAdapter.fetchAutomations).mockResolvedValue([
      { externalId: "ext-1", name: "S", status: "active", triggerType: null, lastRunAt: null },
    ]);
    mock.setTableError("automations", { message: "upsert failed" });
    const result = await syncProfile("p-1");
    expect(result.errors.some((e) => e.includes("automations"))).toBe(true);
  });

  it("records execution insert errors", async () => {
    seedProfile();
    mock.setTable("automations", [
      {
        id: "auto-db-1",
        connection_id: "c-1",
        profile_id: "p-1",
        external_id: "ext-1",
        name: "X",
        status: "active",
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
    vi.mocked(fakeAdapter.fetchAutomations).mockResolvedValue([]);
    vi.mocked(fakeAdapter.fetchExecutionLogs).mockResolvedValue([
      {
        externalId: "exec-1",
        automationExternalId: "ext-1",
        status: "success",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        errorMessage: null,
      },
    ]);
    mock.setTableError("execution_logs", { message: "insert fail" });
    const result = await syncProfile("p-1");
    expect(result.errors.some((e) => e.includes("execution"))).toBe(true);
  });

  it("upserts executions when DB automation id exists", async () => {
    seedProfile();
    mock.setTable("automations", [
      {
        id: "auto-db-1",
        connection_id: "c-1",
        profile_id: "p-1",
        external_id: "ext-1",
        name: "X",
        status: "active",
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
    vi.mocked(fakeAdapter.fetchAutomations).mockResolvedValue([]);
    vi.mocked(fakeAdapter.fetchExecutionLogs).mockResolvedValue([
      {
        externalId: "exec-1",
        automationExternalId: "ext-1",
        status: "success",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        errorMessage: null,
      },
    ]);
    const result = await syncProfile("p-1");
    expect(result.executionsInserted).toBe(1);
  });

  it("captures snapshot write errors without failing", async () => {
    seedProfile();
    mock.setTableError("profile_health_snapshots", { message: "snap error" });
    const result = await syncProfile("p-1");
    expect(result.errors.some((e) => e.includes("snapshot"))).toBe(true);
  });

  it("drops executions that have no DB automation id", async () => {
    // Adapter returns executions for external IDs that do not map to any
    // DB automation → the engine filters them out and reports 0 inserted.
    seedProfile();
    vi.mocked(fakeAdapter.fetchAutomations).mockResolvedValue([]);
    vi.mocked(fakeAdapter.fetchExecutionLogs).mockResolvedValue([
      {
        externalId: "exec-1",
        automationExternalId: "ext-ghost",
        status: "success",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        errorMessage: null,
      },
    ]);
    const result = await syncProfile("p-1");
    expect(result.executionsInserted).toBe(0);
  });

  it("falls back to 7 days ago when no last_synced_at is set", async () => {
    seedProfile();
    mock.setTable("platform_connections", [
      {
        id: "c-1",
        workspace_id: "ws-1",
        platform: "make",
        display_name: "Primary",
        status: "active",
        auth_type: "api_key",
        api_key_encrypted: "encrypted-key",
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        token_expires_at: null,
        instance_url: null,
        team_id: 42,
        zone: "eu1",
        error_message: null,
        last_tested_at: null,
        last_synced_at: null,
        credentials_vault_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(fakeAdapter.fetchExecutionLogs).mockResolvedValue([]);
    const result = await syncProfile("p-1");
    expect(result.errors).toEqual([]);
  });

  it("resolves previously-open issues no longer detected", async () => {
    seedProfile();
    mock.setTable("automation_issues", [
      {
        id: "i-old",
        profile_id: "p-1",
        name: "Silent failure",
        automation_name: "Critical Job",
        status: "open",
        severity: "critical",
        type: "silent_failure",
        business_impact: "x",
        recommendation: "y",
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(detectIssues).mockReturnValue([]);
    await syncProfile("p-1");
    const updates = mock
      .getCalls("automation_issues")
      .filter((c) => c.op === "update");
    expect(updates.some((u) => (u.payload as { status?: string }).status === "resolved")).toBe(true);
  });

  it("inserts brand-new detected issues", async () => {
    seedProfile();
    mock.setTable("automation_issues", []);
    vi.mocked(detectIssues).mockReturnValue([
      {
        type: "silent_failure",
        severity: "critical",
        name: "Silent failure",
        automationName: "Job A",
        businessImpact: "x",
        recommendation: "y",
      },
    ]);
    await syncProfile("p-1");
    const insert = mock
      .getCalls("automation_issues")
      .find((c) => c.op === "insert");
    expect(insert).toBeDefined();
  });

  it("reopens a previously resolved issue when detected again", async () => {
    seedProfile();
    mock.setTable("automation_issues", [
      {
        id: "i-old",
        profile_id: "p-1",
        name: "High error rate",
        automation_name: "Critical Job",
        status: "resolved",
        severity: "critical",
        type: "high_error_rate",
        business_impact: "x",
        recommendation: "y",
        resolved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(detectIssues).mockReturnValue([
      {
        type: "high_error_rate",
        severity: "critical",
        name: "High error rate",
        automationName: "Critical Job",
        businessImpact: "x",
        recommendation: "y",
      },
    ]);
    const result = await syncProfile("p-1");
    expect(result).toBeDefined();
    const updates = mock
      .getCalls("automation_issues")
      .filter((c) => c.op === "update");
    expect(updates.some((u) => (u.payload as { status?: string }).status === "open")).toBe(true);
  });

  it("resolves duplicate-open rows and keeps one", async () => {
    seedProfile();
    mock.setTable("automation_issues", [
      {
        id: "dup-1",
        profile_id: "p-1",
        name: "Silent failure",
        automation_name: "X",
        status: "open",
        severity: "critical",
        type: "silent_failure",
        business_impact: "x",
        recommendation: "y",
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "dup-2",
        profile_id: "p-1",
        name: "Silent failure",
        automation_name: "X",
        status: "open",
        severity: "critical",
        type: "silent_failure",
        business_impact: "x",
        recommendation: "y",
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(detectIssues).mockReturnValue([
      {
        type: "silent_failure",
        severity: "critical",
        name: "Silent failure",
        automationName: "X",
        businessImpact: "x",
        recommendation: "y",
      },
    ]);
    await syncProfile("p-1");
    const updates = mock
      .getCalls("automation_issues")
      .filter((c) => c.op === "update");
    expect(updates.some((u) => (u.payload as { status?: string }).status === "resolved")).toBe(true);
  });
});
