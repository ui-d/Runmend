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
  stripeMock.invoicesList.mockReset();
});

describe("GET /api/billing/invoices", () => {
  it("400 when workspaceId missing", async () => {
    sbMock.setUser(makeUser());
    const { GET } = await import("../route");
    const res = await GET(makeRequest("/api/billing/invoices"));
    expect(res.status).toBe(400);
  });

  it("400 when workspaceId is not a UUID", async () => {
    sbMock.setUser(makeUser());
    const { GET } = await import("../route");
    const res = await GET(
      makeRequest("/api/billing/invoices", {
        searchParams: { workspaceId: "not-uuid" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns empty list when customer id is pending", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "pending_x" }),
    ]);
    const { GET } = await import("../route");
    const res = await GET(
      makeRequest("/api/billing/invoices", {
        searchParams: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { invoices: unknown[] };
    expect(body.invoices).toEqual([]);
  });

  it("returns mapped invoice list on success", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "cus_1" }),
    ]);
    stripeMock.invoicesList.mockResolvedValue({
      data: [
        {
          id: "in_1",
          number: "INV-1",
          amount_paid: 900,
          currency: "usd",
          status: "paid",
          hosted_invoice_url: "https://pay",
          invoice_pdf: "https://pdf",
          created: 1_700_000_000,
        },
      ],
    });
    const { GET } = await import("../route");
    const res = await GET(
      makeRequest("/api/billing/invoices", {
        searchParams: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { invoices: Array<{ id: string; amountPaid: number }> };
    expect(body.invoices).toHaveLength(1);
    expect(body.invoices[0].amountPaid).toBe(900);
  });

  it("500 when stripe throws", async () => {
    sbMock.setUser(makeUser());
    sbMock.setTable("workspace_members", [makeMember()]);
    sbMock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "cus_1" }),
    ]);
    stripeMock.invoicesList.mockRejectedValue(new Error("stripe down"));
    const { GET } = await import("../route");
    const res = await GET(
      makeRequest("/api/billing/invoices", {
        searchParams: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(500);
  });
});
