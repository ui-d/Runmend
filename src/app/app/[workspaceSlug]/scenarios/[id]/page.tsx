import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import {
  getScenarioWithDetails,
  listRunsForScenario,
} from "@/lib/queries/preflight";
import { ScenarioDetail } from "@/components/app/scenarios/ScenarioDetail";

interface PageProps {
  params: Promise<{ workspaceSlug: string; id: string }>;
}

export default async function ScenarioPage({ params }: PageProps) {
  const { workspaceSlug, id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const details = await getScenarioWithDetails(supabase, id);
  if (!details || details.scenario.workspace_id !== workspace.id) notFound();

  const runs = await listRunsForScenario(supabase, id, 20);

  return (
    <ScenarioDetail
      scenario={details.scenario}
      workspaceSlug={workspaceSlug}
      recentRuns={runs}
      inputCount={details.inputs.length}
      assertionCount={details.assertions.length}
    />
  );
}
