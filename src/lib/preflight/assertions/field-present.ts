import type { Json } from "@/lib/database.types";
import { readPath, MISSING } from "./field-access";
import type { AssertionEvaluation } from "./json-schema";

export interface FieldPresentConfig {
  field: string;
}

export function evaluateFieldPresent(
  config: FieldPresentConfig,
  output: Json | null,
): AssertionEvaluation {
  if (!config.field || config.field.length === 0) {
    return { passed: false, message: "Assertion misconfigured: field is empty" };
  }
  const value = readPath(output, config.field);
  if (value === MISSING) {
    return { passed: false, message: `Field "${config.field}" is missing` };
  }
  if (value === null) {
    return { passed: false, message: `Field "${config.field}" is null` };
  }
  if (typeof value === "string" && value.length === 0) {
    return { passed: false, message: `Field "${config.field}" is empty string` };
  }
  return { passed: true, message: null };
}
