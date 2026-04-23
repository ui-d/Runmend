import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";
import { createStripeMock } from "@/test/stripe-mock";
import { makeRequest } from "@/test/next-mocks";
import { TEST_UUID } from "@/test/factories";

// Create these ONCE at module scope so the vi.mock factory can capture them
// by reference. Reset the inner vi.fn() mocks in beforeEach instead of
// reassigning these variables.
const stripeMock = createStripeMock();
let sbMock: SupabaseMock = createSupabaseMock();
const sendLtdRefundAlertMock = vi.fn();

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
  };
});

// Short-circuit exponential backoff in tests: run fn up to `attempts` times
// with no delay. Keeps the retry semantic intact without sleeping.
vi.mock("@/lib/platform-adapters/retry", () => ({
  withBackoff: async <T,>(
    fn: () => Promise<T>,
    opts: { attempts?: number } = {},
  ): Promise<T> => {
    const attempts = opts.attempts ?? 3;
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  },
}));

vi.mock("@/lib/email/alert", () => ({
  sendLtdRefundAlert: sendLtdRefundAlertMock,
}));

beforeEach(() => {
  sbMock = createSupabaseMock();
  sendLtdRefundAlertMock.mockReset();
  // Reset call state on each Stripe fn mock; keep the same functions so the
  // client reference stays stable for the vi.mock factory above.
  stripeMock.checkoutSessionsCreate.mockReset();
  stripeMock.billingPortalSessionsCreate.mockReset();
  stripeMock.subscriptionsRetrieve.mockReset();
  stripeMock.subscriptionsUpdate.mockReset();
  stripeMock.invoicesList.mockReset();
  stripeMock.customersCreate.mockReset();
  stripeMock.customersRetrieve.mockReset();
  stripeMock.customersList.mockReset();
  stripeMock.constructEvent.mockReset();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.STRIPE_PRICE_STARTER = "price_starter";
  process.env.STRIPE_PRICE_PRO = "price_pro";
});

async function callWebhook(body: string, signature = "sig") {
  const { POST } = await import("../route");
  return POST(
    makeRequest("/api/billing/webhook", {
      method: "POST",
      body,
      headers: { "stripe-signature": signature },
    }),
  );
}

function makeEvent(type: string, obj: object, id = "evt_1"): Stripe.Event {
  return {
    id,
    type,
    data: { object: obj },
  } as unknown as Stripe.Event;
}

describe("POST /api/billing/webhook", () => {
  it("returns 500 when webhook secret is not configured", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "";
    const res = await callWebhook("{}");
    expect(res.status).toBe(500);
  });

  it("returns 400 when signature header is missing", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      makeRequest("/api/billing/webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when signature is invalid", async () => {
    stripeMock.constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await callWebhook("{}", "bogus");
    expect(res.status).toBe(400);
  });

  it("short-circuits duplicate events via unique-id violation", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("customer.subscription.updated", {
        id: "sub_1",
        customer: "cus_1",
        items: { data: [] },
      }),
    );
    sbMock.setTableError("stripe_webhook_events", {
      message: "duplicate key",
      code: "23505",
    });
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
  });

  it("processes checkout.session.completed with subscription mode", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("checkout.session.completed", {
        mode: "subscription",
        customer: "cus_1",
        subscription: "sub_1",
        metadata: { workspace_id: TEST_UUID },
        customer_details: { email: "buyer@test.com", address: { country: "US" } },
      }),
    );
    stripeMock.subscriptionsRetrieve.mockResolvedValue({
      items: {
        data: [
          {
            price: { id: "price_pro" },
            current_period_start: 1_700_000_000,
            current_period_end: 1_702_000_000,
          },
        ],
      },
    });
    sbMock.setTable("stripe_webhook_events", []);
    sbMock.setTable("subscriptions", []);
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    const calls = sbMock.getCalls().filter((c) => c.table === "subscriptions");
    const upsert = calls.find((c) => c.op === "upsert");
    expect(upsert).toBeDefined();
    const payload = upsert!.payload as Record<string, unknown>;
    expect(payload.plan).toBe("pro");
    expect(payload.workspace_id).toBe(TEST_UUID);
  });

  it("processes LTD checkout — claims seat and mirrors tax id", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("checkout.session.completed", {
        mode: "payment",
        customer: "cus_ltd",
        payment_intent: "pi_1",
        metadata: { ltd: "true", workspace_id: TEST_UUID },
        customer_details: {
          email: "ltd@test.com",
          address: { country: "PL" },
          tax_ids: [{ value: "PL1234567890" }],
        },
      }),
    );
    sbMock.setRpc("claim_ltd_seat", 5);
    sbMock.setTable("subscriptions", []);
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ltd).toBe("claimed");
  });

  it("refunds LTD when sold out (claim_ltd_seat returns null)", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("checkout.session.completed", {
        mode: "payment",
        customer: "cus_ltd",
        payment_intent: "pi_1",
        metadata: { ltd: "true", workspace_id: TEST_UUID },
        customer_details: { email: "x@x.com" },
      }),
    );
    sbMock.setRpc("claim_ltd_seat", null);
    const refundsCreate = vi.fn().mockResolvedValue({ id: "re_1" });
    (stripeMock.client as unknown as { refunds: { create: typeof refundsCreate } }).refunds = {
      create: refundsCreate,
    };
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ltd).toBe("oversold");
    expect(refundsCreate).toHaveBeenCalled();
  });

  it("processes customer.subscription.updated", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("customer.subscription.updated", {
        id: "sub_1",
        status: "active",
        customer: "cus_1",
        items: {
          data: [
            {
              price: { id: "price_starter" },
              current_period_start: 1_700_000_000,
              current_period_end: 1_702_000_000,
            },
          ],
        },
      }),
    );
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    const updates = sbMock
      .getCalls()
      .filter((c) => c.table === "subscriptions" && c.op === "update");
    expect(updates.length).toBeGreaterThan(0);
    const patch = updates[0].payload as Record<string, unknown>;
    expect(patch.plan).toBe("starter");
    expect(patch.status).toBe("active");
  });

  it("flips to past_due on non-active subscription updates", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("customer.subscription.updated", {
        id: "sub_1",
        status: "unpaid",
        customer: "cus_1",
        items: { data: [{ price: { id: "price_pro" } }] },
      }),
    );
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    const patch = sbMock
      .getCalls()
      .find((c) => c.op === "update" && c.table === "subscriptions")
      ?.payload as Record<string, unknown>;
    expect(patch.status).toBe("past_due");
  });

  it("processes customer.subscription.deleted as cancellation", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("customer.subscription.deleted", {
        id: "sub_1",
        customer: "cus_1",
      }),
    );
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    const patch = sbMock
      .getCalls()
      .find((c) => c.op === "update" && c.table === "subscriptions")
      ?.payload as Record<string, unknown>;
    expect(patch.plan).toBe("free");
    expect(patch.status).toBe("canceled");
  });

  it("processes invoice.payment_failed by flipping status", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("invoice.payment_failed", { customer: "cus_1" }),
    );
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    const patch = sbMock
      .getCalls()
      .find((c) => c.op === "update" && c.table === "subscriptions")
      ?.payload as Record<string, unknown>;
    expect(patch.status).toBe("past_due");
  });

  it("processes customer.updated to mirror tax id", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("customer.updated", {
        id: "cus_1",
        email: "new@x.com",
        address: { country: "DE" },
      }),
    );
    const listTaxIds = vi
      .fn()
      .mockResolvedValue({ data: [{ value: "DE123", country: "DE" }] });
    (
      stripeMock.client as unknown as {
        customers: { listTaxIds: typeof listTaxIds };
      }
    ).customers.listTaxIds = listTaxIds;
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    expect(listTaxIds).toHaveBeenCalledWith("cus_1", { limit: 1 });
  });

  it("reconciles failed LTD refunds into failed_refunds and alerts", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("checkout.session.completed", {
        id: "cs_ltd_1",
        mode: "payment",
        customer: "cus_ltd",
        payment_intent: "pi_1",
        amount_total: 9900,
        metadata: { ltd: "true", workspace_id: TEST_UUID },
        customer_details: { email: "buyer@test.com" },
      }),
    );
    sbMock.setRpc("claim_ltd_seat", null);
    sbMock.setTable("failed_refunds", []);
    const refundsCreate = vi
      .fn()
      .mockRejectedValue(new Error("refund failed"));
    (
      stripeMock.client as unknown as {
        refunds: { create: typeof refundsCreate };
      }
    ).refunds = { create: refundsCreate };

    const res = await callWebhook("{}");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ltd).toBe("oversold");

    // 3 retry attempts
    expect(refundsCreate).toHaveBeenCalledTimes(3);

    // Row persisted to failed_refunds for manual reconciliation
    const inserts = sbMock
      .getCalls()
      .filter((c) => c.table === "failed_refunds" && c.op === "insert");
    expect(inserts).toHaveLength(1);
    const payload = inserts[0].payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      session_id: "cs_ltd_1",
      amount: 9900,
      customer_email: "buyer@test.com",
      error_message: "refund failed",
    });

    // Alert fired once with the same metadata
    expect(sendLtdRefundAlertMock).toHaveBeenCalledTimes(1);
    expect(sendLtdRefundAlertMock).toHaveBeenCalledWith({
      email: "buyer@test.com",
      sessionId: "cs_ltd_1",
      amount: 9900,
      errorMessage: "refund failed",
    });
  });

  it("swallows customer.updated tax mirror failure", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("customer.updated", {
        id: "cus_1",
        email: "x@x.com",
        address: { country: "US" },
      }),
    );
    const listTaxIds = vi.fn().mockRejectedValue(new Error("stripe down"));
    (
      stripeMock.client as unknown as {
        customers: { listTaxIds: typeof listTaxIds };
      }
    ).customers.listTaxIds = listTaxIds;
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
  });

  it("ignores unknown event types gracefully", async () => {
    stripeMock.constructEvent.mockReturnValue(
      makeEvent("charge.refunded", {}),
    );
    const res = await callWebhook("{}");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });
});
