import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
import { getLtdAllocation, getWorkspaceUsage } from "@/lib/queries/usage";
import { resolveEffectivePlan } from "@/lib/stripe";
import { BillingPageClient } from "./billing-client";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function BillingPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const subscription = await getWorkspaceSubscription(supabase, workspace.id);
  const effectivePlan = resolveEffectivePlan(subscription);

  const [usage, ltd] = await Promise.all([
    getWorkspaceUsage(supabase, workspace.id, effectivePlan),
    getLtdAllocation(supabase),
  ]);

  return (
    <BillingPageClient
      workspaceId={workspace.id}
      rawPlan={subscription?.plan ?? "free"}
      effectivePlan={effectivePlan}
      isLtd={subscription?.is_ltd ?? false}
      ltdPurchasedAt={subscription?.ltd_purchased_at ?? null}
      status={subscription?.status ?? "active"}
      periodEnd={subscription?.current_period_end ?? null}
      taxId={subscription?.tax_id ?? null}
      taxIdCountry={subscription?.tax_id_country ?? null}
      billingCountry={subscription?.billing_country ?? null}
      hasStripeCustomer={
        !!subscription?.stripe_customer_id &&
        !subscription.stripe_customer_id.startsWith("pending_")
      }
      usage={usage}
      ltd={ltd}
    />
  );
}
