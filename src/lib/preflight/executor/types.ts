import type { TriggeredBy } from "@/lib/preflight/types";

export interface ExecuteOptions {
  scenarioId: string;
  triggeredBy: TriggeredBy;
  triggeredByUser?: string | null;
}

export interface ExecuteResult {
  runId: string;
  status: "passed" | "failed" | "errored" | "cost_capped";
  totalInputs: number;
  passedCount: number;
  failedCount: number;
  erroredCount: number;
  totalCostCents: number;
}

export interface RunExecutor {
  execute(options: ExecuteOptions): Promise<ExecuteResult>;
}
