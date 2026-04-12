import type { Database } from "@/lib/database.types";

type AutomationRow = Database["public"]["Tables"]["automations"]["Row"];
type ExecutionLogRow = Database["public"]["Tables"]["execution_logs"]["Row"];

/**
 * Calculates a 0-100 health score from real automation and execution data.
 *
 * Weighted formula:
 * - Error rate (40%): success rate across all executions in the last 7 days
 * - Inactive ratio (20%): penalty for automations with 0 runs in 7 days
 * - Failure trend (20%): compares 24h error rate vs 7-day average
 * - Coverage (20%): % of automations that have at least 1 execution
 */
export function calculateHealthScore(
  automations: AutomationRow[],
  executions: ExecutionLogRow[]
): number {
  if (automations.length === 0) return 100;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentExecs = executions.filter(
    (e) => new Date(e.started_at) >= sevenDaysAgo
  );
  const last24hExecs = recentExecs.filter(
    (e) => new Date(e.started_at) >= oneDayAgo
  );

  // 1. Error rate score (40%)
  let errorRateScore = 100;
  if (recentExecs.length > 0) {
    const failures = recentExecs.filter((e) => e.status === "error").length;
    const successRate = 1 - failures / recentExecs.length;
    errorRateScore = Math.round(successRate * 100);
  }

  // 2. Inactive ratio score (20%)
  const activeAutomations = automations.filter((a) => a.status === "active");
  let inactiveScore = 100;
  if (activeAutomations.length > 0) {
    const automationIds = new Set(
      recentExecs.map((e) => e.automation_id)
    );
    const activeWithExecs = activeAutomations.filter((a) =>
      automationIds.has(a.id)
    ).length;
    inactiveScore = Math.round(
      (activeWithExecs / activeAutomations.length) * 100
    );
  }

  // 3. Failure trend score (20%)
  let trendScore = 100;
  if (recentExecs.length > 0 && last24hExecs.length > 0) {
    const weeklyErrorRate =
      recentExecs.filter((e) => e.status === "error").length /
      recentExecs.length;
    const dailyErrorRate =
      last24hExecs.filter((e) => e.status === "error").length /
      last24hExecs.length;

    if (weeklyErrorRate > 0) {
      const ratio = dailyErrorRate / weeklyErrorRate;
      // ratio > 2 means error rate doubled, score drops
      trendScore = Math.max(0, Math.round(100 - (ratio - 1) * 50));
    } else if (dailyErrorRate > 0) {
      trendScore = 50; // new errors when there were none
    }
  }

  // 4. Coverage score (20%)
  let coverageScore = 100;
  if (automations.length > 0) {
    const automationIds = new Set(executions.map((e) => e.automation_id));
    const covered = automations.filter((a) => automationIds.has(a.id)).length;
    coverageScore = Math.round((covered / automations.length) * 100);
  }

  const score = Math.round(
    errorRateScore * 0.4 +
    inactiveScore * 0.2 +
    trendScore * 0.2 +
    coverageScore * 0.2
  );

  return Math.max(0, Math.min(100, score));
}
