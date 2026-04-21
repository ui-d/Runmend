/**
 * Helpers for constructing NextRequest objects in API route tests.
 */

import { NextRequest } from "next/server";

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  searchParams?: Record<string, string>;
  url?: string;
}

export function makeRequest(
  path: string,
  options: RequestOptions = {},
): NextRequest {
  const base = options.url ?? "http://localhost:3000";
  const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
  if (options.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      url.searchParams.set(k, v);
    }
  }

  const headers = new Headers(options.headers ?? {});
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };
  if (hasBody) {
    init.body =
      typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);
  }

  return new NextRequest(url, init);
}

export async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
