import type { AutomationIssue, IssueSeverity } from "@/lib/types";
import { DETECTORS, type IssueType } from "@/lib/detectors";

export type DetectorChipState = "pass" | "warn" | "fail";

export type HealthDot = "red" | "amber" | "green";

export type DetectorGroup =
  | { kind: "detector"; type: IssueType; issues: AutomationIssue[] }
  | { kind: "other"; issues: AutomationIssue[] };

const severityRank: Record<IssueSeverity, number> = {
  info: 1,
  warning: 2,
  critical: 3,
};

export function computeDetectorStates(
  issues: AutomationIssue[]
): Map<IssueType, { state: DetectorChipState; count: number }> {
  const worstByType = new Map<IssueType, IssueSeverity>();
  const countByType = new Map<IssueType, number>();

  for (const issue of issues) {
    if (!issue.type) continue;
    countByType.set(issue.type, (countByType.get(issue.type) ?? 0) + 1);
    const prior = worstByType.get(issue.type);
    if (!prior || severityRank[issue.severity] > severityRank[prior]) {
      worstByType.set(issue.type, issue.severity);
    }
  }

  const result = new Map<
    IssueType,
    { state: DetectorChipState; count: number }
  >();
  for (const det of DETECTORS) {
    const worst = worstByType.get(det.type);
    const count = countByType.get(det.type) ?? 0;
    const state: DetectorChipState =
      worst === "critical"
        ? "fail"
        : worst === "warning" || worst === "info"
          ? "warn"
          : "pass";
    result.set(det.type, { state, count });
  }
  return result;
}

export function groupByDetector(
  issues: AutomationIssue[]
): DetectorGroup[] {
  const byType = new Map<IssueType, AutomationIssue[]>();
  const other: AutomationIssue[] = [];

  for (const issue of issues) {
    if (issue.type) {
      const list = byType.get(issue.type) ?? [];
      list.push(issue);
      byType.set(issue.type, list);
    } else {
      other.push(issue);
    }
  }

  const groups: DetectorGroup[] = [];
  for (const det of DETECTORS) {
    const list = byType.get(det.type);
    if (list && list.length > 0) {
      groups.push({ kind: "detector", type: det.type, issues: list });
    }
  }
  if (other.length > 0) {
    groups.push({ kind: "other", issues: other });
  }
  return groups;
}

export function computeHealthDot(
  a: { status: string; totalRuns: number; failedRuns: number },
  issues: AutomationIssue[]
): HealthDot {
  let worst: IssueSeverity | null = null;
  for (const issue of issues) {
    if (!worst || severityRank[issue.severity] > severityRank[worst]) {
      worst = issue.severity;
    }
  }
  if (worst === "critical") return "red";
  if (worst === "warning") return "amber";
  if (a.totalRuns > 0 && a.failedRuns / a.totalRuns > 0.1) return "amber";
  return "green";
}
