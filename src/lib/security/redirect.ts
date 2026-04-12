/**
 * Validates redirect paths after OAuth callback to prevent open redirect attacks.
 * Only allows relative paths starting with known safe prefixes.
 */

const SAFE_PREFIXES = ["/app", "/dashboard"];

export function sanitizeRedirectPath(path: string | null): string {
  const fallback = "/app";

  if (!path) return fallback;

  // Must start with exactly one forward slash (reject //, protocol-relative URLs)
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;

  // Reject anything that looks like it contains a protocol
  if (path.includes("://")) return fallback;

  // Reject encoded sequences that could bypass checks (%2f = /)
  if (path.includes("%2f") || path.includes("%2F")) return fallback;

  // Must match one of the safe prefixes
  const matchesSafePrefix = SAFE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (!matchesSafePrefix) return fallback;

  return path;
}
