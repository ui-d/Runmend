import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceConnections } from "@/lib/queries/connections";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
import { resolveEffectivePlan, PLAN_LIMITS } from "@/lib/stripe";
import { listScenarios } from "@/lib/queries/preflight";
import { ScenarioForm } from "@/components/app/scenarios/ScenarioForm";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewScenarioPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const [connections, subscription, scenarios] = await Promise.all([
    getWorkspaceConnections(supabase, workspace.id),
    getWorkspaceSubscription(supabase, workspace.id),
    listScenarios(supabase, workspace.id),
  ]);

  const plan = resolveEffectivePlan(subscription);
  const limit = PLAN_LIMITS[plan].preflightScenarios;
  if (limit !== -1 && scenarios.length >= limit) {
    redirect(`/app/${workspaceSlug}/scenarios`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New scenario</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define a workflow, sample inputs, and assertions to validate the output.
        </p>
      </div>
      <ScenarioForm
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        connections={connections.map((c) => ({
          id: c.id,
          display_name: c.display_name,
          platform: c.platform,
        }))}
      />
    </div>
  );
}
