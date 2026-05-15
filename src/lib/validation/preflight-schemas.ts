import { z } from "zod";
import { MAX_INPUTS_PER_RUN } from "@/lib/preflight/limits";

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const cronSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^\S+\s\S+\s\S+\s\S+\s\S+$/, "Cron expression must have exactly 5 fields");

const assertionConfigSchema = z.record(z.string(), jsonValueSchema);

/**
 * Per-type assertion config schemas (PR #2, types 5–7). These validate the
 * `config` jsonb for the wired assertion types. They are the single source
 * of truth for config shape — the assertion evaluators re-validate with
 * these to stay safe against malformed DB rows.
 */
export const latencyUnderMsConfigSchema = z.object({
  max_ms: z
    .number()
    .int("max_ms must be an integer")
    .positive("max_ms must be positive")
    .max(600_000, "max_ms must be 600000 or fewer"),
});
export type LatencyUnderMsConfigInput = z.infer<typeof latencyUnderMsConfigSchema>;

export const costUnderCentsConfigSchema = z.object({
  max_cents: z
    .number()
    .int("max_cents must be an integer")
    .positive("max_cents must be positive")
    .max(100_000, "max_cents must be 100000 or fewer"),
  scope: z.enum(["total", "llm_only"]).default("total"),
});
export type CostUnderCentsConfigInput = z.infer<typeof costUnderCentsConfigSchema>;

export const assertionInputSchema = z.object({
  assertion_type: z.enum([
    "json_schema_valid",
    "field_present",
    "field_matches",
    "field_in_set",
    "llm_judge",
    "latency_under_ms",
    "cost_under_cents",
  ]),
  config: assertionConfigSchema,
  severity: z.enum(["fail", "warn"]).optional(),
});

export const inputDraftSchema = z.object({
  input_data: jsonValueSchema,
  label: z.string().max(200).nullish(),
  source: z.enum(["manual", "production_trace", "imported_csv"]).optional(),
  pii_redacted_at: z.string().datetime().nullish(),
});

export const scenarioCreateSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  connectionId: z.string().uuid("Invalid connection ID"),
  automationProfileId: z.string().uuid().nullish(),
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  description: z.string().max(500).nullish(),
  workflowExternalId: z
    .string()
    .min(1, "Workflow ID is required")
    .max(200, "Workflow ID must be 200 characters or fewer"),
  workflowName: z.string().max(200).nullish(),
  scheduleCron: cronSchema.nullish(),
  costCapCents: z.number().int().min(1).max(100_000).optional(),
  inputs: z
    .array(inputDraftSchema)
    .min(1, "At least one input is required")
    .max(MAX_INPUTS_PER_RUN, `Cannot exceed ${MAX_INPUTS_PER_RUN} inputs in v1`),
  assertions: z.array(assertionInputSchema).min(1, "At least one assertion is required"),
});

export type ScenarioCreateInput = z.infer<typeof scenarioCreateSchema>;

export const scenarioUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(500).nullable(),
    workflowName: z.string().max(200).nullable(),
    scheduleCron: cronSchema.nullable(),
    costCapCents: z.number().int().min(1).max(100_000),
    enabled: z.boolean(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "At least one field must be provided",
  });

export type ScenarioUpdateInput = z.infer<typeof scenarioUpdateSchema>;

export const runTriggerSchema = z
  .object({
    triggeredBy: z.enum(["manual", "schedule", "api"]).default("manual"),
  })
  .partial()
  .optional();

export type RunTriggerInput = z.infer<typeof runTriggerSchema>;
