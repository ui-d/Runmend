import type { Database } from "@/lib/database.types";
import { getPlatformLabel } from "@/lib/types";

type ProfileRow = Database["public"]["Tables"]["automation_profiles"]["Row"];
type AutomationRow = Database["public"]["Tables"]["automations"]["Row"];
type ExecutionLogRow = Database["public"]["Tables"]["execution_logs"]["Row"];
type IssueRow = Database["public"]["Tables"]["automation_issues"]["Row"];

export function buildEnhancedPrompt(
  profile: ProfileRow,
  automations: AutomationRow[],
  executions: ExecutionLogRow[],
  issues: IssueRow[]
): string {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentExecs = executions.filter(
    (e) => new Date(e.started_at) >= sevenDaysAgo
  );
  const last24h = recentExecs.filter(
    (e) => new Date(e.started_at) >= oneDayAgo
  );

  // Automation summary
  const activeCount = automations.filter((a) => a.status === "active").length;
  const inactiveCount = automations.filter((a) => a.status === "inactive").length;
  const errorCount = automations.filter((a) => a.status === "error").length;

  // Execution stats
  const totalExecs = recentExecs.length;
  const failedExecs = recentExecs.filter((e) => e.status === "error").length;
  const successRate = totalExecs > 0
    ? Math.round(((totalExecs - failedExecs) / totalExecs) * 100)
    : 100;

  // High-error automations
  const errorByAutomation = new Map<string, { name: string; errors: number; total: number }>();
  for (const exec of recentExecs) {
    const automation = automations.find((a) => a.id === exec.automation_id);
    if (!automation) continue;
    const entry = errorByAutomation.get(automation.id) ?? {
      name: automation.name,
      errors: 0,
      total: 0,
    };
    entry.total++;
    if (exec.status === "error") entry.errors++;
    errorByAutomation.set(automation.id, entry);
  }

  const highErrorAutomations = Array.from(errorByAutomation.values())
    .filter((e) => e.total >= 3 && e.errors / e.total > 0.05)
    .sort((a, b) => b.errors / b.total - a.errors / a.total)
    .slice(0, 5);

  // Error patterns - top error messages
  const errorMessages = new Map<string, number>();
  for (const exec of recentExecs.filter((e) => e.status === "error")) {
    const msg = exec.error_message || "Unknown error";
    errorMessages.set(msg, (errorMessages.get(msg) ?? 0) + 1);
  }
  const topErrors = Array.from(errorMessages.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Build issues list
  const openIssues = issues.filter((i) => i.status === "open");
  const issuesList = openIssues
    .map(
      (issue, i) =>
        `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.name}\n   Automation: ${issue.automation_name}\n   Impact: ${issue.business_impact}`
    )
    .join("\n\n");

  // 24h vs 7-day trend
  const dailyErrorRate = last24h.length > 0
    ? Math.round((last24h.filter((e) => e.status === "error").length / last24h.length) * 100)
    : 0;
  const weeklyErrorRate = totalExecs > 0
    ? Math.round((failedExecs / totalExecs) * 100)
    : 0;

  return `Analyze this automation setup and provide a diagnostic report.

Company: ${profile.name}
Platform: ${getPlatformLabel(profile.platform as "make" | "n8n")}
Industry: ${profile.industry || "Not specified"}
Current Health Score: ${profile.health_score}/100

Automation Summary:
- Total automations: ${automations.length} (${activeCount} active, ${inactiveCount} inactive, ${errorCount} in error state)
- Executions in last 7 days: ${totalExecs}
- Overall success rate: ${successRate}%
- 24h error rate: ${dailyErrorRate}% | 7-day error rate: ${weeklyErrorRate}%

${highErrorAutomations.length > 0 ? `Automations with High Error Rates:\n${highErrorAutomations.map((a) => `- ${a.name}: ${Math.round((a.errors / a.total) * 100)}% failure (${a.errors}/${a.total})`).join("\n")}` : "No automations with significant error rates."}

${topErrors.length > 0 ? `Top Error Patterns:\n${topErrors.map(([msg, count]) => `- "${msg.slice(0, 120)}" (${count}x)`).join("\n")}` : "No errors in the analysis period."}

Current Open Issues (${openIssues.length}):
${issuesList || "No open issues."}

Provide your analysis as a JSON object with exactly 3 fields:
- "overallHealth": ONE short sentence (max 25 words) summarizing the state of the stack. No preamble, no disclaimers — a scannable headline.
- "mostDangerousIssue": 2-3 tight sentences naming the single most dangerous issue (reference the specific automation by name) and the concrete business impact. Lead with the impact.
- "recommendations": 3 to 5 short imperative sentences, each a standalone action, each starting with a capitalized verb (e.g. "Audit…", "Verify…", "Disable…") and ending with a period. Do NOT number, bullet, or prefix them — just sentences separated by a single space. Most urgent first.

Keep language plain and operational. No marketing tone.

Respond with ONLY the JSON object, no other text.`;
}
