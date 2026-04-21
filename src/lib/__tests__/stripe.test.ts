import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkPlanLimit,
  PLAN_LIMITS,
  PLAN_LABELS,
  PLAN_PRICES,
  getStripe,
  getOrCreateStripeCustomer,
  stripe,
} from "@/lib/stripe";

describe("checkPlanLimit", () => {
  it("allows values below the limit", () => {
    expect(checkPlanLimit("free", "profiles", 0)).toEqual({ allowed: true, limit: 1 });
  });

  it("rejects values at or above the limit", () => {
    expect(checkPlanLimit("free", "profiles", 1)).toEqual({ allowed: false, limit: 1 });
  });

  it("treats -1 as unlimited", () => {
    expect(checkPlanLimit("pro", "diagnosticsPerMonth", 9_999)).toEqual({
      allowed: true,
      limit: -1,
    });
  });

  it("falls back to free limits for unknown plans", () => {
    expect(checkPlanLimit("bogus", "profiles", 0)).toEqual({
      allowed: true,
      limit: PLAN_LIMITS.free.profiles,
    });
  });
});

describe("PLAN metadata", () => {
  it("labels and prices agree on known plans", () => {
    expect(PLAN_LABELS.starter).toBe("Starter");
    expect(PLAN_PRICES.starter!.monthly).toBeGreaterThan(0);
    expect(PLAN_PRICES.pro!.monthly).toBeGreaterThan(PLAN_PRICES.starter!.monthly);
  });
});

describe("getStripe", () => {
  it("memoizes the client instance", () => {
    const a = getStripe();
    const b = getStripe();
    expect(a).toBe(b);
  });
});

describe("getOrCreateStripeCustomer", () => {
  const createMock = vi.fn();
  beforeEach(() => {
    createMock.mockReset();
    vi.spyOn(stripe.customers, "create").mockImplementation(
      createMock as never,
    );
  });

  it("returns the existing customer id when already set", async () => {
    const id = await getOrCreateStripeCustomer("ws", "a@b.c", "cus_existing");
    expect(id).toBe("cus_existing");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a new customer when no id", async () => {
    createMock.mockResolvedValue({ id: "cus_new" });
    const id = await getOrCreateStripeCustomer("ws-1", "a@b.c");
    expect(id).toBe("cus_new");
    expect(createMock).toHaveBeenCalledWith({
      email: "a@b.c",
      metadata: { workspace_id: "ws-1" },
    });
  });

  it("creates a new customer when id has the 'pending_' sentinel", async () => {
    createMock.mockResolvedValue({ id: "cus_real" });
    const id = await getOrCreateStripeCustomer(
      "ws-1",
      "a@b.c",
      "pending_placeholder",
    );
    expect(id).toBe("cus_real");
    expect(createMock).toHaveBeenCalled();
  });
});
