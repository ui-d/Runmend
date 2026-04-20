import { describe, it, expect } from "vitest";
import { resolveEffectivePlan, PLAN_LIMITS } from "@/lib/stripe";

describe("resolveEffectivePlan", () => {
  it("returns 'free' for null subscription", () => {
    expect(resolveEffectivePlan(null)).toBe("free");
  });

  it("returns 'free' for undefined subscription", () => {
    expect(resolveEffectivePlan(undefined)).toBe("free");
  });

  it("returns the raw plan for a non-LTD subscription", () => {
    expect(resolveEffectivePlan({ plan: "starter", is_ltd: false })).toBe(
      "starter"
    );
    expect(resolveEffectivePlan({ plan: "pro", is_ltd: false })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "free", is_ltd: false })).toBe("free");
  });

  it("overrides to 'pro' when is_ltd is true regardless of stored plan", () => {
    expect(resolveEffectivePlan({ plan: "free", is_ltd: true })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "starter", is_ltd: true })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "pro", is_ltd: true })).toBe("pro");
  });

  it("falls back to 'free' on an unknown plan value", () => {
    expect(
      resolveEffectivePlan({
        plan: "legacy_unknown",
        is_ltd: false,
      })
    ).toBe("free");
  });
});

describe("PLAN_LIMITS", () => {
  it("free tier grants 1 sync/day (not 5)", () => {
    // Regression guard: an earlier bug let free users run 5 syncs/day.
    expect(PLAN_LIMITS.free.syncsPerDay).toBe(1);
  });

  it("pro is unlimited for diagnostics", () => {
    expect(PLAN_LIMITS.pro.diagnosticsPerMonth).toBe(-1);
  });
});
