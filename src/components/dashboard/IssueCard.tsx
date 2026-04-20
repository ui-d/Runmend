import {
  AlertTriangle,
  AlertCircle,
  Info,
  Workflow,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AutomationIssue, getSeverityColorClasses } from "@/lib/types";

interface IssueCardProps {
  issue: AutomationIssue;
  index?: number;
  collapsedByDefault?: boolean;
}

const severityIcons = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
} as const;

export function IssueCard({ issue, index, collapsedByDefault }: IssueCardProps) {
  const colors = getSeverityColorClasses(issue.severity);
  const Icon = severityIcons[issue.severity];
  const showIndex = typeof index === "number";

  return (
    <Card className={`border-l-4 ${colors.border}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex shrink-0 flex-col items-center gap-1">
            <Icon className={`h-5 w-5 ${colors.text}`} />
            {showIndex && (
              <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/60">
                {String(index! + 1).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold leading-tight">{issue.name}</h4>
              <WorkflowChip
                name={issue.automationName}
                url={issue.scenarioUrl}
                accentText={colors.text}
              />
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {issue.businessImpact}
            </p>

            <details
              className="group text-sm"
              open={!collapsedByDefault}
            >
              <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                Recommendation
              </summary>
              <div className={`mt-2 rounded-md p-3 ${colors.bg}`}>
                {issue.recommendation}
              </div>
            </details>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface WorkflowChipProps {
  name: string;
  url?: string;
  accentText: string;
}

function WorkflowChip({ name, url, accentText }: WorkflowChipProps) {
  const baseClasses =
    "inline-flex items-center gap-1.5 max-w-full rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-medium";

  if (!url) {
    return (
      <span className={baseClasses}>
        <Workflow className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{name}</span>
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClasses} group transition-colors hover:bg-muted hover:border-foreground/30`}
      aria-label={`Open ${name} in new tab`}
    >
      <Workflow className={`h-3 w-3 shrink-0 ${accentText}`} />
      <span className="truncate">{name}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground" />
    </a>
  );
}
