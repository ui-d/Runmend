import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { withBackoff } from "@/lib/platform-adapters/retry";
import { sendLtdRefundAlert } from "@/lib/email/alert";
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

  // Idempotency: dedupe replayed events by Stripe event id. A 23505 PK
  // violation means we already processed this event; bail out. Any other
  // error (DB down etc.) falls through and we still process — losing a
  // paid event is worse than a rare duplicate.
  const { error: insertError } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type });

  if (insertError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      // LTD branch: one-time payment with ltd metadata flag. Handled
      // separately because mode=payment has no subscription object and
      // needs an atomic seat reservation.
      if (
        session.mode === "payment" &&
        session.metadata?.ltd === "true" &&
        workspaceId &&
        customerId
      ) {
        const { data: seatsSold, error: claimError } = await admin.rpc(
          "claim_ltd_seat"
        );

        if (claimError || seatsSold == null) {
          // Sold out or failed to reserve — refund to keep trust intact.
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;
          if (paymentIntentId) {
            try {
              await withBackoff(
                () =>
                  stripe.refunds.create({
                    payment_intent: paymentIntentId,
                    reason: "requested_by_customer",
                  }),
                { attempts: 3, baseDelayMs: 500 },
              );
            } catch (refundErr) {
              const errorMessage =
                refundErr instanceof Error
                  ? refundErr.message
                  : "Unknown refund error";
              const customerEmail =
                session.customer_details?.email ?? null;

              await admin.from("failed_refunds").insert({
                session_id: session.id,
                amount: session.amount_total ?? 0,
                customer_email: customerEmail,
                error_message: errorMessage,
              });

              await sendLtdRefundAlert({
                email: customerEmail,
                sessionId: session.id,
                amount: session.amount_total ?? 0,
                errorMessage,
              });

              Sentry.captureException(refundErr, {
                level: "fatal",
                tags: { route: "billing/webhook", step: "ltd_refund" },
                extra: {
                  sessionId: session.id,
                  amount: session.amount_total,
                },
              });
              console.error(
                "LTD oversold refund failed after all retries",
                refundErr,
              );
            }
          }
          return NextResponse.json({ received: true, ltd: "oversold" });
        }

        await admin.from("subscriptions").upsert(
          {
            workspace_id: workspaceId,
            stripe_customer_id: customerId,
            plan: "free",
            status: "active",
            is_ltd: true,
            ltd_purchased_at: new Date().toISOString(),
            billing_email: session.customer_details?.email ?? null,
            billing_country:
              session.customer_details?.address?.country ?? null,
          },
          { onConflict: "workspace_id" }
        );

        // Mirror any tax ID the buyer entered at checkout so the billing page
        // can show it on day-one without waiting for customer.updated.
        const taxIds = session.customer_details?.tax_ids;
        if (taxIds && taxIds.length > 0) {
          const primary = taxIds[0];
          await admin
            .from("subscriptions")
            .update({
              tax_id: primary.value ?? null,
              tax_id_country:
                session.customer_details?.address?.country ?? null,
            })
            .eq("workspace_id", workspaceId);
        }

        return NextResponse.json({ received: true, ltd: "claimed" });
      }

      // Subscription branch (existing behaviour).
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (workspaceId && customerId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);

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
              billing_email: session.customer_details?.email ?? null,
              billing_country:
                session.customer_details?.address?.country ?? null,
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

    case "customer.updated": {
      // Mirror tax ID and billing country so the billing page can show them
      // without calling Stripe on every render. Stripe remains source-of-truth.
      const customer = event.data.object as Stripe.Customer;
      try {
        const taxIds = await stripe.customers.listTaxIds(customer.id, {
          limit: 1,
        });
        const primary = taxIds.data[0];
        await admin
          .from("subscriptions")
          .update({
            tax_id: primary?.value ?? null,
            tax_id_country: primary?.country ?? customer.address?.country ?? null,
            billing_country: customer.address?.country ?? null,
            billing_email: customer.email ?? null,
          })
          .eq("stripe_customer_id", customer.id);
      } catch (err) {
        Sentry.captureException(err, {
          tags: { route: "billing/webhook", step: "customer_updated" },
        });
        console.error("customer.updated tax mirror failed", err);
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
  return "free";
}
