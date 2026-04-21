import { describe, it, expect } from "vitest";
import { sanitizeRedirectPath } from "@/lib/security/redirect";

describe("sanitizeRedirectPath", () => {
  it.each([
    ["/app", "/app"],
    ["/app/ws-a/profiles", "/app/ws-a/profiles"],
    ["/dashboard/abc", "/dashboard/abc"],
  ])("allows safe prefix %s", (input, expected) => {
    expect(sanitizeRedirectPath(input)).toBe(expected);
  });

  it.each([
    null,
    "",
    "//evil.com",
    "https://evil.com",
    "http://evil.com/app",
    "/app%2f..",
    "/app%2F..",
    "ftp://evil",
    "javascript:alert(1)",
    "/other/path",
    "/login",
    "//app/legit-looking",
    "app/no-leading-slash",
  ])("falls back to /app for %s", (input) => {
    expect(sanitizeRedirectPath(input as string | null)).toBe("/app");
  });
});
