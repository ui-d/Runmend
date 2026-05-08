import type { Database, Json } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];

export type ScenarioRow = Tables["preflight_scenarios"]["Row"];
export type ScenarioInsert = Tables["preflight_scenarios"]["Insert"];
export type ScenarioUpdate = Tables["preflight_scenarios"]["Update"];
export type AssertionRow = Tables["preflight_assertions"]["Row"];
export type InputRow = Tables["preflight_inputs"]["Row"];
export type RunRow = Tables["preflight_runs"]["Row"];
export type RunResultRow = Tables["preflight_run_results"]["Row"];

export const ASSERTION_TYPES = [
  "json_schema_valid",
  "field_present",
  "field_matches",
  "field_in_set",
  "llm_judge",
  "latency_under_ms",
  "cost_under_cents",
] as const;

export type AssertionType = (typeof ASSERTION_TYPES)[number];

export const TRIGGERED_BY_VALUES = ["manual", "schedule", "api", "mcp"] as const;
export type TriggeredBy = (typeof TRIGGERED_BY_VALUES)[number];

export const RUN_STATUSES = [
  "running",
  "passed",
  "failed",
  "errored",
  "cost_capped",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export type AssertionConfig =
  | { type: "json_schema_valid"; schema: Record<string, Json> }
  | { type: "field_present"; field: string }
  | { type: "field_matches"; field: string; pattern?: string; equals?: Json }
  | { type: "field_in_set"; field: string; values: ReadonlyArray<Json> }
  | { type: "llm_judge"; rubric: string; model?: string }
  | { type: "latency_under_ms"; threshold_ms: number }
  | { type: "cost_under_cents"; threshold_cents: number };

export interface SingleAssertionOutcome {
  assertion_id: string;
  assertion_type: AssertionType;
  passed: boolean;
  severity: "fail" | "warn";
  message: string | null;
}

export interface InputExecutionOutcome {
  output: Json | null;
  passed: boolean;
  assertion_results: SingleAssertionOutcome[];
  latency_ms: number | null;
  cost_cents: number | null;
  error_message: string | null;
}

export interface ExecutionContext {
  output: Json | null;
  latency_ms: number | null;
  cost_cents: number | null;
}
