import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
import { checkPlanLimit, resolveEffectivePlan } from "@/lib/stripe";
import {
  countRunsThisMonth,
  getScenario,
} from "@/lib/queries/preflight";
import { runExecutor } from "@/lib/preflight/executor";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
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
    if (scenario.archived_at !== null) {
      return NextResponse.json(
        { error: "Scenario is archived" },
        { status: 409 },
      );
    }

    const membership = await getWorkspaceMembership(supabase, scenario.workspace_id);
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json(
        { error: "Admin role required to trigger runs" },
        { status: 403 },
      );
    }

    const subscription = await getWorkspaceSubscription(
      supabase,
      scenario.workspace_id,
    );
    const plan = resolveEffectivePlan(subscription);
    const runsThisMonth = await countRunsThisMonth(supabase, scenario.workspace_id);
    const quota = checkPlanLimit(plan, "preflightRunsPerMonth", runsThisMonth);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Monthly run limit reached: ${quota.limit} runs on the ${plan} plan. Upgrade for more.`,
          upgrade_required: true,
          limit: quota.limit,
        },
        { status: 403 },
      );
    }

    const result = await runExecutor.execute({
      scenarioId: scenario.id,
      triggeredBy: "manual",
      triggeredByUser: user.id,
    });
    return NextResponse.json({ run: result });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to trigger run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
