export type IssueSeverity = "critical" | "warning" | "info";

export type HealthStatus = "critical" | "warning" | "stable" | "excellent";

export type Platform = "zapier" | "make";

export interface AutomationIssue {
  id: string;
  severity: IssueSeverity;
  name: string;
  automationName: string;
  businessImpact: string;
  recommendation: string;
}

export interface AutomationProfile {
  id: string;
  name: string;
  platform: Platform;
  scenarioCount: number;
  industry: string;
  description: string;
  healthScore: number;
  issues: AutomationIssue[];
  lastAuditDate: string;
}

export interface DiagnosticNarrative {
  overallHealth: string;
  mostDangerousIssue: string;
  recommendations: string;
}

export function getHealthStatus(score: number): HealthStatus {
  if (score <= 40) return "critical";
  if (score <= 69) return "warning";
  if (score <= 89) return "stable";
  return "excellent";
}

export function getHealthLabel(status: HealthStatus): string {
  const labels: Record<HealthStatus, string> = {
    critical: "Critical",
    warning: "Warning",
    stable: "Stable",
    excellent: "Excellent",
  };
  return labels[status];
}

export function getHealthColorClasses(status: HealthStatus) {
  const colors: Record<HealthStatus, { text: string; bg: string; border: string }> = {
    critical: { text: "text-red-500", bg: "bg-red-500", border: "border-red-500" },
    warning: { text: "text-yellow-500", bg: "bg-yellow-500", border: "border-yellow-500" },
    stable: { text: "text-green-500", bg: "bg-green-500", border: "border-green-500" },
    excellent: { text: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-500" },
  };
  return colors[status];
}

export function getSeverityColorClasses(severity: IssueSeverity) {
  const colors: Record<IssueSeverity, { text: string; bg: string; border: string; label: string }> = {
    critical: { text: "text-red-500", bg: "bg-red-500/10", border: "border-l-red-500", label: "Critical" },
    warning: { text: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-l-yellow-500", label: "Warning" },
    info: { text: "text-blue-500", bg: "bg-blue-500/10", border: "border-l-blue-500", label: "Info" },
  };
  return colors[severity];
}
