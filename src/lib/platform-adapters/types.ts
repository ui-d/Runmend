export interface NormalizedAutomation {
  externalId: string;
  name: string;
  status: string;
  triggerType: string | null;
  lastRunAt: string | null;
}

export interface NormalizedExecution {
  externalId: string;
  automationExternalId: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface PlatformAdapter {
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  fetchAutomations(): Promise<NormalizedAutomation[]>;
  fetchExecutionLogs(since: Date): Promise<NormalizedExecution[]>;
}
