import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { createStripeMock } from "@/test/stripe-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import {
  makeMember,
  makeSubscription,
  makeUser,
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
  return { ...actual, stripe: stripeMock.client };
});

beforeEach(() => {
  sbMock = createSupabaseMock();
  stripeMock.billingPortalSessionsCreate.mockReset();
});

describe("POST /api/billing/portal", () => {
  it("400 when no billing account (pending customer id)", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "pending_x" }),
    ]);
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/portal", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns portal url on success", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "cus_real" }),
    ]);
    stripeMock.billingPortalSessionsCreate.mockResolvedValue({
      url: "https://billing.test",
    });
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/portal", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { url: string };
    expect(body.url).toBe("https://billing.test");
  });

  it("500 when stripe throws", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "cus_real" }),
    ]);
    stripeMock.billingPortalSessionsCreate.mockRejectedValue(
      new Error("stripe down"),
    );
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/portal", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(500);
  });
});
