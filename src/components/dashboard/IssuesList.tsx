import { Badge } from "@/components/ui/badge";
import { IssueCard } from "./IssueCard";
import { AutomationIssue, IssueSeverity, getSeverityColorClasses } from "@/lib/types";

interface IssuesListProps {
  issues: AutomationIssue[];
}

const severityOrder: IssueSeverity[] = ["critical", "warning", "info"];

const severityEmoji: Record<IssueSeverity, string> = {
  critical: "\uD83D\uDD34",
  warning: "\uD83D\uDFE1",
  info: "\uD83D\uDD35",
};

export function IssuesList({ issues }: IssuesListProps) {
  const grouped = severityOrder
    .map((severity) => ({
      severity,
      items: issues.filter((i) => i.severity === severity),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Issues Found</h2>

      {grouped.map(({ severity, items }) => {
        const colors = getSeverityColorClasses(severity);

        return (
          <div key={severity} className="space-y-4">
            <div className="flex items-center gap-2">
              <span>{severityEmoji[severity]}</span>
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${colors.text}`}>
                {colors.label}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
            </div>

            <div className="space-y-3">
              {items.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
