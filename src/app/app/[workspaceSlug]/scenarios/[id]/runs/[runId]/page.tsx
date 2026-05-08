import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import {
  getRun,
  getRunResults,
  getScenarioWithDetails,
} from "@/lib/queries/preflight";
import { RunResultsView } from "@/components/app/scenarios/RunResultsView";
import { ChevronLeft } from "lucide-react";
import type { Json } from "@/lib/database.types";

interface PageProps {
  params: Promise<{ workspaceSlug: string; id: string; runId: string }>;
}

export default async function RunPage({ params }: PageProps) {
  const { workspaceSlug, id, runId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const details = await getScenarioWithDetails(supabase, id);
  if (!details || details.scenario.workspace_id !== workspace.id) notFound();

  const run = await getRun(supabase, runId);
  if (!run || run.scenario_id !== id) notFound();

  const results = await getRunResults(supabase, runId);

  // Build baseline lookup for diff. Falls back to null when no baseline exists.
  const baselineByInputId: Record<string, Json | null> = {};
  if (details.scenario.baseline_run_id) {
    const baselineResults = await getRunResults(
      supabase,
      details.scenario.baseline_run_id,
    );
    for (const result of baselineResults) {
      baselineByInputId[result.input_id] = result.output_data;
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/app/${workspaceSlug}/scenarios/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to scenario
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Run from {new Date(run.started_at).toLocaleString()}
        </h1>
        <p className="text-sm text-muted-foreground">{details.scenario.name}</p>
      </div>
      <RunResultsView
        run={run}
        results={results}
        inputs={details.inputs.map((i) => ({ id: i.id, label: i.label }))}
        baselineByInputId={baselineByInputId}
      />
    </div>
  );
}
