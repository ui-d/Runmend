import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { createAdapter } from "@/lib/platform-adapters";
import { calculateHealthScore } from "./health-calculator";
import { detectIssues, type DetectedIssue } from "./issue-detector";
import type { Database } from "@/lib/database.types";

type AutomationRow = Database["public"]["Tables"]["automations"]["Row"];
type ExecutionLogRow = Database["public"]["Tables"]["execution_logs"]["Row"];
type ConnectionRow = Database["public"]["Tables"]["platform_connections"]["Row"];
type ProfileRow = Database["public"]["Tables"]["automation_profiles"]["Row"];

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

  // 2. Find matching connection. Prefer the explicit profile.connection_id
  //    set at creation time. Fall back to platform-matching for legacy
  //    profiles that predate connection_id — but only if there is exactly
  //    one active connection for that platform, to avoid picking the wrong
  //    account when a workspace has multiple.
  const connection = await loadConnectionForProfile(admin, profile);

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

  // 13. Capture a daily health snapshot (upsert so repeat syncs overwrite).
  //     Powers the workspace Pulse trend line and per-profile sparklines.
  const openCount = detectedIssues.length;
  const criticalCount = detectedIssues.filter((i) => i.severity === "critical").length;
  const automationCount = allAutomations?.length ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const { error: snapshotError } = await admin
    .from("profile_health_snapshots")
    .upsert(
      {
        profile_id: profileId,
        captured_on: today,
        health_score: healthScore,
        open_issue_count: openCount,
        critical_issue_count: criticalCount,
        automation_count: automationCount,
      },
      { onConflict: "profile_id,captured_on" },
    );
  if (snapshotError) {
    errors.push(`Failed to write health snapshot: ${snapshotError.message}`);
  }

  return {
    automationsUpserted,
    executionsInserted,
    issuesDetected: detectedIssues.length,
    healthScore,
    errors,
  };
}

async function loadConnectionForProfile(
  admin: ReturnType<typeof createAdminClient>,
  profile: ProfileRow,
): Promise<ConnectionRow> {
  if (profile.connection_id) {
    const { data, error } = await admin
      .from("platform_connections")
      .select("*")
      .eq("id", profile.connection_id)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load connection: ${error.message}`);
    }
    if (!data) {
      throw new Error(
        `Profile's connection has been removed. Bind a new connection in the profile settings.`,
      );
    }
    if (data.status !== "active") {
      throw new Error(
        `Connection "${data.display_name}" is ${data.status}. Reconnect it before syncing.`,
      );
    }
    return data;
  }

  const { data: candidates, error } = await admin
    .from("platform_connections")
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .eq("platform", profile.platform)
    .eq("status", "active");
  if (error) {
    throw new Error(`Failed to look up connections: ${error.message}`);
  }
  if (!candidates || candidates.length === 0) {
    throw new Error(
      `No active ${profile.platform} connection found for this workspace`,
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      `Multiple ${profile.platform} connections exist — pick one on the profile before syncing.`,
    );
  }
  return candidates[0];
}

async function syncIssues(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  detected: DetectedIssue[]
): Promise<void> {
  // Load ALL prior issues (not just open) so we can reopen resolved ones
  // instead of inserting duplicates when the same issue reappears.
  const { data: existing } = await admin
    .from("automation_issues")
    .select("id, name, automation_name, status")
    .eq("profile_id", profileId);

  const detectedKeys = new Set(
    detected.map((d) => `${d.name}::${d.automationName}`)
  );

  // Group existing rows by issue key. If duplicates exist in the DB
  // (from an earlier bug), we'll reopen the newest and resolve the rest.
  const existingByKey = new Map<string, { id: string; status: string }[]>();
  for (const row of existing ?? []) {
    const key = `${row.name}::${row.automation_name}`;
    const list = existingByKey.get(key) ?? [];
    list.push({ id: row.id, status: row.status });
    existingByKey.set(key, list);
  }

  const now = new Date().toISOString();
  const idsToResolve: string[] = [];
  const idsToReopen: string[] = [];

  // For every existing issue: if no longer detected, mark open ones resolved.
  // If still detected, keep exactly one row open and resolve accidental duplicates.
  existingByKey.forEach((rows, key) => {
    if (!detectedKeys.has(key)) {
      for (const r of rows) {
        if (r.status === "open") idsToResolve.push(r.id);
      }
      return;
    }

    // Still detected — prefer an already-open row, else reopen one resolved row.
    const openRows = rows.filter((r: { id: string; status: string }) => r.status === "open");
    if (openRows.length > 0) {
      // Keep first open, resolve extra duplicates.
      for (let i = 1; i < openRows.length; i++) idsToResolve.push(openRows[i].id);
    } else {
      // Reopen a single resolved row.
      idsToReopen.push(rows[0].id);
    }
  });

  if (idsToResolve.length > 0) {
    await admin
      .from("automation_issues")
      .update({ status: "resolved", resolved_at: now })
      .in("id", idsToResolve);
  }

  if (idsToReopen.length > 0) {
    await admin
      .from("automation_issues")
      .update({ status: "open", resolved_at: null })
      .in("id", idsToReopen);
  }

  // Insert only issues that have no prior row at all.
  const newIssues = detected
    .filter((issue) => !existingByKey.has(`${issue.name}::${issue.automationName}`))
    .map((issue) => ({
      profile_id: profileId,
      type: issue.type,
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
