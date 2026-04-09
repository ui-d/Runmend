import { AlertTriangle, AlertCircle, Info } from "lucide-react";
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
          <div className="space-y-2 min-w-0">
            <div>
              <h4 className="font-semibold text-sm">{issue.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {issue.automationName}
              </p>
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
