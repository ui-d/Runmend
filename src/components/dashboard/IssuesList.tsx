import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { IssueCard } from "./IssueCard";
import {
  AutomationIssue,
  IssueSeverity,
  getSeverityColorClasses,
} from "@/lib/types";

interface IssuesListProps {
  issues: AutomationIssue[];
}

const severityOrder: IssueSeverity[] = ["critical", "warning", "info"];

const severityIcons = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
} as const;

export function IssuesList({ issues }: IssuesListProps) {
  const recommendationCounts = new Map<string, number>();
  for (const issue of issues) {
    const key = issue.recommendation.trim();
    recommendationCounts.set(key, (recommendationCounts.get(key) ?? 0) + 1);
  }
  const seenRecommendations = new Set<string>();

  const grouped = severityOrder
    .map((severity) => ({
      severity,
      items: issues.filter((i) => i.severity === severity),
    }))
    .filter((g) => g.items.length > 0);

  let runningIndex = 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Issues Found</h2>
        <span className="text-sm text-muted-foreground">({issues.length})</span>
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          No issues detected.
        </div>
      ) : (
        grouped.map(({ severity, items }) => {
          const colors = getSeverityColorClasses(severity);
          const Icon = severityIcons[severity];

          return (
            <div key={severity} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${colors.text}`} />
                <h3
                  className={`text-xs font-semibold uppercase tracking-[0.15em] ${colors.text}`}
                >
                  {colors.label}
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  · {items.length}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((issue) => {
                  const currentIndex = runningIndex++;
                  const recKey = issue.recommendation.trim();
                  const hasDuplicate = (recommendationCounts.get(recKey) ?? 0) > 1;
                  const alreadySeen = seenRecommendations.has(recKey);
                  seenRecommendations.add(recKey);
                  return (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      index={currentIndex}
                      collapsedByDefault={hasDuplicate && alreadySeen}
                    />
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
