import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { getRun, getRunResults, getScenario } from "@/lib/queries/preflight";

interface RouteParams {
  params: { id: string; runId: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scenario = await getScenario(supabase, params.id);
    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }
    const membership = await getWorkspaceMembership(supabase, scenario.workspace_id);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 },
      );
    }

    const run = await getRun(supabase, params.runId);
    if (!run || run.scenario_id !== scenario.id) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    const results = await getRunResults(supabase, run.id);
    return NextResponse.json({ run, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
