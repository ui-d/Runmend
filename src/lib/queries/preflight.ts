import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import type {
  AssertionRow,
  AssertionType,
  InputRow,
  RunResultRow,
  RunRow,
  ScenarioInsert,
  ScenarioRow,
  ScenarioUpdate,
} from "@/lib/preflight/types";

type Client = SupabaseClient<Database>;

export interface AssertionInput {
  assertion_type: AssertionType;
  config: Record<string, Json>;
  severity?: "fail" | "warn";
}

export interface InputDraft {
  input_data: Json;
  label?: string | null;
  source?: "manual" | "production_trace" | "imported_csv";
  pii_redacted_at?: string | null;
}

export interface CreateScenarioInput {
  workspaceId: string;
  connectionId: string;
  automationProfileId?: string | null;
  name: string;
  description?: string | null;
  workflowExternalId: string;
  workflowName?: string | null;
  scheduleCron?: string | null;
  costCapCents?: number;
  createdBy?: string | null;
  inputs: ReadonlyArray<InputDraft>;
  assertions: ReadonlyArray<AssertionInput>;
}

export async function listScenarios(
  client: Client,
  workspaceId: string,
): Promise<ScenarioRow[]> {
  const { data, error } = await client
    .from("preflight_scenarios")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getScenario(
  client: Client,
  scenarioId: string,
): Promise<ScenarioRow | null> {
  const { data, error } = await client
    .from("preflight_scenarios")
    .select("*")
    .eq("id", scenarioId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getScenarioWithDetails(
  client: Client,
  scenarioId: string,
): Promise<{
  scenario: ScenarioRow;
  assertions: AssertionRow[];
  inputs: InputRow[];
} | null> {
  const scenario = await getScenario(client, scenarioId);
  if (!scenario) return null;

  const [assertionsRes, inputsRes] = await Promise.all([
    client.from("preflight_assertions").select("*").eq("scenario_id", scenarioId),
    client
      .from("preflight_inputs")
      .select("*")
      .eq("scenario_id", scenarioId)
      .order("created_at", { ascending: true }),
  ]);
  if (assertionsRes.error) throw assertionsRes.error;
  if (inputsRes.error) throw inputsRes.error;

  return {
    scenario,
    assertions: assertionsRes.data ?? [],
    inputs: inputsRes.data ?? [],
  };
}

export async function countActiveScenarios(
  client: Client,
  workspaceId: string,
): Promise<number> {
  const { data, error } = await client
    .from("preflight_scenarios")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null);
  if (error) throw error;
  return (data ?? []).length;
}

export async function countRunsThisMonth(
  client: Client,
  workspaceId: string,
): Promise<number> {
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);
  const { data, error } = await client
    .from("preflight_runs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .gte("started_at", since.toISOString());
  if (error) throw error;
  return (data ?? []).length;
}

/**
 * Create a scenario and its inputs + assertions in one logical operation.
 * Done as three sequential statements rather than a single RPC because
 * RLS on the admin client is bypassed and atomicity beyond the per-table
 * transaction isn't worth a stored procedure here. If the assertion or
 * input write fails, the scenario row is rolled back via a manual delete.
 */
export async function createScenario(
  admin: Client,
  input: CreateScenarioInput,
): Promise<ScenarioRow> {
  const insert: ScenarioInsert = {
    workspace_id: input.workspaceId,
    connection_id: input.connectionId,
    automation_profile_id: input.automationProfileId ?? null,
    name: input.name,
    description: input.description ?? null,
    workflow_external_id: input.workflowExternalId,
    workflow_name: input.workflowName ?? null,
    schedule_cron: input.scheduleCron ?? null,
    cost_cap_cents: input.costCapCents ?? 500,
    created_by: input.createdBy ?? null,
  };

  const { data: scenario, error: scenarioErr } = await admin
    .from("preflight_scenarios")
    .insert(insert)
    .select()
    .single();
  if (scenarioErr || !scenario) throw scenarioErr ?? new Error("Failed to create scenario");

  try {
    if (input.inputs.length > 0) {
      const { error: inputsErr } = await admin
        .from("preflight_inputs")
        .insert(
          input.inputs.map((row) => ({
            workspace_id: input.workspaceId,
            scenario_id: scenario.id,
            input_data: row.input_data,
            label: row.label ?? null,
            source: row.source ?? "manual",
            pii_redacted_at: row.pii_redacted_at ?? null,
          })),
        );
      if (inputsErr) throw inputsErr;
    }

    if (input.assertions.length > 0) {
      const { error: assertionsErr } = await admin
        .from("preflight_assertions")
        .insert(
          input.assertions.map((row) => ({
            workspace_id: input.workspaceId,
            scenario_id: scenario.id,
            assertion_type: row.assertion_type,
            config: row.config as Json,
            severity: row.severity ?? "fail",
          })),
        );
      if (assertionsErr) throw assertionsErr;
    }
  } catch (err) {
    await admin.from("preflight_scenarios").delete().eq("id", scenario.id);
    throw err;
  }

  return scenario;
}

export async function updateScenario(
  admin: Client,
  scenarioId: string,
  patch: ScenarioUpdate,
): Promise<ScenarioRow> {
  const { data, error } = await admin
    .from("preflight_scenarios")
    .update(patch)
    .eq("id", scenarioId)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Failed to update scenario");
  return data;
}

export async function archiveScenario(admin: Client, scenarioId: string): Promise<void> {
  const { error } = await admin
    .from("preflight_scenarios")
    .update({ archived_at: new Date().toISOString(), enabled: false })
    .eq("id", scenarioId);
  if (error) throw error;
}

export async function listRunsForScenario(
  client: Client,
  scenarioId: string,
  limit = 20,
): Promise<RunRow[]> {
  const { data, error } = await client
    .from("preflight_runs")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getRun(client: Client, runId: string): Promise<RunRow | null> {
  const { data, error } = await client
    .from("preflight_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRunResults(
  client: Client,
  runId: string,
): Promise<RunResultRow[]> {
  const { data, error } = await client
    .from("preflight_run_results")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
