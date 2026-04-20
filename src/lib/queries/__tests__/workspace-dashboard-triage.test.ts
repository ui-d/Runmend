import { describe, it, expect } from "vitest";
import { deriveFreshness } from "@/lib/queries/workspace-dashboard";

describe("deriveFreshness", () => {
  const now = new Date("2026-04-20T12:00:00Z");
  const minutesAgo = (m: number) =>
    new Date(now.getTime() - m * 60 * 1000).toISOString();
  const hoursAgo = (h: number) => minutesAgo(h * 60);
  const daysAgo = (d: number) => hoursAgo(d * 24);

  it("returns 'never' when lastSyncedAt is null", () => {
    expect(deriveFreshness(null, now)).toBe("never");
  });

  it("returns 'never' when timestamp is unparseable", () => {
    expect(deriveFreshness("not-a-date", now)).toBe("never");
  });

  it("returns 'fresh' when synced under 1 hour ago", () => {
    expect(deriveFreshness(minutesAgo(15), now)).toBe("fresh");
    expect(deriveFreshness(minutesAgo(59), now)).toBe("fresh");
  });

  it("returns 'recent' between 1 hour and 7 days", () => {
    expect(deriveFreshness(hoursAgo(2), now)).toBe("recent");
    expect(deriveFreshness(daysAgo(3), now)).toBe("recent");
    expect(deriveFreshness(daysAgo(6), now)).toBe("recent");
  });

  it("returns 'stale' when older than 7 days", () => {
    expect(deriveFreshness(daysAgo(8), now)).toBe("stale");
    expect(deriveFreshness(daysAgo(30), now)).toBe("stale");
  });
});
