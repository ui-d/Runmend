import { describe, it, expect } from "vitest";
import { normalizeProfile } from "@/lib/normalize";
import { makeProfile, makeIssue } from "@/test/factories";

describe("normalizeProfile", () => {
  it("returns a shape matching AutomationProfile when no context is provided", () => {
    const db = makeProfile({
      id: "p-1",
      name: "Acme",
      platform: "make",
      scenario_count: 3,
      health_score: 88,
    });
    const result = normalizeProfile(db, []);
    expect(result).toEqual(
      expect.objectContaining({
        id: "p-1",
        name: "Acme",
        scenarioCount: 3,
        healthScore: 88,
        industry: "",
        description: "",
      }),
    );
    expect(result.issues).toEqual([]);
  });

  it("uses updated_at when last_audit_at is null", () => {
    const db = makeProfile({
      last_audit_at: null,
      updated_at: "2026-01-01T00:00:00Z",
    });
    const result = normalizeProfile(db, []);
    expect(result.lastAuditDate).toBe("2026-01-01T00:00:00Z");
  });

  it("prefers last_audit_at over updated_at", () => {
    const db = makeProfile({
      last_audit_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    expect(normalizeProfile(db, []).lastAuditDate).toBe(
      "2026-03-01T00:00:00Z",
    );
  });

  it("maps db issues to normalized issues", () => {
    const db = makeProfile({ platform: "make" });
    const issues = [
      makeIssue({
        id: "i-1",
        name: "Silent",
        automation_name: "Critical Job",
        severity: "critical",
        type: "silent_failure",
      }),
    ];
    const result = normalizeProfile(db, issues);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toEqual(
      expect.objectContaining({
        id: "i-1",
        name: "Silent",
        automationName: "Critical Job",
        severity: "critical",
        type: "silent_failure",
      }),
    );
  });

  it("coerces unknown issue types to null", () => {
    const db = makeProfile();
    const issues = [makeIssue({ type: "not-a-type" })];
    const result = normalizeProfile(db, issues);
    expect(result.issues[0]!.type).toBeNull();
  });

  it("builds scenarioUrl when context has connection + external id", () => {
    const db = makeProfile();
    const issues = [makeIssue({ automation_name: "Daily Sync" })];
    const context = {
      connection: {
        platform: "make" as const,
        zone: "eu1",
        teamId: 42,
        instanceUrl: null,
      },
      automationExternalIdByName: new Map([["Daily Sync", "ext-1"]]),
    };
    const result = normalizeProfile(db, issues, context);
    expect(result.issues[0]!.scenarioUrl).toBe(
      "https://eu1.make.com/42/scenarios/ext-1",
    );
  });

  it("omits scenarioUrl for 'Platform Connection' issues", () => {
    const db = makeProfile();
    const issues = [makeIssue({ automation_name: "Platform Connection" })];
    const context = {
      connection: {
        platform: "make" as const,
        zone: "eu1",
        teamId: 42,
        instanceUrl: null,
      },
      automationExternalIdByName: new Map([
        ["Platform Connection", "ext-x"],
      ]),
    };
    const result = normalizeProfile(db, issues, context);
    expect(result.issues[0]!.scenarioUrl).toBeUndefined();
  });

  it("omits scenarioUrl when no mapping exists", () => {
    const db = makeProfile();
    const issues = [makeIssue({ automation_name: "Ghost" })];
    const result = normalizeProfile(db, issues, {
      connection: {
        platform: "make",
        zone: "eu1",
        teamId: 42,
        instanceUrl: null,
      },
      automationExternalIdByName: new Map(),
    });
    expect(result.issues[0]!.scenarioUrl).toBeUndefined();
  });
});
