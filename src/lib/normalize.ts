import type { AutomationProfile, AutomationIssue } from "@/lib/types";
import type { Database } from "@/lib/database.types";
import { buildScenarioUrl, type ConnectionUrlContext } from "@/lib/platform-adapters/urls";

type DbProfile = Database["public"]["Tables"]["automation_profiles"]["Row"];
type DbIssue = Database["public"]["Tables"]["automation_issues"]["Row"];

export interface NormalizeContext {
  connection?: ConnectionUrlContext | null;
  automationExternalIdByName?: Map<string, string>;
}

export function normalizeProfile(
  dbProfile: DbProfile,
  dbIssues: DbIssue[],
  context?: NormalizeContext
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
    issues: dbIssues.map((issue) => normalizeIssue(issue, context)),
  };
}

function normalizeIssue(
  dbIssue: DbIssue,
  context?: NormalizeContext
): AutomationIssue {
  const scenarioUrl = resolveScenarioUrl(dbIssue, context);

  return {
    id: dbIssue.id,
    severity: dbIssue.severity as AutomationIssue["severity"],
    name: dbIssue.name,
    automationName: dbIssue.automation_name,
    businessImpact: dbIssue.business_impact,
    recommendation: dbIssue.recommendation,
    scenarioUrl,
  };
}

function resolveScenarioUrl(
  dbIssue: DbIssue,
  context?: NormalizeContext
): string | undefined {
  if (!context?.connection || !context.automationExternalIdByName) {
    return undefined;
  }

  // Connection-level issues (e.g. "Credential expiring") don't map to a scenario
  if (dbIssue.automation_name === "Platform Connection") {
    return undefined;
  }

  const externalId = context.automationExternalIdByName.get(dbIssue.automation_name);
  if (!externalId) return undefined;

  return buildScenarioUrl(context.connection, externalId);
}
