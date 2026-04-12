import type { AutomationProfile, AutomationIssue } from "@/lib/types";
import type { Database } from "@/lib/database.types";

type DbProfile = Database["public"]["Tables"]["automation_profiles"]["Row"];
type DbIssue = Database["public"]["Tables"]["automation_issues"]["Row"];

/**
 * Maps a database profile + issues to the AutomationProfile shape
 * used by the existing dashboard components (HealthScore, IssuesList, etc.)
 */
export function normalizeProfile(
  dbProfile: DbProfile,
  dbIssues: DbIssue[]
): AutomationProfile {
  return {
    id: dbProfile.id,
    name: dbProfile.name,
    platform: dbProfile.platform as AutomationProfile["platform"],
    scenarioCount: dbProfile.scenario_count,
    industry: dbProfile.industry ?? "",
    description: dbProfile.description ?? "",
    healthScore: dbProfile.health_score,
    lastAuditDate: dbProfile.last_audit_at ?? dbProfile.updated_at,
    issues: dbIssues.map(normalizeIssue),
  };
}

function normalizeIssue(dbIssue: DbIssue): AutomationIssue {
  return {
    id: dbIssue.id,
    severity: dbIssue.severity as AutomationIssue["severity"],
    name: dbIssue.name,
    automationName: dbIssue.automation_name,
    businessImpact: dbIssue.business_impact,
    recommendation: dbIssue.recommendation,
  };
}
