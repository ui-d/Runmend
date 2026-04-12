import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await request.json();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .single();

    if (
      !subscription?.stripe_customer_id ||
      subscription.stripe_customer_id.startsWith("pending_")
    ) {
      return NextResponse.json(
        { error: "No billing account found. Upgrade first." },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${request.headers.get("origin")}/app`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create portal session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
