import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { makeRequest, readJson } from "@/test/next-mocks";
import { makeMember, makeSubscription, makeUser, makeWorkspace, TEST_UUID } from "@/test/factories";

let mock: SupabaseMock;
let admin: SupabaseMock;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mock.client,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => admin.client,
}));

const sessionCreate = vi.fn();
const portalCreate = vi.fn();
const invoicesList = vi.fn();
const customersCreate = vi.fn();
const customersListTaxIds = vi.fn();
const subsRetrieve = vi.fn();
const constructEvent = vi.fn();
const refundsCreate = vi.fn();

vi.mock("@/lib/stripe", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");
  return {
    ...actual,
    stripe: {
      checkout: { sessions: { create: sessionCreate } },
      billingPortal: { sessions: { create: portalCreate } },
      invoices: { list: invoicesList },
      customers: { create: customersCreate, listTaxIds: customersListTaxIds },
      subscriptions: { retrieve: subsRetrieve },
      webhooks: { constructEvent },
      refunds: { create: refundsCreate },
    },
    getOrCreateStripeCustomer: vi.fn(async (_ws: string, _email: string, existing?: string) =>
      existing && !existing.startsWith("pending_") ? existing : "cus_new",
    ),
    STRIPE_PRICE_IDS: { starter: "price_starter", pro: "price_pro" },
    STRIPE_PRICE_LTD: "price_ltd",
  };
});

beforeEach(() => {
  mock = createSupabaseMock();
  admin = createSupabaseMock();
  process.env.STRIPE_PRICE_STARTER = "price_starter";
  process.env.STRIPE_PRICE_PRO = "price_pro";
  sessionCreate.mockReset().mockResolvedValue({ id: "cs_123", url: "https://stripe/s/123" });
  portalCreate.mockReset().mockResolvedValue({ url: "https://stripe/portal/123" });
  invoicesList.mockReset().mockResolvedValue({ data: [] });
  customersCreate.mockReset().mockResolvedValue({ id: "cus_x" });
  customersListTaxIds.mockReset().mockResolvedValue({ data: [] });
  subsRetrieve.mockReset();
  constructEvent.mockReset();
  refundsCreate.mockReset().mockResolvedValue({ id: "re_123" });
});

describe("POST /api/billing/checkout", () => {
  it("401 unauthenticated", async () => {
    const { POST } = await import("../checkout/route");
    const res = await POST(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { workspaceId: TEST_UUID, plan: "starter" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400 on invalid body", async () => {
    mock.setUser(makeUser());
    const { POST } = await import("../checkout/route");
    const res = await POST(
      makeRequest("/api/billing/checkout", { method: "POST", body: {} }),
    );
    expect(res.status).toBe(400);
  });

  it("403 not a member", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", []);
    const { POST } = await import("../checkout/route");
    const res = await POST(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { workspaceId: TEST_UUID, plan: "starter" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("upgrades a pending_ customer id", async () => {
    mock.setUser(makeUser({ id: "u-1", email: "u@x.com" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "pending_x" }),
    ]);
    admin.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "pending_x" }),
    ]);
    const { POST } = await import("../checkout/route");
    const res = await POST(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { workspaceId: TEST_UUID, plan: "pro" },
        headers: { origin: "http://localhost:3000" },
      }),
    );
    expect(res.status).toBe(200);
    const update = admin.getCalls("subscriptions").find((c) => c.op === "update");
    expect(update).toBeDefined();
  });

  it("returns 500 when Stripe throws", async () => {
    mock.setUser(makeUser({ id: "u-1", email: "u@x.com" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", []);
    sessionCreate.mockRejectedValueOnce(new Error("Stripe down"));
    const { POST } = await import("../checkout/route");
    const res = await POST(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { workspaceId: TEST_UUID, plan: "starter" },
        headers: { origin: "http://localhost:3000" },
      }),
    );
    expect(res.status).toBe(500);
  });

  it("creates a stripe session and returns URL", async () => {
    mock.setUser(makeUser({ id: "u-1", email: "u@x.com" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", []);
    const { POST } = await import("../checkout/route");
    const res = await POST(
      makeRequest("/api/billing/checkout", {
        method: "POST",
        body: { workspaceId: TEST_UUID, plan: "starter" },
        headers: { origin: "http://localhost:3000" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { url: string };
    expect(body.url).toBe("https://stripe/s/123");
  });
});

describe("POST /api/billing/portal", () => {
  it("returns 400 when no billing account exists", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "pending_x" }),
    ]);
    const { POST } = await import("../portal/route");
    const res = await POST(
      makeRequest("/api/billing/portal", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a portal session", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "cus_abc" }),
    ]);
    const { POST } = await import("../portal/route");
    const res = await POST(
      makeRequest("/api/billing/portal", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
        headers: { origin: "http://localhost:3000" },
      }),
    );
    expect(res.status).toBe(200);
    expect(portalCreate).toHaveBeenCalled();
  });
});

describe("GET /api/billing/invoices", () => {
  it("returns empty when no customer", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", []);
    const { GET } = await import("../invoices/route");
    const res = await GET(
      makeRequest("/api/billing/invoices", {
        searchParams: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await readJson(res)) as { invoices: unknown[] };
    expect(body.invoices).toEqual([]);
  });

  it("returns 400 when workspaceId missing", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    const { GET } = await import("../invoices/route");
    const res = await GET(makeRequest("/api/billing/invoices"));
    expect(res.status).toBe(400);
  });

  it("maps stripe invoices to summaries", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "cus_abc" }),
    ]);
    invoicesList.mockResolvedValueOnce({
      data: [
        {
          id: "in_1",
          number: "0001",
          amount_paid: 1900,
          currency: "usd",
          status: "paid",
          hosted_invoice_url: "https://stripe/ih",
          invoice_pdf: "https://stripe/pdf",
          created: 1700000000,
        },
      ],
    });
    const { GET } = await import("../invoices/route");
    const res = await GET(
      makeRequest("/api/billing/invoices", {
        searchParams: { workspaceId: TEST_UUID },
      }),
    );
    const body = (await readJson(res)) as { invoices: Array<{ amountPaid: number }> };
    expect(body.invoices).toHaveLength(1);
    expect(body.invoices[0]!.amountPaid).toBe(1900);
  });
});

describe("POST /api/billing/claim-ltd", () => {
  it("returns 409 if already LTD", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", [makeSubscription({ is_ltd: true })]);
    const { POST } = await import("../claim-ltd/route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 410 when sold out", async () => {
    mock.setUser(makeUser({ id: "u-1" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", []);
    mock.setTable("ltd_allocations", [
      { id: 1, total_seats: 100, seats_sold: 100, updated_at: new Date().toISOString() },
    ]);
    const { POST } = await import("../claim-ltd/route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
      }),
    );
    expect(res.status).toBe(410);
  });

  it("creates a one-time checkout with ltd metadata", async () => {
    mock.setUser(makeUser({ id: "u-1", email: "u@x.com" }));
    mock.setTable("workspace_members", [makeMember({ user_id: "u-1" })]);
    mock.setTable("subscriptions", []);
    mock.setTable("ltd_allocations", [
      { id: 1, total_seats: 100, seats_sold: 5, updated_at: new Date().toISOString() },
    ]);
    mock.setTable("workspaces", [makeWorkspace({ id: "ws-test", slug: "acme" })]);
    const { POST } = await import("../claim-ltd/route");
    const res = await POST(
      makeRequest("/api/billing/claim-ltd", {
        method: "POST",
        body: { workspaceId: TEST_UUID },
        headers: { origin: "http://localhost:3000" },
      }),
    );
    expect(res.status).toBe(200);
    expect(sessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        metadata: expect.objectContaining({ ltd: "true" }),
      }),
    );
  });
});

describe("POST /api/billing/webhook", () => {
  it("returns 400 when signature is missing", async () => {
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", { method: "POST", body: "{}" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    constructEvent.mockImplementationOnce(() => {
      throw new Error("bad signature");
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("handles checkout.session.completed for subscription", async () => {
    subsRetrieve.mockResolvedValueOnce({
      items: {
        data: [
          {
            price: { id: "price_starter" },
            current_period_start: 1_700_000_000,
            current_period_end: 1_710_000_000,
          },
        ],
      },
    });
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          metadata: { workspace_id: "ws-1" },
          customer: "cus_1",
          subscription: "sub_1",
          customer_details: { email: "e@x.com" },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
    expect(admin.getCalls("subscriptions").some((c) => c.op === "upsert")).toBe(true);
  });

  it("handles customer.subscription.deleted", async () => {
    constructEvent.mockReturnValueOnce({
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          items: { data: [{ price: { id: "price_starter" } }] },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
    const update = admin.getCalls("subscriptions").find((c) => c.op === "update");
    expect(update!.payload).toMatchObject({ plan: "free", status: "canceled" });
  });

  it("handles invoice.payment_failed by marking past_due", async () => {
    constructEvent.mockReturnValueOnce({
      type: "invoice.payment_failed",
      data: { object: { customer: "cus_1" } },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
    const update = admin.getCalls("subscriptions").find((c) => c.op === "update");
    expect(update!.payload).toMatchObject({ status: "past_due" });
  });

  it("handles ltd checkout claim via RPC", async () => {
    admin.setRpc("claim_ltd_seat", 5);
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          metadata: { workspace_id: "ws-1", ltd: "true" },
          customer: "cus_1",
          payment_intent: "pi_1",
          customer_details: { email: "e@x.com", tax_ids: [] },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    const body = (await readJson(res)) as { ltd: string };
    expect(body.ltd).toBe("claimed");
  });

  it("handles ltd oversold with refund", async () => {
    admin.setRpc("claim_ltd_seat", null);
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          metadata: { workspace_id: "ws-1", ltd: "true" },
          customer: "cus_1",
          payment_intent: "pi_1",
          customer_details: { email: "e@x.com" },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    const body = (await readJson(res)) as { ltd: string };
    expect(body.ltd).toBe("oversold");
    expect(refundsCreate).toHaveBeenCalled();
  });

  it("handles customer.subscription.updated for active status", async () => {
    constructEvent.mockReturnValueOnce({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          customer: "cus_1",
          items: {
            data: [
              {
                price: { id: "price_starter" },
                current_period_start: 1_700_000_000,
                current_period_end: 1_710_000_000,
              },
            ],
          },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
    const update = admin.getCalls("subscriptions").find((c) => c.op === "update");
    expect(update!.payload).toMatchObject({ plan: "starter", status: "active" });
  });

  it("handles customer.subscription.updated when past_due", async () => {
    constructEvent.mockReturnValueOnce({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "past_due",
          customer: "cus_1",
          items: { data: [{ price: { id: "price_pro" } }] },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
    const update = admin.getCalls("subscriptions").find((c) => c.op === "update");
    expect(update!.payload).toMatchObject({ status: "past_due" });
  });

  it("handles customer.updated mirroring tax id and address", async () => {
    customersListTaxIds.mockResolvedValueOnce({
      data: [{ value: "GB123", country: "GB" }],
    });
    constructEvent.mockReturnValueOnce({
      type: "customer.updated",
      data: {
        object: {
          id: "cus_1",
          email: "e@x.com",
          address: { country: "GB" },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
    const update = admin.getCalls("subscriptions").find((c) => c.op === "update");
    expect(update!.payload).toMatchObject({ tax_id: "GB123" });
  });

  it("swallows customer.updated tax id lookup errors", async () => {
    customersListTaxIds.mockRejectedValueOnce(new Error("stripe down"));
    constructEvent.mockReturnValueOnce({
      type: "customer.updated",
      data: {
        object: {
          id: "cus_1",
          email: "e@x.com",
          address: null,
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("handles checkout.session.completed with object customer (not string)", async () => {
    subsRetrieve.mockResolvedValueOnce({
      items: { data: [{ price: { id: "price_pro" } }] },
    });
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          metadata: { workspace_id: "ws-1" },
          customer: { id: "cus_1" },
          subscription: { id: "sub_1" },
          customer_details: { email: "e@x.com", address: { country: "US" } },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("mirrors tax IDs on ltd claim when present", async () => {
    admin.setRpc("claim_ltd_seat", 5);
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          metadata: { workspace_id: "ws-1", ltd: "true" },
          customer: "cus_1",
          payment_intent: { id: "pi_1" },
          customer_details: {
            email: "e@x.com",
            address: { country: "GB" },
            tax_ids: [{ value: "GB123" }],
          },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    const body = (await readJson(res)) as { ltd: string };
    expect(body.ltd).toBe("claimed");
  });

  it("swallows ltd oversold refund failure", async () => {
    admin.setRpc("claim_ltd_seat", null);
    refundsCreate.mockRejectedValueOnce(new Error("already refunded"));
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "payment",
          metadata: { workspace_id: "ws-1", ltd: "true" },
          customer: "cus_1",
          payment_intent: null,
          customer_details: { email: "e@x.com" },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    const body = (await readJson(res)) as { ltd: string };
    expect(body.ltd).toBe("oversold");
  });

  it("handles invoice.payment_failed with object customer", async () => {
    constructEvent.mockReturnValueOnce({
      type: "invoice.payment_failed",
      data: { object: { customer: { id: "cus_1" } } },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("skips subscription upsert when metadata missing workspace_id", async () => {
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          metadata: {},
          customer: "cus_1",
          subscription: "sub_1",
          customer_details: { email: "e@x.com" },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
    expect(admin.getCalls("subscriptions").some((c) => c.op === "upsert")).toBe(false);
  });

  it("skips customer.subscription.updated when customer missing", async () => {
    constructEvent.mockReturnValueOnce({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          customer: null,
          items: { data: [{ price: { id: "price_starter" } }] },
        },
      },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
    expect(admin.getCalls("subscriptions").some((c) => c.op === "update")).toBe(false);
  });

  it("returns 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
    const prev = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(500);
    process.env.STRIPE_WEBHOOK_SECRET = prev ?? "whsec_test_123";
  });

  it("returns received:true for unhandled event types", async () => {
    constructEvent.mockReturnValueOnce({
      type: "some.random.event",
      data: { object: {} },
    });
    const { POST } = await import("../webhook/route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "sig" },
      }),
    );
    expect(res.status).toBe(200);
  });
});
