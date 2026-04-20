import type { Database } from "@/lib/database.types";
import type { IssueType } from "@/lib/detectors";

type AutomationRow = Database["public"]["Tables"]["automations"]["Row"];
type ExecutionLogRow = Database["public"]["Tables"]["execution_logs"]["Row"];
type ConnectionRow = Database["public"]["Tables"]["platform_connections"]["Row"];

export interface DetectedIssue {
  type: IssueType;
  severity: "critical" | "warning" | "info";
  name: string;
  automationName: string;
  businessImpact: string;
  recommendation: string;
}

export function detectIssues(
  automations: AutomationRow[],
  executions: ExecutionLogRow[],
  connection: ConnectionRow
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Group executions by automation
  const execByAutomation = new Map<string, ExecutionLogRow[]>();
  for (const exec of executions) {
    const list = execByAutomation.get(exec.automation_id) ?? [];
    list.push(exec);
    execByAutomation.set(exec.automation_id, list);
  }

  for (const automation of automations) {
    const autoExecs = execByAutomation.get(automation.id) ?? [];
    const recentExecs = autoExecs.filter(
      (e) => new Date(e.started_at) >= sevenDaysAgo
    );
    const last24h = autoExecs.filter(
      (e) => new Date(e.started_at) >= oneDayAgo
    );

    // Rule 1: Silent failure - active automation with 0 executions in 7 days
    if (automation.status === "active" && recentExecs.length === 0 && autoExecs.length > 0) {
      issues.push({
        type: "silent_failure",
        severity: "critical",
        name: "Silent failure detected",
        automationName: automation.name,
        businessImpact: `This automation was previously active but has had zero executions in the past 7 days. It may have silently stopped working.`,
        recommendation: `Check the trigger configuration and verify the upstream service is still sending events. Re-enable or reconnect the trigger.`,
      });
    }

    // Rule 2: High error rate - >30% failures in last 24h
    if (last24h.length >= 3) {
      const errorCount = last24h.filter((e) => e.status === "error").length;
      const errorRate = errorCount / last24h.length;
      if (errorRate > 0.3) {
        issues.push({
          type: "high_error_rate",
          severity: "critical",
          name: "High error rate",
          automationName: automation.name,
          businessImpact: `${Math.round(errorRate * 100)}% of executions in the last 24 hours failed (${errorCount}/${last24h.length}). Data may be lost or actions not completing.`,
          recommendation: `Review the most recent error logs. Check if API credentials are still valid and downstream services are responding.`,
        });
      }
    }

    // Rule 3: Error spike - error rate doubled vs 7-day average
    if (recentExecs.length >= 5 && last24h.length >= 2) {
      const weeklyErrorRate =
        recentExecs.filter((e) => e.status === "error").length / recentExecs.length;
      const dailyErrorRate =
        last24h.filter((e) => e.status === "error").length / last24h.length;

      if (weeklyErrorRate > 0 && dailyErrorRate / weeklyErrorRate > 2) {
        issues.push({
          type: "error_spike",
          severity: "warning",
          name: "Error rate spike",
          automationName: automation.name,
          businessImpact: `Error rate in the last 24h (${Math.round(dailyErrorRate * 100)}%) is more than double the 7-day average (${Math.round(weeklyErrorRate * 100)}%).`,
          recommendation: `Investigate recent changes to connected services or API endpoints that may have caused the spike.`,
        });
      }
    }

    // Rule 4: Consecutive failures - 5+ failures in a row
    const sorted = [...autoExecs].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    let consecutiveFailures = 0;
    for (const exec of sorted) {
      if (exec.status === "error") consecutiveFailures++;
      else break;
    }
    if (consecutiveFailures >= 5) {
      issues.push({
        type: "consecutive_failures",
        severity: "critical",
        name: "Consecutive failures",
        automationName: automation.name,
        businessImpact: `The last ${consecutiveFailures} executions all failed. This automation is effectively broken.`,
        recommendation: `This likely indicates a systemic issue — expired credentials, changed API schema, or a down service. Fix the root cause before re-enabling.`,
      });
    }

    // Rule 5: Zombie automation - active but 0 executions in 30 days
    const anyRecentExec = autoExecs.some(
      (e) => new Date(e.started_at) >= thirtyDaysAgo
    );
    if (automation.status === "active" && !anyRecentExec && autoExecs.length === 0) {
      issues.push({
        type: "zombie_automation",
        severity: "info",
        name: "Zombie automation",
        automationName: automation.name,
        businessImpact: `This automation is marked active but has never executed. It may be misconfigured or its trigger has never fired.`,
        recommendation: `Verify the trigger setup. If this automation is no longer needed, disable it to reduce clutter.`,
      });
    }
  }

  // Rule 6: Credential expiring (connection-level)
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      issues.push({
        type: "credential_expiration",
        severity: "warning",
        name: "Credential expiring soon",
        automationName: "Platform Connection",
        businessImpact: `Your ${connection.platform} credentials expire in ${Math.round(daysUntilExpiry)} days. All automations will stop working when they expire.`,
        recommendation: `Re-authenticate your ${connection.platform} connection before the credentials expire.`,
      });
    } else if (daysUntilExpiry <= 0) {
      issues.push({
        type: "credential_expiration",
        severity: "critical",
        name: "Credentials expired",
        automationName: "Platform Connection",
        businessImpact: `Your ${connection.platform} credentials have expired. No automations can execute until you re-authenticate.`,
        recommendation: `Reconnect your ${connection.platform} account immediately to restore automation functionality.`,
      });
    }
  }

  return issues;
}
