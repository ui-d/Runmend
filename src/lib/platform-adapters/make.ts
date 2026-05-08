import type {
  PlatformAdapter,
  ConnectionTestResult,
  NormalizedAutomation,
  NormalizedExecution,
  WorkflowExecutionResult,
} from "./types";
import { fetchWithRetry } from "./retry";

const WORKFLOW_POLL_TIMEOUT_MS = 60_000;
const WORKFLOW_POLL_INTERVAL_MS = 2_000;

export class MakeAdapter implements PlatformAdapter {
  private baseUrl: string;
  private headers: Record<string, string>;
  private teamId: number | null;

  constructor(apiToken: string, zone: string = "us1", teamId?: number) {
    this.baseUrl = `https://${zone}.make.com/api/v2`;
    this.headers = {
      Authorization: `Token ${apiToken}`,
      "Content-Type": "application/json",
    };
    this.teamId = teamId ?? null;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const res = await fetchWithRetry(`${this.baseUrl}/users/me`, {
        headers: this.headers,
      });
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `Make.com API error: ${res.status} ${body}` };
      }

      const teamId = await this.discoverTeamId();
      if (teamId) this.teamId = teamId;
      return { ok: true, metadata: { teamId } };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      return { ok: false, error: message };
    }
  }

  private async discoverTeamId(): Promise<number | null> {
    // Make.com hierarchy: organizations → teams → scenarios.
    // Scenario browser URLs use the *team* id in the path, so we resolve the
    // first team under the first organization the token can see.
    const orgsRes = await fetchWithRetry(`${this.baseUrl}/organizations`, {
      headers: this.headers,
    });
    if (!orgsRes.ok) return null;

    const orgsData = await orgsRes.json();
    const orgs = orgsData.organizations ?? orgsData ?? [];
    if (!Array.isArray(orgs) || orgs.length === 0) return null;
    const orgId = orgs[0].id;
    if (!orgId) return null;

    const teamsRes = await fetchWithRetry(
      `${this.baseUrl}/teams?organizationId=${orgId}`,
      { headers: this.headers },
    );
    if (!teamsRes.ok) return null;

    const teamsData = await teamsRes.json();
    const teams = teamsData.teams ?? teamsData ?? [];
    if (!Array.isArray(teams) || teams.length === 0) return null;
    return teams[0].id ?? null;
  }

  private async resolveTeamId(): Promise<number | null> {
    if (this.teamId) return this.teamId;
    const teamId = await this.discoverTeamId();
    if (teamId) this.teamId = teamId;
    return this.teamId;
  }

  async fetchAutomations(): Promise<NormalizedAutomation[]> {
    const teamId = await this.resolveTeamId();
    const allScenarios: NormalizedAutomation[] = [];
    const pageSize = 500;
    const maxPages = 10;

    for (let page = 0; page < maxPages; page++) {
      const offset = page * pageSize;
      const teamParam = teamId ? `&teamId=${teamId}` : "";
      const res = await fetchWithRetry(
        `${this.baseUrl}/scenarios?pg[limit]=${pageSize}&pg[offset]=${offset}${teamParam}`,
        { headers: this.headers }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch scenarios: ${res.status}`);
      }

      const data = await res.json();
      const scenarios = data.scenarios ?? data ?? [];

      const normalized = scenarios.map(
        (s: Record<string, unknown>): NormalizedAutomation => ({
          externalId: String(s.id),
          name: String(s.name || "Unnamed Scenario"),
          status: s.isActive ?? s.islinked ? "active" : "inactive",
          triggerType: null,
          lastRunAt: s.lastEdit ? String(s.lastEdit) : null,
        })
      );

      allScenarios.push(...normalized);

      // Stop if we got fewer than a full page
      if (scenarios.length < pageSize) break;
    }

    return allScenarios;
  }

  async executeWorkflow(
    workflowExternalId: string,
    input: unknown,
  ): Promise<WorkflowExecutionResult> {
    const teamId = await this.resolveTeamId();
    return executeMakeWorkflow(
      { baseUrl: this.baseUrl, headers: this.headers, teamId },
      workflowExternalId,
      input,
    );
  }

  async fetchExecutionLogs(since: Date): Promise<NormalizedExecution[]> {
    const executions: NormalizedExecution[] = [];
    const automations = await this.fetchAutomations();
    const sinceStr = since.toISOString();

    // Process in chunks of 10 to avoid rate limiting
    const chunkSize = 10;
    for (let i = 0; i < automations.length; i += chunkSize) {
      const chunk = automations.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(async (automation) => {
          const res = await fetchWithRetry(
            `${this.baseUrl}/scenarios/${automation.externalId}/logs?pg[limit]=100&from=${sinceStr}`,
            { headers: this.headers }
          );

          if (!res.ok) return [];

          const data = await res.json();
          const logs = Array.isArray(data) ? data : data.scenarioLogs ?? [];

          return logs.map(
            (log: Record<string, unknown>): NormalizedExecution => ({
              externalId: String(log.id ?? log.executionId ?? ""),
              automationExternalId: automation.externalId,
              status: mapMakeStatus(log.status),
              startedAt: String(log.timestamp ?? log.startedAt ?? ""),
              finishedAt: log.finishedAt ? String(log.finishedAt) : null,
              errorMessage: log.error ? String(log.error) : null,
            })
          );
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          executions.push(...result.value);
        }
      }
    }

    return executions;
  }
}

function mapMakeStatus(status: unknown): string {
  const s = String(status).toLowerCase();
  if (s === "success" || s === "1") return "success";
  if (s === "error" || s === "0") return "error";
  if (s === "warning" || s === "2") return "warning";
  return "unknown";
}

/**
 * Trigger a Make scenario via /scenarios/{id}/run, then poll the most
 * recent log entry for completion. Returns the parsed log payload as the
 * "output" because Make does not expose direct module results in its
 * public v2 API. Pre-flight assertions are written against that envelope.
 */
async function executeMakeWorkflow(
  ctx: { baseUrl: string; headers: Record<string, string>; teamId: number | null },
  scenarioId: string,
  input: unknown,
): Promise<WorkflowExecutionResult> {
  const startedAt = Date.now();
  try {
    const teamParam = ctx.teamId ? `?teamId=${ctx.teamId}` : "";
    const triggerRes = await fetchWithRetry(
      `${ctx.baseUrl}/scenarios/${scenarioId}/run${teamParam}`,
      {
        method: "POST",
        headers: ctx.headers,
        body: JSON.stringify({ data: input ?? {} }),
      },
    );
    if (!triggerRes.ok) {
      return {
        ok: false,
        output: null,
        latencyMs: Date.now() - startedAt,
        error: `Make trigger failed: ${triggerRes.status}`,
      };
    }
    const triggerData = (await triggerRes.json()) as Record<string, unknown>;
    const executionId =
      (triggerData.executionId as string | undefined) ??
      (triggerData.execution_id as string | undefined);

    while (Date.now() - startedAt < WORKFLOW_POLL_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, WORKFLOW_POLL_INTERVAL_MS));
      const logsRes = await fetchWithRetry(
        `${ctx.baseUrl}/scenarios/${scenarioId}/logs?pg[limit]=5${teamParam ? `&teamId=${ctx.teamId}` : ""}`,
        { headers: ctx.headers },
      );
      if (!logsRes.ok) continue;
      const logsData = (await logsRes.json()) as Record<string, unknown>;
      const logs = (logsData.scenarioLogs ?? logsData ?? []) as Array<
        Record<string, unknown>
      >;
      if (!Array.isArray(logs) || logs.length === 0) continue;
      const match = executionId
        ? logs.find((log) => String(log.id ?? log.executionId) === executionId)
        : logs[0];
      if (!match) continue;
      const status = mapMakeStatus(match.status);
      if (status === "unknown") continue;
      return {
        ok: status === "success",
        output: match,
        latencyMs: Date.now() - startedAt,
        error: status === "success" ? undefined : (match.error as string | undefined) ?? "Workflow failed",
      };
    }
    return {
      ok: false,
      output: null,
      latencyMs: Date.now() - startedAt,
      error: "Timed out waiting for Make scenario to complete",
    };
  } catch (err: unknown) {
    return {
      ok: false,
      output: null,
      latencyMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : "Workflow execution failed",
    };
  }
}
