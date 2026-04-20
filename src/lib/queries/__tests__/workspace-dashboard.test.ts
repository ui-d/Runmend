import { describe, it, expect } from "vitest";
import { buildWorkspaceTrend } from "@/lib/queries/workspace-dashboard";

describe("buildWorkspaceTrend", () => {
  it("returns empty trend when no snapshots exist", () => {
    expect(buildWorkspaceTrend([], ["p1", "p2"])).toEqual([]);
  });

  it("returns empty trend when no profiles exist", () => {
    expect(
      buildWorkspaceTrend(
        [{ profile_id: "p1", captured_on: "2026-04-01", health_score: 80 }],
        [],
      ),
    ).toEqual([]);
  });

  it("averages same-day snapshots across profiles", () => {
    const today = new Date().toISOString().slice(0, 10);
    const trend = buildWorkspaceTrend(
      [
        { profile_id: "p1", captured_on: today, health_score: 60 },
        { profile_id: "p2", captured_on: today, health_score: 80 },
      ],
      ["p1", "p2"],
    );
    expect(trend).toHaveLength(1);
    expect(trend[0].score).toBe(70);
    expect(trend[0].captured_on).toBe(today);
  });

  it("carries forward last-known scores to fill gaps", () => {
    // profile p1 only has day 1; p2 only has day 3 — both should contribute
    // to every filled day once seen.
    const day1 = "2026-04-01";
    const day2 = "2026-04-02";
    const day3 = "2026-04-03";
    const trend = buildWorkspaceTrend(
      [
        { profile_id: "p1", captured_on: day1, health_score: 90 },
        { profile_id: "p2", captured_on: day3, health_score: 50 },
      ],
      ["p1", "p2"],
    );
    expect(trend.length).toBeGreaterThanOrEqual(3);
    const byDate = Object.fromEntries(trend.map((p) => [p.captured_on, p.score]));
    expect(byDate[day1]).toBe(90); // only p1 known
    expect(byDate[day2]).toBe(90); // p1 carried forward, p2 still unknown
    expect(byDate[day3]).toBe(70); // (90 + 50) / 2
  });

  it("keeps days ordered chronologically", () => {
    const trend = buildWorkspaceTrend(
      [
        { profile_id: "p1", captured_on: "2026-04-03", health_score: 70 },
        { profile_id: "p1", captured_on: "2026-04-01", health_score: 60 },
        { profile_id: "p1", captured_on: "2026-04-02", health_score: 65 },
      ],
      ["p1"],
    );
    const dates = trend.map((p) => p.captured_on);
    expect(dates).toEqual([...dates].sort());
  });
});
