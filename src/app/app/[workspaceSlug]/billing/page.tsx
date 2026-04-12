import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
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

  return (
    <BillingPageClient
      plan={subscription?.plan ?? "free"}
      status={subscription?.status ?? "active"}
      workspaceId={workspace.id}
      periodEnd={subscription?.current_period_end ?? null}
    />
  );
}
