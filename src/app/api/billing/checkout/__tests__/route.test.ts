import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { createStripeMock } from "@/test/stripe-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import { makeMember, makeUser, TEST_UUID } from "@/test/factories";

const stripeMock = createStripeMock();
let sbMock: SupabaseMock = createSupabaseMock();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => sbMock.client,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => sbMock.client,
}));
vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe")>(
    "@/lib/stripe",
  );
  return {
    ...actual,
    stripe: stripeMock.client,
    STRIPE_PRICE_IDS: { starter: "price_starter", pro: "price_pro" },
    getOrCreateStripeCustomer: vi.fn(async () => "cus_new"),
  };
});

beforeEach(() => {
  sbMock = createSupabaseMock();
  stripeMock.checkoutSessionsCreate.mockReset();
});

describe("POST /api/billing/checkout", () => {
  it("401 unauthenticated", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { workspaceId: TEST_UUID, plan: "pro" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400 invalid body", async () => {
    sbMock.setUser(makeUser());
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/checkout", { method: "POST", body: {} }),
    );
    expect(res.status).toBe(400);
  });

  it("403 when not a workspace member", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", []);
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { workspaceId: TEST_UUID, plan: "pro" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns checkout url on success", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", []);
    stripeMock.checkoutSessionsCreate.mockResolvedValue({
      url: "https://stripe.test/session",
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { workspaceId: TEST_UUID, plan: "pro" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { url: string };
    expect(body.url).toBe("https://stripe.test/session");
    expect(stripeMock.checkoutSessionsCreate).toHaveBeenCalled();
  });

  it("500 when stripe throws", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", []);
    stripeMock.checkoutSessionsCreate.mockRejectedValue(new Error("stripe down"));
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { workspaceId: TEST_UUID, plan: "pro" },
      }),
    );
    expect(res.status).toBe(500);
  });
});
