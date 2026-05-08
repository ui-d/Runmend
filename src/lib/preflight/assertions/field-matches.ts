import type { Json } from "@/lib/database.types";
import { readPath, MISSING } from "./field-access";
import type { AssertionEvaluation } from "./json-schema";

export interface FieldMatchesConfig {
  field: string;
  pattern?: string;
  equals?: Json;
}

function jsonEquals(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function evaluateFieldMatches(
  config: FieldMatchesConfig,
  output: Json | null,
): AssertionEvaluation {
  if (!config.field) {
    return { passed: false, message: "Assertion misconfigured: field is empty" };
  }
  if (config.pattern === undefined && config.equals === undefined) {
    return {
      passed: false,
      message: "Assertion misconfigured: must provide pattern or equals",
    };
  }
  const value = readPath(output, config.field);
  if (value === MISSING) {
    return { passed: false, message: `Field "${config.field}" is missing` };
  }

  if (config.pattern !== undefined) {
    if (typeof value !== "string") {
      return {
        passed: false,
        message: `Field "${config.field}" is not a string (cannot regex-match)`,
      };
    }
    let regex: RegExp;
    try {
      regex = new RegExp(config.pattern);
    } catch {
      return { passed: false, message: `Invalid regex pattern: ${config.pattern}` };
    }
    if (!regex.test(value)) {
      return {
        passed: false,
        message: `Field "${config.field}" does not match /${config.pattern}/`,
      };
    }
  }

  if (config.equals !== undefined) {
    if (!jsonEquals(value as Json, config.equals)) {
      return {
        passed: false,
        message: `Field "${config.field}" does not equal expected value`,
      };
    }
  }

  return { passed: true, message: null };
}
