import { describe, it, expect } from "vitest";
import { DETECTORS, getDetector, isIssueType } from "@/lib/detectors";

describe("DETECTORS", () => {
  it("exposes one entry per known issue type", () => {
    const types = DETECTORS.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toContain("silent_failure");
    expect(types).toContain("high_error_rate");
    expect(types).toContain("error_spike");
    expect(types).toContain("consecutive_failures");
    expect(types).toContain("zombie_automation");
    expect(types).toContain("credential_expiration");
  });

  it("every detector has required copy fields", () => {
    for (const d of DETECTORS) {
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.shortLabel.length).toBeGreaterThan(0);
      expect(d.description.length).toBeGreaterThan(0);
    }
  });
});

describe("getDetector", () => {
  it("returns the entry for a known type", () => {
    expect(getDetector("silent_failure").shortLabel).toBe("Silent");
  });

  it("throws on unknown type", () => {
    expect(() => getDetector("not_a_type" as never)).toThrow(/Unknown detector/);
  });
});

describe("isIssueType", () => {
  it("narrows known string values", () => {
    expect(isIssueType("silent_failure")).toBe(true);
    expect(isIssueType("credential_expiration")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isIssueType("foo")).toBe(false);
    expect(isIssueType(null)).toBe(false);
    expect(isIssueType(undefined)).toBe(false);
    expect(isIssueType(42)).toBe(false);
    expect(isIssueType({})).toBe(false);
  });
});
