import type { Json } from "@/lib/database.types";
import { readPath, MISSING } from "./field-access";
import type { AssertionEvaluation } from "./json-schema";

export interface FieldInSetConfig {
  field: string;
  values: ReadonlyArray<Json>;
}

export function evaluateFieldInSet(
  config: FieldInSetConfig,
  output: Json | null,
): AssertionEvaluation {
  if (!config.field) {
    return { passed: false, message: "Assertion misconfigured: field is empty" };
  }
  if (!Array.isArray(config.values) || config.values.length === 0) {
    return {
      passed: false,
      message: "Assertion misconfigured: values must be a non-empty array",
    };
  }
  const value = readPath(output, config.field);
  if (value === MISSING) {
    return { passed: false, message: `Field "${config.field}" is missing` };
  }

  const found = config.values.some((candidate) => {
    if (candidate === value) return true;
    if (candidate === null || value === null) return false;
    if (typeof candidate !== typeof value) return false;
    if (typeof candidate === "object")
      return JSON.stringify(candidate) === JSON.stringify(value);
    return false;
  });

  if (!found) {
    return {
      passed: false,
      message: `Field "${config.field}" not in allowed set (got ${JSON.stringify(value)})`,
    };
  }
  return { passed: true, message: null };
}
