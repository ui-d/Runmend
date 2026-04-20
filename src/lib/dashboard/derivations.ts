import type { AutomationIssue, IssueSeverity } from "@/lib/types";
import { DETECTORS, type IssueType } from "@/lib/detectors";

export type DetectorChipState = "pass" | "warn" | "fail";

export type HealthDot = "red" | "amber" | "green";

export type HealthSeverity = "good" | "warn" | "bad";

export type DetectorGroup =
  | { kind: "detector"; type: IssueType; issues: AutomationIssue[] }
  | { kind: "other"; issues: AutomationIssue[] };

const severityRank: Record<IssueSeverity, number> = {
  info: 1,
  warning: 2,
  critical: 3,
};

/**
 * Shared health-score → severity bucket used across the workspace pulse,
 * profile cards, and stat icons. Thresholds mirror the HealthHero gauge
 * bands so a score of 60 is amber everywhere.
 */
export function healthSeverity(score: number): HealthSeverity {
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

export function healthSeverityClasses(sev: HealthSeverity): {
  text: string;
  bg: string;
  ring: string;
  stroke: string;
} {
  if (sev === "good") {
    return {
      text: "text-emerald-500",
      bg: "bg-emerald-500/10",
      ring: "ring-emerald-500/30",
      stroke: "stroke-emerald-500",
    };
  }
  if (sev === "warn") {
    return {
      text: "text-yellow-500",
      bg: "bg-yellow-500/10",
      ring: "ring-yellow-500/30",
      stroke: "stroke-yellow-500",
    };
  }
  return {
    text: "text-red-500",
    bg: "bg-red-500/10",
    ring: "ring-red-500/30",
    stroke: "stroke-red-500",
  };
}

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

export interface SparklinePoint {
  captured_on: string;
  score: number;
}

export interface SparklineGeometry {
  pathD: string;
  areaD: string;
  points: { x: number; y: number }[];
  lastPoint: { x: number; y: number } | null;
  min: number;
  max: number;
}

/**
 * Produce an SVG <path d> for a sparkline plus a closed area variant for fill.
 * Pads the score range so flat lines still render visibly.
 */
export function sparklinePath(
  points: readonly SparklinePoint[],
  width: number,
  height: number,
  padding = 2,
): SparklineGeometry {
  if (points.length === 0) {
    return { pathD: "", areaD: "", points: [], lastPoint: null, min: 0, max: 0 };
  }
  const scores = points.map((p) => p.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;
  const effectiveMin = range < 4 ? Math.max(0, minScore - 2) : minScore;
  const effectiveMax = range < 4 ? Math.min(100, maxScore + 2) : maxScore;
  const effectiveRange = Math.max(1, effectiveMax - effectiveMin);

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const coords =
    points.length === 1
      ? [{ x: padding + usableWidth / 2, y: padding + usableHeight / 2 }]
      : points.map((p, i) => {
          const x = padding + (i / (points.length - 1)) * usableWidth;
          const y =
            padding +
            usableHeight -
            ((p.score - effectiveMin) / effectiveRange) * usableHeight;
          return { x, y };
        });

  const pathD = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");
  const areaD =
    coords.length >= 2
      ? `${pathD} L ${coords[coords.length - 1].x.toFixed(2)} ${height - padding} L ${coords[0].x.toFixed(2)} ${height - padding} Z`
      : "";

  return {
    pathD,
    areaD,
    points: coords,
    lastPoint: coords[coords.length - 1],
    min: effectiveMin,
    max: effectiveMax,
  };
}

export interface DetectorRollupEntry {
  type: IssueType;
  label: string;
  shortLabel: string;
  description: string;
  count: number;
  affectedProfileCount: number;
  state: DetectorChipState;
}

/**
 * Workspace-wide detector summary. One entry per detector, zero-filled when
 * nothing has fired. State is driven by the worst severity across all issues
 * of that detector type.
 */
export function rollupDetectorStates(
  issues: { type: IssueType | null; severity: IssueSeverity; profile_id: string }[],
): DetectorRollupEntry[] {
  const worstByType = new Map<IssueType, IssueSeverity>();
  const countByType = new Map<IssueType, number>();
  const profilesByType = new Map<IssueType, Set<string>>();

  for (const issue of issues) {
    if (!issue.type) continue;
    countByType.set(issue.type, (countByType.get(issue.type) ?? 0) + 1);
    const profiles = profilesByType.get(issue.type) ?? new Set<string>();
    profiles.add(issue.profile_id);
    profilesByType.set(issue.type, profiles);
    const prior = worstByType.get(issue.type);
    if (!prior || severityRank[issue.severity] > severityRank[prior]) {
      worstByType.set(issue.type, issue.severity);
    }
  }

  return DETECTORS.map((det) => {
    const worst = worstByType.get(det.type);
    const state: DetectorChipState =
      worst === "critical"
        ? "fail"
        : worst === "warning" || worst === "info"
          ? "warn"
          : "pass";
    return {
      type: det.type,
      label: det.label,
      shortLabel: det.shortLabel,
      description: det.description,
      count: countByType.get(det.type) ?? 0,
      affectedProfileCount: profilesByType.get(det.type)?.size ?? 0,
      state,
    };
  });
}
