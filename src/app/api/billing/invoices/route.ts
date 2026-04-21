import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import {
  invoiceListQuerySchema,
  formatZodErrors,
} from "@/lib/validation/schemas";

export interface InvoiceSummary {
  id: string;
  number: string | null;
  amountPaid: number;
  currency: string;
  status: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  created: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = invoiceListQuerySchema.safeParse({
      workspaceId: request.nextUrl.searchParams.get("workspaceId") ?? "",
    });
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

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const customerId = subscription?.stripe_customer_id;
    if (!customerId || customerId.startsWith("pending_")) {
      return NextResponse.json({ invoices: [] });
    }

    const list = await stripe.invoices.list({
      customer: customerId,
      limit: 12,
    });

    const invoices: InvoiceSummary[] = list.data.map((inv) => ({
      id: inv.id ?? "",
      number: inv.number ?? null,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdf: inv.invoice_pdf ?? null,
      created: inv.created,
    }));

    return NextResponse.json({ invoices });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to list invoices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
