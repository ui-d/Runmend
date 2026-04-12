import type {
  PlatformAdapter,
  NormalizedAutomation,
  NormalizedExecution,
} from "./types";

interface ZapierAdapterConfig {
  authType: "webhook" | "oauth";
}

export class ZapierAdapter implements PlatformAdapter {
  private readonly authType: "webhook" | "oauth";

  constructor(config: ZapierAdapterConfig = { authType: "webhook" }) {
    this.authType = config.authType;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (this.authType === "webhook") {
      return { ok: true };
    }

    // Future: OAuth mode will validate access token against Zapier API
    return {
      ok: false,
      error:
        "Zapier OAuth integration requires Partner Program access. Use webhook mode instead.",
    };
  }

  async fetchAutomations(): Promise<NormalizedAutomation[]> {
    if (this.authType === "webhook") {
      // Automations are auto-discovered from incoming webhook payloads
      return [];
    }

    // Future: OAuth mode will fetch from Zapier API
    throw new Error("Zapier OAuth integration not yet available");
  }

  async fetchExecutionLogs(): Promise<NormalizedExecution[]> {
    if (this.authType === "webhook") {
      // Execution logs are pushed via webhooks, not pulled
      return [];
    }

    // Future: OAuth mode will fetch from Zapier API
    throw new Error("Zapier OAuth integration not yet available");
  }
}
