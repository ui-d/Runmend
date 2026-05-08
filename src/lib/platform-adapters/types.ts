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

export interface WorkflowExecutionResult {
  ok: boolean;
  /** JSON-serializable output from the workflow run, or null if unavailable. */
  output: unknown;
  /** Wall-clock duration of the workflow run, including any polling. */
  latencyMs: number;
  error?: string;
}

export interface PlatformAdapter {
  testConnection(): Promise<ConnectionTestResult>;
  fetchAutomations(): Promise<NormalizedAutomation[]>;
  fetchExecutionLogs(since: Date): Promise<NormalizedExecution[]>;
  /**
   * Trigger a workflow with the given input and wait for completion.
   * Implementations should respect a sensible internal timeout and return
   * `ok: false` rather than throwing when the run cannot be observed.
   */
  executeWorkflow(
    workflowExternalId: string,
    input: unknown,
  ): Promise<WorkflowExecutionResult>;
}
