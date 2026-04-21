import { describe, it, expect } from "vitest";
import {
  getWorkspaceSubscription,
  upsertSubscription,
  updateSubscriptionByStripeId,
} from "@/lib/queries/subscriptions";
import { createSupabaseMock } from "@/test/supabase-mock";
import { makeSubscription } from "@/test/factories";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  return { mock, client: mock.client as unknown as SupabaseClient<Database> };
}

describe("getWorkspaceSubscription", () => {
  it("returns the subscription when present", async () => {
    const { mock, client } = wire();
    mock.setTable("subscriptions", [
      makeSubscription({ workspace_id: "ws-1", plan: "starter" }),
    ]);
    const sub = await getWorkspaceSubscription(client, "ws-1");
    expect(sub?.plan).toBe("starter");
  });

  it("returns null when none", async () => {
    const { mock, client } = wire();
    mock.setTable("subscriptions", []);
    expect(await getWorkspaceSubscription(client, "ws-x")).toBeNull();
  });
});

describe("upsertSubscription", () => {
  it("records the upsert payload", async () => {
    const { mock, client } = wire();
    const result = await upsertSubscription(client, {
      workspace_id: "ws-1",
      stripe_customer_id: "cus_abc",
      plan: "pro",
    });
    expect(result.stripe_customer_id).toBe("cus_abc");
    expect(mock.getCalls("subscriptions").some((c) => c.op === "upsert")).toBe(true);
  });
});

describe("updateSubscriptionByStripeId", () => {
  it("filters by stripe_customer_id", async () => {
    const { mock, client } = wire();
    mock.setTable("subscriptions", [
      makeSubscription({ stripe_customer_id: "cus_abc" }),
    ]);
    await updateSubscriptionByStripeId(client, "cus_abc", { plan: "pro" });
    const upd = mock.getCalls("subscriptions").find((c) => c.op === "update");
    expect(upd!.eq).toContainEqual(["stripe_customer_id", "cus_abc"]);
    expect(upd!.payload).toMatchObject({ plan: "pro" });
  });
});
