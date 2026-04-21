/**
 * HTTP response builders for adapter tests. Centralizes the jsonResponse /
 * textResponse helpers that were previously inline in make.test.ts.
 */

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function textResponse(text: string, status: number): Response {
  return new Response(text, { status });
}

export function emptyResponse(status: number): Response {
  return new Response(null, { status });
}
