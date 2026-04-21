import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { createStripeMock } from "@/test/stripe-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import {
  makeMember,
  makeSubscription,
  makeUser,
  makeWorkspace,
  TEST_UUID,
} from "@/test/factories";

const stripeMock = createStripeMock();
let sbMock: SupabaseMock = createSupabaseMock();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => sbMock.client,
}));
vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe")>(
    "@/lib/stripe",
  );
  return {
    ...actual,
    stripe: stripeMock.client,
    STRIPE_PRICE_LTD: "price_ltd",
  };
});

beforeEach(() => {
  sbMock = createSupabaseMock();
  stripeMock.checkoutSessionsCreate.mockReset();
  process.env.STRIPE_PRICE_LTD = "price_ltd";
});

describe("POST /api/billing/claim-ltd", () => {
  it("409 when workspace already has LTD", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", [makeSubscription({ is_ltd: true })]);
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(409);
  });

  it("410 when LTD is sold out", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", []);
    sbMock.setTable("ltd_allocations", [
      { id: 1, total_seats: 20, seats_sold: 20, updated_at: "now" },
    ]);
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(410);
  });

  it("returns checkout url on success", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", []);
    sbMock.setTable("ltd_allocations", [
      { id: 1, total_seats: 20, seats_sold: 3, updated_at: "now" },
    ]);
    sbMock.setTable("workspaces", [makeWorkspace({ slug: "myws" })]);
    stripeMock.checkoutSessionsCreate.mockResolvedValue({
      url: "https://ltd.checkout",
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { url: string };
    expect(body.url).toBe("https://ltd.checkout");
    const call = stripeMock.checkoutSessionsCreate.mock.calls[0][0] as {
      metadata: Record<string, string>;
    };
    expect(call.metadata.ltd).toBe("true");
  });
});
