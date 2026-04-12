import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";
import type { PlanId } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook configuration error" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (workspaceId && customerId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);

        // Get period from first item
        const item = sub.items.data[0];
        const periodStart = item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : null;
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null;

        await admin
          .from("subscriptions")
          .upsert(
            {
              workspace_id: workspaceId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan: plan as PlanId,
              status: "active",
              current_period_start: periodStart,
              current_period_end: periodEnd,
            },
            { onConflict: "workspace_id" }
          );
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      const priceId = sub.items.data[0]?.price?.id;
      const plan = getPlanFromPriceId(priceId);

      const item = sub.items.data[0];
      const periodStart = item?.current_period_start
        ? new Date(item.current_period_start * 1000).toISOString()
        : null;
      const periodEnd = item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null;

      if (customerId) {
        await admin
          .from("subscriptions")
          .update({
            plan: plan as PlanId,
            status: sub.status === "active" ? "active" : "past_due",
            stripe_subscription_id: sub.id,
            current_period_start: periodStart,
            current_period_end: periodEnd,
          })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

      if (customerId) {
        await admin
          .from("subscriptions")
          .update({
            plan: "free" as PlanId,
            status: "canceled",
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        await admin
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function getPlanFromPriceId(priceId: string | undefined): string {
  if (!priceId) return "free";
  const starterPrice = process.env.STRIPE_PRICE_STARTER ?? "";
  const proPrice = process.env.STRIPE_PRICE_PRO ?? "";
  if (priceId === starterPrice) return "starter";
  if (priceId === proPrice) return "pro";
  return "starter";
}
