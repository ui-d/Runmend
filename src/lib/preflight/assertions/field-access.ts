import type { Json } from "@/lib/database.types";

/**
 * Resolve a dotted path against a JSON value. Supports nested objects and
 * numeric array indexes (e.g. "items.0.name"). Returns the sentinel
 * `MISSING` if any segment is absent so callers can distinguish "field is
 * literally null" from "field doesn't exist."
 */
export const MISSING: unique symbol = Symbol("MISSING");

export function readPath(
  root: Json | null,
  path: string,
): Json | typeof MISSING {
  if (path.length === 0) return root;
  if (root === null || typeof root !== "object") return MISSING;

  const segments = path.split(".");
  let cursor: Json | undefined = root;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== "object") return MISSING;
    if (Array.isArray(cursor)) {
      const idx = Number(segment);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cursor.length) return MISSING;
      cursor = cursor[idx];
    } else {
      const obj = cursor as { [key: string]: Json | undefined };
      if (!Object.prototype.hasOwnProperty.call(obj, segment)) return MISSING;
      cursor = obj[segment];
    }
  }
  return cursor === undefined ? MISSING : cursor;
}
