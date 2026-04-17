import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { createAdapter } from "@/lib/platform-adapters";
import { calculateHealthScore } from "./health-calculator";
import { detectIssues, type DetectedIssue } from "./issue-detector";
import type { Database } from "@/lib/database.types";

type AutomationRow = Database["public"]["Tables"]["automations"]["Row"];
type ExecutionLogRow = Database["public"]["Tables"]["execution_logs"]["Row"];

export interface SyncResult {
  automationsUpserted: number;
  executionsInserted: number;
  issuesDetected: number;
  healthScore: number;
  errors: string[];
}

export async function syncProfile(profileId: string): Promise<SyncResult> {
  const admin = createAdminClient();
  const errors: string[] = [];

  // 1. Fetch profile
  const { data: profile, error: profileError } = await admin
    .from("automation_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Profile not found: ${profileError?.message}`);
  }

  // 2. Find matching connection
  const { data: connection, error: connError } = await admin
    .from("platform_connections")
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .eq("platform", profile.platform)
    .eq("status", "active")
    .single();

  if (connError || !connection) {
    throw new Error(
      `No active ${profile.platform} connection found for this workspace`
    );
  }

  // 3. Decrypt credentials and create adapter
  const apiKey = connection.api_key_encrypted
    ? decrypt(connection.api_key_encrypted)
    : undefined;

  const adapter = createAdapter(
    connection.platform as "make" | "n8n",
    {
      apiKey,
      instanceUrl: connection.instance_url || undefined,
      zone: connection.zone || undefined,
      teamId: connection.team_id || undefined,
    }
  );

  // 4. Fetch automations from platform (bulk upsert)
  let automationsUpserted = 0;
  try {
    const rawAutomations = await adapter.fetchAutomations();

    if (rawAutomations.length > 0) {
      const rows = rawAutomations.map((raw) => ({
        connection_id: connection.id,
        profile_id: profileId,
        external_id: raw.externalId,
        name: raw.name,
        status: raw.status,
        trigger_type: raw.triggerType,
        last_run_at: raw.lastRunAt,
      }));

      const { error: upsertError } = await admin
        .from("automations")
        .upsert(rows, { onConflict: "connection_id,external_id" });

      if (upsertError) {
        errors.push(`Failed to upsert automations: ${upsertError.message}`);
      } else {
        automationsUpserted = rawAutomations.length;
      }
    }

    // Update profile scenario count atomically via RPC
    await admin.rpc("update_profile_scenario_count", {
      p_profile_id: profileId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch automations";
    errors.push(msg);
  }

  // 5. Fetch execution logs (bulk upsert)
  let executionsInserted = 0;
  const sinceDate = connection.last_synced_at
    ? new Date(connection.last_synced_at)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const rawExecutions = await adapter.fetchExecutionLogs(sinceDate);

    // Map external automation IDs to DB automation IDs
    const { data: dbAutomations } = await admin
      .from("automations")
      .select("id, external_id")
      .eq("profile_id", profileId);

    const extToDbId = new Map(
      (dbAutomations ?? []).map((a) => [a.external_id, a.id])
    );

    const execRows = rawExecutions
      .map((raw) => {
        const automationId = extToDbId.get(raw.automationExternalId);
        if (!automationId) return null;
        return {
          automation_id: automationId,
          external_id: raw.externalId || null,
          status: raw.status,
          started_at: raw.startedAt,
          finished_at: raw.finishedAt,
          error_message: raw.errorMessage,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (execRows.length > 0) {
      const { error: insertError } = await admin
        .from("execution_logs")
        .upsert(execRows, {
          onConflict: "automation_id,external_id",
          ignoreDuplicates: true,
        });

      if (insertError) {
        errors.push(`Failed to insert executions: ${insertError.message}`);
      } else {
        executionsInserted = execRows.length;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch executions";
    errors.push(msg);
  }

  // 6. Load all automations and executions for health calculation
  const { data: allAutomations } = await admin
    .from("automations")
    .select("*")
    .eq("profile_id", profileId);

  const automationIds = (allAutomations ?? []).map((a) => a.id);
  let allExecutions: ExecutionLogRow[] = [];
  if (automationIds.length > 0) {
    const { data } = await admin
      .from("execution_logs")
      .select("*")
      .in("automation_id", automationIds)
      .order("started_at", { ascending: false })
      .limit(1000);
    allExecutions = data ?? [];
  }

  // 7. Calculate health score
  const healthScore = calculateHealthScore(
    (allAutomations ?? []) as AutomationRow[],
    allExecutions
  );

  // 8. Detect issues
  const detectedIssues = detectIssues(
    (allAutomations ?? []) as AutomationRow[],
    allExecutions,
    connection
  );

  // 9. Upsert detected issues (mark old ones resolved, insert new ones)
  await syncIssues(admin, profileId, detectedIssues);

  // 10. Update profile health score and last audit
  await admin
    .from("automation_profiles")
    .update({
      health_score: healthScore,
      last_audit_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  // 11. Update connection last_synced_at
  await admin
    .from("platform_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  // 12. Update per-automation stats in a single SQL query via RPC
  await admin.rpc("update_automation_stats", { p_profile_id: profileId });

  return {
    automationsUpserted,
    executionsInserted,
    issuesDetected: detectedIssues.length,
    healthScore,
    errors,
  };
}

async function syncIssues(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  detected: DetectedIssue[]
): Promise<void> {
  // Resolve all existing open issues that weren't re-detected
  const { data: existing } = await admin
    .from("automation_issues")
    .select("id, name, automation_name")
    .eq("profile_id", profileId)
    .eq("status", "open");

  const detectedKeys = new Set(
    detected.map((d) => `${d.name}::${d.automationName}`)
  );

  // Batch resolve: collect IDs of issues no longer detected
  const idsToResolve = (existing ?? [])
    .filter((ex) => !detectedKeys.has(`${ex.name}::${ex.automation_name}`))
    .map((ex) => ex.id);

  if (idsToResolve.length > 0) {
    await admin
      .from("automation_issues")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .in("id", idsToResolve);
  }

  // Batch insert: collect new issues not already open
  const existingKeys = new Set(
    (existing ?? []).map((e) => `${e.name}::${e.automation_name}`)
  );

  const newIssues = detected
    .filter((issue) => !existingKeys.has(`${issue.name}::${issue.automationName}`))
    .map((issue) => ({
      profile_id: profileId,
      severity: issue.severity,
      name: issue.name,
      automation_name: issue.automationName,
      business_impact: issue.businessImpact,
      recommendation: issue.recommendation,
    }));

  if (newIssues.length > 0) {
    await admin.from("automation_issues").insert(newIssues);
  }
}
