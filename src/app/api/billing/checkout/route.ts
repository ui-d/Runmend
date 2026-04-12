import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, getOrCreateStripeCustomer, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { checkoutSchema, formatZodErrors } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }
    const { workspaceId, plan } = parsed.data;

    const membership = await getWorkspaceMembership(supabase, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    const priceId = STRIPE_PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for this plan" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const customerId = await getOrCreateStripeCustomer(
      workspaceId,
      user.email ?? "",
      subscription?.stripe_customer_id
    );

    // Update customer ID if it was pending
    if (
      subscription?.stripe_customer_id &&
      subscription.stripe_customer_id.startsWith("pending_")
    ) {
      const admin = createAdminClient();
      await admin
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("workspace_id", workspaceId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${request.headers.get("origin")}/app?billing=success`,
      cancel_url: `${request.headers.get("origin")}/app?billing=canceled`,
      metadata: { workspace_id: workspaceId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
