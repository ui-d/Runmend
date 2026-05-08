import Ajv from "ajv";
import type { Json } from "@/lib/database.types";

const ajv = new Ajv({ allErrors: true, strict: false });

export interface JsonSchemaConfig {
  schema: Record<string, Json>;
}

export interface AssertionEvaluation {
  passed: boolean;
  message: string | null;
}

export function evaluateJsonSchema(
  config: JsonSchemaConfig,
  output: Json | null,
): AssertionEvaluation {
  if (output === null) {
    return { passed: false, message: "Output is null; cannot validate schema" };
  }
  try {
    const validate = ajv.compile(config.schema);
    const ok = validate(output);
    if (ok) return { passed: true, message: null };
    const errors = validate.errors ?? [];
    const summary =
      errors.length > 0
        ? errors
            .slice(0, 3)
            .map((e) => `${e.instancePath || "<root>"}: ${e.message ?? "invalid"}`)
            .join("; ")
        : "Schema validation failed";
    return { passed: false, message: summary };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Schema compilation failed";
    return { passed: false, message: msg };
  }
}
