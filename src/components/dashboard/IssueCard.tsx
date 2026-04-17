import { AlertTriangle, AlertCircle, Info, Workflow, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AutomationIssue, getSeverityColorClasses } from "@/lib/types";

interface IssueCardProps {
  issue: AutomationIssue;
}

const severityIcons = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
} as const;

export function IssueCard({ issue }: IssueCardProps) {
  const colors = getSeverityColorClasses(issue.severity);
  const Icon = severityIcons[issue.severity];

  return (
    <Card className={`border-l-4 ${colors.border}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${colors.text}`} />
          <div className="space-y-3 min-w-0 flex-1">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm leading-tight">{issue.name}</h4>
              <WorkflowChip
                name={issue.automationName}
                url={issue.scenarioUrl}
                accentText={colors.text}
              />
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {issue.businessImpact}
            </p>

            <div className={`text-sm rounded-md p-3 ${colors.bg}`}>
              <span className="font-medium">Recommendation: </span>
              {issue.recommendation}
            </div>
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
