import type {
  PlatformAdapter,
  ConnectionTestResult,
  NormalizedAutomation,
  NormalizedExecution,
} from "./types";
import { fetchWithRetry } from "./retry";

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
      const userData = await res.json();

      // Discover organizationId for listing scenarios
      let teamId: number | null = null;
      const orgsRes = await fetchWithRetry(`${this.baseUrl}/organizations`, {
        headers: this.headers,
      });
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        const orgs = orgsData.organizations ?? orgsData ?? [];
        if (Array.isArray(orgs) && orgs.length > 0) {
          teamId = orgs[0].id;
        }
      }

      if (teamId) this.teamId = teamId;
      return { ok: true, metadata: { teamId } };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      return { ok: false, error: message };
    }
  }

  private async resolveOrgId(): Promise<number | null> {
    if (this.teamId) return this.teamId;
    const res = await fetchWithRetry(`${this.baseUrl}/organizations`, {
      headers: this.headers,
    });
    if (res.ok) {
      const data = await res.json();
      const orgs = data.organizations ?? data ?? [];
      if (Array.isArray(orgs) && orgs.length > 0) {
        this.teamId = orgs[0].id;
      }
    }
    return this.teamId;
  }

  async fetchAutomations(): Promise<NormalizedAutomation[]> {
    const orgId = await this.resolveOrgId();
    const allScenarios: NormalizedAutomation[] = [];
    const pageSize = 500;
    const maxPages = 10;

    for (let page = 0; page < maxPages; page++) {
      const offset = page * pageSize;
      const orgParam = orgId ? `&organizationId=${orgId}` : "";
      const res = await fetchWithRetry(
        `${this.baseUrl}/scenarios?pg[limit]=${pageSize}&pg[offset]=${offset}${orgParam}`,
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
