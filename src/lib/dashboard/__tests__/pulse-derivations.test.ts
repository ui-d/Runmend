import { describe, it, expect } from "vitest";
import type { IssueType } from "@/lib/detectors";
import type { IssueSeverity } from "@/lib/types";
import {
  healthSeverity,
  sparklinePath,
  rollupDetectorStates,
  type SparklinePoint,
} from "@/lib/dashboard/derivations";

describe("healthSeverity", () => {
  it.each<[number, "good" | "warn" | "bad"]>([
    [0, "bad"],
    [39, "bad"],
    [40, "warn"],
    [60, "warn"],
    [69, "warn"],
    [70, "good"],
    [100, "good"],
  ])("maps %i → %s", (score, expected) => {
    expect(healthSeverity(score)).toBe(expected);
  });
});

describe("sparklinePath", () => {
  it("returns empty geometry for no points", () => {
    const geo = sparklinePath([], 100, 40);
    expect(geo.pathD).toBe("");
    expect(geo.points).toHaveLength(0);
    expect(geo.lastPoint).toBeNull();
  });

  it("centers a single point", () => {
    const points: SparklinePoint[] = [{ captured_on: "2026-04-01", score: 80 }];
    const geo = sparklinePath(points, 100, 40, 2);
    expect(geo.points).toHaveLength(1);
    expect(geo.points[0].x).toBeCloseTo(50, 0);
    expect(geo.pathD.startsWith("M")).toBe(true);
    expect(geo.lastPoint).not.toBeNull();
  });

  it("builds a line for multiple points with monotonically increasing x", () => {
    const points: SparklinePoint[] = [
      { captured_on: "2026-04-01", score: 60 },
      { captured_on: "2026-04-02", score: 70 },
      { captured_on: "2026-04-03", score: 65 },
    ];
    const geo = sparklinePath(points, 120, 40, 4);
    expect(geo.points).toHaveLength(3);
    expect(geo.points[0].x).toBeCloseTo(4, 0);
    expect(geo.points[2].x).toBeCloseTo(116, 0);
    expect(geo.pathD.split(" L ")).toHaveLength(3);
    expect(geo.areaD).toContain("Z");
  });

  it("pads range so flat lines still render", () => {
    const points: SparklinePoint[] = [
      { captured_on: "2026-04-01", score: 50 },
      { captured_on: "2026-04-02", score: 50 },
    ];
    const geo = sparklinePath(points, 100, 40);
    expect(geo.max).toBeGreaterThan(geo.min);
  });
});

describe("rollupDetectorStates", () => {
  const issue = (
    type: IssueType | null,
    severity: IssueSeverity,
    profile_id: string,
  ) => ({ type, severity, profile_id });

  it("zero-fills all 6 detectors when nothing has fired", () => {
    const rollup = rollupDetectorStates([]);
    expect(rollup).toHaveLength(6);
    expect(rollup.every((r) => r.count === 0 && r.state === "pass")).toBe(true);
  });

  it("counts issues per detector and deduplicates affected profiles", () => {
    const rollup = rollupDetectorStates([
      issue("zombie_automation", "warning", "p1"),
      issue("zombie_automation", "warning", "p1"),
      issue("zombie_automation", "warning", "p2"),
      issue("error_spike", "critical", "p3"),
    ]);
    const zombie = rollup.find((r) => r.type === "zombie_automation")!;
    expect(zombie.count).toBe(3);
    expect(zombie.affectedProfileCount).toBe(2);
    expect(zombie.state).toBe("warn");

    const spike = rollup.find((r) => r.type === "error_spike")!;
    expect(spike.count).toBe(1);
    expect(spike.affectedProfileCount).toBe(1);
    expect(spike.state).toBe("fail");
  });

  it("ignores issues with null type", () => {
    const rollup = rollupDetectorStates([
      issue(null, "critical", "p1"),
      issue(null, "warning", "p2"),
    ]);
    expect(rollup.every((r) => r.count === 0)).toBe(true);
  });
});
