import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_PRICE_LTD } from "@/lib/stripe";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { claimLtdSchema, formatZodErrors } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    if (!STRIPE_PRICE_LTD) {
      return NextResponse.json(
        { error: "Lifetime deal not configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = claimLtdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }
    const { workspaceId } = parsed.data;

    const membership = await getWorkspaceMembership(supabase, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Already redeemed — no double-claim on the same workspace.
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("is_ltd")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (existing?.is_ltd) {
      return NextResponse.json(
        { error: "This workspace already has a lifetime deal" },
        { status: 409 }
      );
    }

    // Cheap bouncer. The webhook is the authoritative seat-availability check
    // (atomic UPDATE ... RETURNING) and will refund if the seat is gone by the
    // time the charge confirms.
    const { data: allocation } = await supabase
      .from("ltd_allocations")
      .select("total_seats, seats_sold")
      .eq("id", 1)
      .maybeSingle();

    if (allocation && allocation.seats_sold >= allocation.total_seats) {
      return NextResponse.json(
        { error: "Sold out" },
        { status: 410 }
      );
    }

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", workspaceId)
      .single();

    const origin = request.headers.get("origin") ?? "";
    const returnPath = workspace?.slug
      ? `/app/${workspace.slug}/billing`
      : `/app`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: STRIPE_PRICE_LTD, quantity: 1 }],
      customer_creation: "always",
      customer_email: user.email ?? undefined,
      tax_id_collection: { enabled: true },
      invoice_creation: { enabled: true },
      billing_address_collection: "required",
      allow_promotion_codes: false,
      success_url: `${origin}${returnPath}?ltd=success`,
      cancel_url: `${origin}${returnPath}?ltd=canceled`,
      metadata: {
        workspace_id: workspaceId,
        ltd: "true",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to start LTD checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
