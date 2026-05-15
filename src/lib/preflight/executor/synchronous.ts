import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import type { PlatformAdapter } from "@/lib/platform-adapters/types";
import Anthropic from "@anthropic-ai/sdk";
import { createAdapter } from "@/lib/platform-adapters";
import { decrypt } from "@/lib/crypto";
import { evaluateAllAssertions } from "@/lib/preflight/assertions";
import type { AnthropicLike } from "@/lib/preflight/judge/client";
import type { JudgeDeps } from "@/lib/preflight/assertions/llm-judge";
import { BATCH_SIZE, MAX_INPUTS_PER_RUN } from "@/lib/preflight/limits";
import type {
  AssertionRow,
  InputRow,
  ScenarioRow,
  SingleAssertionOutcome,
  TriggeredBy,
} from "@/lib/preflight/types";
import type {
  ExecuteOptions,
  ExecuteResult,
  RunExecutor,
} from "./types";

type Admin = SupabaseClient<Database>;
type ConnectionRow = Database["public"]["Tables"]["platform_connections"]["Row"];

/** Shared Claude client for `llm_judge`; undefined when no API key is set. */
export interface JudgeClientHolder {
  client: AnthropicLike;
}

export interface SynchronousExecutorDeps {
  /** Service-role client used for all writes. RLS is bypassed by design. */
  loadAdmin: () => Admin;
  /** Override point for tests — produces a working PlatformAdapter from a stored connection. */
  buildAdapter?: (connection: ConnectionRow) => PlatformAdapter;
  /** Override point for tests — produces the shared judge client, or undefined to disable. */
  buildJudge?: () => JudgeClientHolder | undefined;
}

/**
 * Default judge client: a real Anthropic SDK client when `ANTHROPIC_API_KEY`
 * is configured, otherwise undefined so `llm_judge` degrades to a non-fatal
 * warn instead of crashing the run.
 */
export function defaultBuildJudge(): JudgeClientHolder | undefined {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return undefined;
  return { client: new Anthropic({ apiKey }) as unknown as AnthropicLike };
}

/**
 * Fetch the baseline run's recorded output for a single input, used by
 * `llm_judge` when `baseline_run_id` is set. Defensive: any error (RLS,
 * missing row) yields null so the judge scores absolutely rather than crashing.
 */
async function fetchBaselineOutput(
  admin: Admin,
  baselineRunId: string,
  inputId: string,
): Promise<Json | null> {
  try {
    const { data, error } = await admin
      .from("preflight_run_results")
      .select("output_data")
      .eq("run_id", baselineRunId)
      .eq("input_id", inputId)
      .maybeSingle();
    if (error || !data) return null;
    return data.output_data;
  } catch {
    return null;
  }
}

function defaultBuildAdapter(connection: ConnectionRow): PlatformAdapter {
  if (connection.platform !== "make" && connection.platform !== "n8n") {
    throw new Error(`Unsupported platform: ${connection.platform}`);
  }
  if (!connection.api_key_encrypted) {
    throw new Error("Connection has no stored API key");
  }
  const apiKey = decrypt(connection.api_key_encrypted);
  return createAdapter(connection.platform, {
    apiKey,
    instanceUrl: connection.instance_url ?? undefined,
    zone: connection.zone ?? undefined,
    teamId: connection.team_id ?? undefined,
  });
}

/**
 * Process every input through the adapter, evaluate assertions, and write
 * one preflight_run_results row per input. The executor short-circuits at
 * the configured cost cap and returns partial results with status
 * "cost_capped". A network failure on a single input is treated as that
 * input erroring — the run continues.
 */
export class SynchronousRunExecutor implements RunExecutor {
  constructor(private readonly deps: SynchronousExecutorDeps) {}

  async execute(options: ExecuteOptions): Promise<ExecuteResult> {
    const admin = this.deps.loadAdmin();
    const buildAdapter = this.deps.buildAdapter ?? defaultBuildAdapter;

    const scenario = await loadScenario(admin, options.scenarioId);
    const [assertions, inputs] = await Promise.all([
      loadAssertions(admin, scenario.id),
      loadInputs(admin, scenario.id, MAX_INPUTS_PER_RUN),
    ]);
    const connection = await loadConnection(admin, scenario.connection_id);

    const run = await insertRun(admin, scenario, options.triggeredBy, options.triggeredByUser ?? null);

    if (inputs.length === 0) {
      await finalizeRun(admin, run.id, {
        status: "errored",
        totalInputs: 0,
        passedCount: 0,
        failedCount: 0,
        erroredCount: 0,
        passRate: null,
        totalCostCents: 0,
        totalLatencyMs: 0,
      });
      return {
        runId: run.id,
        status: "errored",
        totalInputs: 0,
        passedCount: 0,
        failedCount: 0,
        erroredCount: 0,
        totalCostCents: 0,
      };
    }

    let adapter: PlatformAdapter;
    try {
      adapter = buildAdapter(connection);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Adapter build failed";
      await markEveryInputErrored(admin, run, scenario.workspace_id, inputs, message);
      return {
        runId: run.id,
        status: "errored",
        totalInputs: inputs.length,
        passedCount: 0,
        failedCount: 0,
        erroredCount: inputs.length,
        totalCostCents: 0,
      };
    }

    const judgeHolder = (this.deps.buildJudge ?? defaultBuildJudge)();
    const platform: "make" | "n8n" =
      connection.platform === "n8n" ? "n8n" : "make";

    let passedCount = 0;
    let failedCount = 0;
    let erroredCount = 0;
    let runningCostCents = 0;
    let runningLatencyMs = 0;
    let costCapped = false;

    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      if (runningCostCents >= scenario.cost_cap_cents) {
        costCapped = true;
        break;
      }
      const batch = inputs.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((input) =>
          runOneInput(adapter, scenario, assertions, input, {
            platform,
            judgeHolder,
            admin,
          }),
        ),
      );

      for (let j = 0; j < batch.length; j++) {
        const input = batch[j];
        const outcome = batchResults[j];
        if (input === undefined || outcome === undefined) continue;
        await insertResult(admin, run, scenario.workspace_id, input.id, outcome);
        if (outcome.errored) {
          erroredCount += 1;
        } else if (outcome.passed) {
          passedCount += 1;
        } else {
          failedCount += 1;
        }
        runningCostCents += outcome.costCents ?? 0;
        runningLatencyMs += outcome.latencyMs ?? 0;
      }
    }

    const consumedInputs = passedCount + failedCount + erroredCount;
    const status: ExecuteResult["status"] = costCapped
      ? "cost_capped"
      : erroredCount === inputs.length
        ? "errored"
        : failedCount > 0
          ? "failed"
          : "passed";
    const passRate =
      consumedInputs > 0
        ? Math.round((passedCount / consumedInputs) * 10_000) / 10_000
        : null;

    await finalizeRun(admin, run.id, {
      status,
      totalInputs: consumedInputs,
      passedCount,
      failedCount,
      erroredCount,
      passRate,
      totalCostCents: runningCostCents,
      totalLatencyMs: runningLatencyMs,
    });

    return {
      runId: run.id,
      status,
      totalInputs: consumedInputs,
      passedCount,
      failedCount,
      erroredCount,
      totalCostCents: Math.round(runningCostCents),
    };
  }
}

async function loadScenario(admin: Admin, scenarioId: string): Promise<ScenarioRow> {
  const { data, error } = await admin
    .from("preflight_scenarios")
    .select("*")
    .eq("id", scenarioId)
    .single();
  if (error || !data) throw error ?? new Error("Scenario not found");
  if (data.archived_at !== null) throw new Error("Scenario is archived");
  if (!data.enabled) throw new Error("Scenario is disabled");
  return data;
}

async function loadAssertions(
  admin: Admin,
  scenarioId: string,
): Promise<AssertionRow[]> {
  const { data, error } = await admin
    .from("preflight_assertions")
    .select("*")
    .eq("scenario_id", scenarioId);
  if (error) throw error;
  return data ?? [];
}

async function loadInputs(
  admin: Admin,
  scenarioId: string,
  limit: number,
): Promise<InputRow[]> {
  const { data, error } = await admin
    .from("preflight_inputs")
    .select("*")
    .eq("scenario_id", scenarioId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

async function loadConnection(admin: Admin, connectionId: string): Promise<ConnectionRow> {
  const { data, error } = await admin
    .from("platform_connections")
    .select("*")
    .eq("id", connectionId)
    .single();
  if (error || !data) throw error ?? new Error("Connection not found");
  return data;
}

async function insertRun(
  admin: Admin,
  scenario: ScenarioRow,
  triggeredBy: TriggeredBy,
  triggeredByUser: string | null,
) {
  const { data, error } = await admin
    .from("preflight_runs")
    .insert({
      workspace_id: scenario.workspace_id,
      scenario_id: scenario.id,
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser,
      status: "running",
      total_inputs: 0,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Failed to create run");
  return data;
}

interface InputOutcome {
  output: Json | null;
  passed: boolean;
  errored: boolean;
  outcomes: SingleAssertionOutcome[];
  latencyMs: number | null;
  costCents: number | null;
  errorMessage: string | null;
}

interface EvalEnv {
  platform: "make" | "n8n";
  judgeHolder: JudgeClientHolder | undefined;
  admin: Admin;
}

async function runOneInput(
  adapter: PlatformAdapter,
  scenario: ScenarioRow,
  assertions: AssertionRow[],
  input: InputRow,
  env: EvalEnv,
): Promise<InputOutcome> {
  const exec = await adapter.executeWorkflow(scenario.workflow_external_id, input.input_data);
  if (!exec.ok || exec.output == null) {
    return {
      output: (exec.output ?? null) as Json | null,
      passed: false,
      errored: true,
      outcomes: [],
      latencyMs: exec.latencyMs,
      costCents: 0,
      errorMessage: exec.error ?? "Workflow execution failed",
    };
  }
  const output = exec.output as Json;
  const judge: JudgeDeps | undefined = env.judgeHolder
    ? {
        client: env.judgeHolder.client,
        getBaselineResult: (baselineRunId: string) =>
          fetchBaselineOutput(env.admin, baselineRunId, input.id),
      }
    : undefined;
  const { passed, outcomes } = await evaluateAllAssertions(assertions, {
    output,
    latency_ms: exec.latencyMs,
    cost_cents: 0,
    platform: env.platform,
    judge,
  });
  // Judge token spend rolls into the run's cost total (existing plumbing).
  const costCents = outcomes.reduce((sum, o) => sum + (o.costCents ?? 0), 0);
  return {
    output,
    passed,
    errored: false,
    outcomes,
    latencyMs: exec.latencyMs,
    costCents,
    errorMessage: null,
  };
}

async function insertResult(
  admin: Admin,
  run: { id: string },
  workspaceId: string,
  inputId: string,
  outcome: InputOutcome,
): Promise<void> {
  const { error } = await admin.from("preflight_run_results").insert({
    workspace_id: workspaceId,
    run_id: run.id,
    input_id: inputId,
    output_data: outcome.output,
    passed: outcome.passed,
    assertion_results: outcome.outcomes as unknown as Json,
    latency_ms: outcome.latencyMs,
    // Column is integer cents; sub-cent judge costs round here (the accurate
    // fractional sum is preserved in the run-level total_cost_cents).
    cost_cents:
      outcome.costCents == null ? null : Math.round(outcome.costCents),
    error_message: outcome.errorMessage,
  });
  if (error) throw error;
}

async function markEveryInputErrored(
  admin: Admin,
  run: { id: string },
  workspaceId: string,
  inputs: InputRow[],
  message: string,
): Promise<void> {
  for (const input of inputs) {
    await insertResult(admin, run, workspaceId, input.id, {
      output: null,
      passed: false,
      errored: true,
      outcomes: [],
      latencyMs: null,
      costCents: 0,
      errorMessage: message,
    });
  }
  await finalizeRun(admin, run.id, {
    status: "errored",
    totalInputs: inputs.length,
    passedCount: 0,
    failedCount: 0,
    erroredCount: inputs.length,
    passRate: 0,
    totalCostCents: 0,
    totalLatencyMs: 0,
  });
}

interface RunFinalization {
  status: ExecuteResult["status"];
  totalInputs: number;
  passedCount: number;
  failedCount: number;
  erroredCount: number;
  passRate: number | null;
  totalCostCents: number;
  totalLatencyMs: number;
}

async function finalizeRun(
  admin: Admin,
  runId: string,
  fin: RunFinalization,
): Promise<void> {
  const { error } = await admin
    .from("preflight_runs")
    .update({
      status: fin.status,
      total_inputs: fin.totalInputs,
      passed_count: fin.passedCount,
      failed_count: fin.failedCount,
      errored_count: fin.erroredCount,
      pass_rate: fin.passRate,
      total_cost_cents: Math.round(fin.totalCostCents),
      total_latency_ms: fin.totalLatencyMs,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) throw error;
}
