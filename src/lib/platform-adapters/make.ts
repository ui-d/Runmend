import type {
  PlatformAdapter,
  NormalizedAutomation,
  NormalizedExecution,
} from "./types";

export class MakeAdapter implements PlatformAdapter {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(apiToken: string, zone: string = "us1") {
    this.baseUrl = `https://${zone}.make.com/api/v2`;
    this.headers = {
      Authorization: `Token ${apiToken}`,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/users/me`, {
        headers: this.headers,
      });
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `Make.com API error: ${res.status} ${body}` };
      }
      return { ok: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      return { ok: false, error: message };
    }
  }

  async fetchAutomations(): Promise<NormalizedAutomation[]> {
    const res = await fetch(`${this.baseUrl}/scenarios?pg[limit]=500`, {
      headers: this.headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch scenarios: ${res.status}`);
    }

    const data = await res.json();
    const scenarios = data.scenarios ?? data ?? [];

    return scenarios.map(
      (s: Record<string, unknown>): NormalizedAutomation => ({
        externalId: String(s.id),
        name: String(s.name || "Unnamed Scenario"),
        status: s.islinked ? "active" : "inactive",
        triggerType: null,
        lastRunAt: s.lastEdit ? String(s.lastEdit) : null,
      })
    );
  }

  async fetchExecutionLogs(since: Date): Promise<NormalizedExecution[]> {
    const executions: NormalizedExecution[] = [];

    // Fetch scenarios first to get IDs
    const automations = await this.fetchAutomations();

    for (const automation of automations.slice(0, 50)) {
      try {
        const sinceStr = since.toISOString();
        const res = await fetch(
          `${this.baseUrl}/scenarios/${automation.externalId}/logs?pg[limit]=100&from=${sinceStr}`,
          { headers: this.headers }
        );

        if (!res.ok) continue;

        const data = await res.json();
        const logs = Array.isArray(data) ? data : data.scenarioLogs ?? [];

        for (const log of logs) {
          executions.push({
            externalId: String(log.id ?? log.executionId ?? ""),
            automationExternalId: automation.externalId,
            status: mapMakeStatus(log.status),
            startedAt: String(log.timestamp ?? log.startedAt ?? ""),
            finishedAt: log.finishedAt ? String(log.finishedAt) : null,
            errorMessage: log.error ? String(log.error) : null,
          });
        }
      } catch {
        // Skip scenarios that fail to fetch logs
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
