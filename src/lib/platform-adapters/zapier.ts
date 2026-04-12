import type {
  PlatformAdapter,
  NormalizedAutomation,
  NormalizedExecution,
} from "./types";

export class ZapierAdapter implements PlatformAdapter {
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    return {
      ok: false,
      error:
        "Zapier integration requires OAuth Partner Program access. Coming soon.",
    };
  }

  async fetchAutomations(): Promise<NormalizedAutomation[]> {
    throw new Error("Zapier integration not yet available");
  }

  async fetchExecutionLogs(): Promise<NormalizedExecution[]> {
    throw new Error("Zapier integration not yet available");
  }
}
