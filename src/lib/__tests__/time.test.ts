import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRelative } from "@/lib/time";

describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'unknown' for unparseable input", () => {
    expect(formatRelative("not-a-date")).toBe("unknown");
  });

  it("accepts Date objects", () => {
    const d = new Date(Date.now() - 5_000);
    expect(formatRelative(d)).toBe("5s ago");
  });

  it("renders seconds", () => {
    expect(formatRelative(new Date(Date.now() - 3_000).toISOString())).toBe("3s ago");
  });

  it("renders minutes", () => {
    expect(formatRelative(new Date(Date.now() - 3 * 60_000).toISOString())).toBe("3m ago");
  });

  it("renders hours", () => {
    expect(formatRelative(new Date(Date.now() - 5 * 3_600_000).toISOString())).toBe("5h ago");
  });

  it("renders days", () => {
    expect(formatRelative(new Date(Date.now() - 3 * 86_400_000).toISOString())).toBe("3d ago");
  });

  it("renders weeks between 2 and 7", () => {
    expect(formatRelative(new Date(Date.now() - 21 * 86_400_000).toISOString())).toBe("3w ago");
  });

  it("renders months at 8+ weeks", () => {
    expect(formatRelative(new Date(Date.now() - 120 * 86_400_000).toISOString())).toBe("4mo ago");
  });

  it("renders future times with 'in' prefix", () => {
    expect(formatRelative(new Date(Date.now() + 5_000).toISOString())).toBe("in 5s");
    expect(formatRelative(new Date(Date.now() + 3 * 86_400_000).toISOString())).toBe("in 3d");
  });
});
