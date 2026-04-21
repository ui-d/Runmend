import { describe, it, expect } from "vitest";
import {
  AVAILABLE_CONNECTORS,
  CONNECTED_PLATFORMS,
  COMING_SOON_CONNECTORS,
  LIVE_SLUGS,
  isLiveSlug,
  CONNECTION_SYNC_INTERVAL_MINUTES,
} from "@/lib/connections/catalog";

describe("catalog", () => {
  it("includes make and n8n in connected platforms", () => {
    const slugs = CONNECTED_PLATFORMS.map((c) => c.slug);
    expect(slugs).toContain("make");
    expect(slugs).toContain("n8n");
  });

  it("every connected platform is also listed as available", () => {
    for (const c of CONNECTED_PLATFORMS) {
      expect(AVAILABLE_CONNECTORS.some((a) => a.slug === c.slug)).toBe(true);
    }
  });

  it("coming-soon connectors have a description", () => {
    for (const c of COMING_SOON_CONNECTORS) {
      expect(c.description.length).toBeGreaterThan(0);
    }
  });

  it("LIVE_SLUGS contains only make and n8n", () => {
    expect([...LIVE_SLUGS].sort()).toEqual(["make", "n8n"]);
  });

  it("sync interval is positive", () => {
    expect(CONNECTION_SYNC_INTERVAL_MINUTES).toBeGreaterThan(0);
  });
});

describe("isLiveSlug", () => {
  it("narrows 'make' and 'n8n'", () => {
    expect(isLiveSlug("make")).toBe(true);
    expect(isLiveSlug("n8n")).toBe(true);
  });

  it("rejects other slugs", () => {
    for (const s of ["zapier", "workato", "", "unknown"]) {
      expect(isLiveSlug(s)).toBe(false);
    }
  });
});
