import { describe, it, expect } from "vitest";
import type { AutomationIssue } from "@/lib/types";
import {
  computeDetectorStates,
  computeHealthDot,
  groupByDetector,
} from "@/lib/dashboard/derivations";

function makeIssue(partial: Partial<AutomationIssue>): AutomationIssue {
  return {
    id: partial.id ?? crypto.randomUUID(),
    type: partial.type ?? null,
    severity: partial.severity ?? "info",
    name: partial.name ?? "Issue",
    automationName: partial.automationName ?? "Scenario A",
    businessImpact: partial.businessImpact ?? "impact",
    recommendation: partial.recommendation ?? "rec",
    scenarioUrl: partial.scenarioUrl,
    externalId: partial.externalId,
  };
}

describe("computeDetectorStates", () => {
  it("marks detector as pass when no issues of that type", () => {
    const states = computeDetectorStates([]);
    expect(states.get("zombie_automation")?.state).toBe("pass");
    expect(states.get("zombie_automation")?.count).toBe(0);
  });

  it("marks detector as fail when a critical issue is open", () => {
    const states = computeDetectorStates([
      makeIssue({ type: "silent_failure", severity: "critical" }),
    ]);
    expect(states.get("silent_failure")?.state).toBe("fail");
    expect(states.get("silent_failure")?.count).toBe(1);
  });

  it("marks detector as warn when only warning/info issues are open", () => {
    const states = computeDetectorStates([
      makeIssue({ type: "zombie_automation", severity: "info" }),
      makeIssue({ type: "zombie_automation", severity: "info" }),
    ]);
    expect(states.get("zombie_automation")?.state).toBe("warn");
    expect(states.get("zombie_automation")?.count).toBe(2);
  });

  it("escalates to fail if any issue in the group is critical", () => {
    const states = computeDetectorStates([
      makeIssue({ type: "high_error_rate", severity: "warning" }),
      makeIssue({ type: "high_error_rate", severity: "critical" }),
    ]);
    expect(states.get("high_error_rate")?.state).toBe("fail");
  });

  it("ignores issues with no type", () => {
    const states = computeDetectorStates([
      makeIssue({ type: null, severity: "critical" }),
    ]);
    Array.from(states.values()).forEach(({ state }) => {
      expect(state).toBe("pass");
    });
  });
});

describe("groupByDetector", () => {
  it("returns groups in DETECTORS order, skipping empty ones", () => {
    const groups = groupByDetector([
      makeIssue({ type: "credential_expiration", severity: "warning" }),
      makeIssue({ type: "zombie_automation", severity: "info" }),
      makeIssue({ type: "zombie_automation", severity: "info" }),
    ]);
    expect(groups).toHaveLength(2);
    // DETECTORS order puts zombie_automation first
    expect(groups[0].kind).toBe("detector");
    if (groups[0].kind === "detector") {
      expect(groups[0].type).toBe("zombie_automation");
      expect(groups[0].issues).toHaveLength(2);
    }
  });

  it("collects untyped issues into an 'other' group", () => {
    const groups = groupByDetector([
      makeIssue({ type: null, severity: "warning" }),
      makeIssue({ type: null, severity: "info" }),
      makeIssue({ type: "silent_failure", severity: "critical" }),
    ]);
    const other = groups.find((g) => g.kind === "other");
    expect(other).toBeDefined();
    expect(other?.issues).toHaveLength(2);
  });

  it("returns empty array when there are no issues", () => {
    expect(groupByDetector([])).toEqual([]);
  });
});

describe("computeHealthDot", () => {
  it("returns green when no issues and no failures", () => {
    const dot = computeHealthDot(
      { status: "active", totalRuns: 100, failedRuns: 0 },
      []
    );
    expect(dot).toBe("green");
  });

  it("returns amber when >10% of runs have failed", () => {
    const dot = computeHealthDot(
      { status: "active", totalRuns: 10, failedRuns: 2 },
      []
    );
    expect(dot).toBe("amber");
  });

  it("returns amber for a warning issue", () => {
    const dot = computeHealthDot(
      { status: "active", totalRuns: 50, failedRuns: 0 },
      [makeIssue({ severity: "warning" })]
    );
    expect(dot).toBe("amber");
  });

  it("returns red for a critical issue even with healthy runs", () => {
    const dot = computeHealthDot(
      { status: "active", totalRuns: 50, failedRuns: 0 },
      [makeIssue({ severity: "critical" })]
    );
    expect(dot).toBe("red");
  });

  it("returns green for a fresh automation with zero runs", () => {
    const dot = computeHealthDot(
      { status: "active", totalRuns: 0, failedRuns: 0 },
      []
    );
    expect(dot).toBe("green");
  });
});
