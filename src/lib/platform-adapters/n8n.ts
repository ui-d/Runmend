import type {
  PlatformAdapter,
  NormalizedAutomation,
  NormalizedExecution,
} from "./types";
import { fetchWithRetry } from "./retry";

export class N8nAdapter implements PlatformAdapter {
  private instanceUrl: string;
  private headers: Record<string, string>;

  constructor(apiKey: string, instanceUrl: string) {
    this.instanceUrl = instanceUrl.replace(/\/$/, "");
    this.headers = {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
    };
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetchWithRetry(
        `${this.instanceUrl}/api/v1/workflows?limit=1`,
        { headers: this.headers }
      );
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `n8n API error: ${res.status} ${body}` };
      }
      return { ok: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      return { ok: false, error: message };
    }
  }

  async fetchAutomations(): Promise<NormalizedAutomation[]> {
    const res = await fetchWithRetry(
      `${this.instanceUrl}/api/v1/workflows?limit=250`,
      { headers: this.headers }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch workflows: ${res.status}`);
    }

    const data = await res.json();
    const workflows = data.data ?? data ?? [];

    return workflows.map(
      (w: Record<string, unknown>): NormalizedAutomation => ({
        externalId: String(w.id),
        name: String(w.name || "Unnamed Workflow"),
        status: w.active ? "active" : "inactive",
        triggerType: null,
        lastRunAt: w.updatedAt ? String(w.updatedAt) : null,
      })
    );
  }

  async fetchExecutionLogs(since: Date): Promise<NormalizedExecution[]> {
    const executions: NormalizedExecution[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < 5; page++) {
      const params = new URLSearchParams({ limit: "250" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetchWithRetry(
        `${this.instanceUrl}/api/v1/executions?${params}`,
        { headers: this.headers }
      );

      if (!res.ok) break;

      const data = await res.json();
      const items = data.data ?? data ?? [];

      for (const exec of items) {
        const startedAt = exec.startedAt ?? exec.createdAt ?? "";
        if (new Date(startedAt) < since) return executions;

        executions.push({
          externalId: String(exec.id),
          automationExternalId: String(exec.workflowId ?? ""),
          status: exec.finished
            ? exec.stoppedAt
              ? "success"
              : "error"
            : "running",
          startedAt: String(startedAt),
          finishedAt: exec.stoppedAt ? String(exec.stoppedAt) : null,
          errorMessage: null,
        });
      }

      cursor = data.nextCursor;
      if (!cursor || items.length === 0) break;
    }

    return executions;
  }
}
