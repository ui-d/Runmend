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

export interface ConnectionTestResult {
  ok: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface PlatformAdapter {
  testConnection(): Promise<ConnectionTestResult>;
  fetchAutomations(): Promise<NormalizedAutomation[]>;
  fetchExecutionLogs(since: Date): Promise<NormalizedExecution[]>;
}
