import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
import { checkPlanLimit, resolveEffectivePlan } from "@/lib/stripe";
import {
  countActiveScenarios,
  createScenario,
  listScenarios,
  type AssertionInput,
  type InputDraft,
} from "@/lib/queries/preflight";
import { getConnectionById } from "@/lib/queries/connections";
import { scenarioCreateSchema } from "@/lib/validation/preflight-schemas";
import { formatZodErrors } from "@/lib/validation/schemas";
import type { Json } from "@/lib/database.types";

interface ScenarioWarning {
  code: string;
  message: string;
  docHref: string;
}

const MAKE_COST_WARNING: ScenarioWarning = {
  code: "cost_unsupported_make",
  message:
    "cost_under_cents is not yet supported for Make connections — Make's " +
    "public v2 API does not expose per-module cost. The assertion is saved " +
    "and will activate automatically when Make cost monitoring ships; until " +
    "then it records as a non-failing warning, not a failure.",
  docHref: "/docs/MAKE_COST_EXTRACTION_GAP.md",
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 },
      );
    }

    const membership = await getWorkspaceMembership(supabase, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 },
      );
    }

    const scenarios = await listScenarios(supabase, workspaceId);
    return NextResponse.json({ scenarios });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to list scenarios";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = scenarioCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 },
      );
    }
    const input = parsed.data;

    const membership = await getWorkspaceMembership(supabase, input.workspaceId);
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json(
        { error: "Admin role required to create scenarios" },
        { status: 403 },
      );
    }

    const subscription = await getWorkspaceSubscription(supabase, input.workspaceId);
    const plan = resolveEffectivePlan(subscription);
    const currentCount = await countActiveScenarios(supabase, input.workspaceId);
    const quota = checkPlanLimit(plan, "preflightScenarios", currentCount);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Plan limit reached: ${quota.limit} scenario${quota.limit === 1 ? "" : "s"} on the ${plan} plan. Upgrade to add more.`,
          upgrade_required: true,
          limit: quota.limit,
        },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const inputs: InputDraft[] = input.inputs.map((row) => ({
      input_data: row.input_data as Json,
      label: row.label ?? null,
      source: row.source,
      pii_redacted_at: row.pii_redacted_at ?? null,
    }));
    const assertions: AssertionInput[] = input.assertions.map((row) => ({
      assertion_type: row.assertion_type,
      config: row.config as Record<string, Json>,
      severity: row.severity,
    }));
    const scenario = await createScenario(admin, {
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
      automationProfileId: input.automationProfileId ?? null,
      name: input.name,
      description: input.description ?? null,
      workflowExternalId: input.workflowExternalId,
      workflowName: input.workflowName ?? null,
      scheduleCron: input.scheduleCron ?? null,
      costCapCents: input.costCapCents,
      createdBy: user.id,
      inputs,
      assertions,
    });

    // Non-blocking signpost: cost_under_cents on a Make connection is a known
    // product gap (see docs/MAKE_COST_EXTRACTION_GAP.md). We still create the
    // scenario so the assertion auto-activates when Make cost ships, and the
    // attempt is an adoption signal.
    const warnings: ScenarioWarning[] = [];
    if (assertions.some((a) => a.assertion_type === "cost_under_cents")) {
      const connection = await getConnectionById(admin, input.connectionId);
      if (connection?.platform === "make") {
        warnings.push(MAKE_COST_WARNING);
      }
    }

    return NextResponse.json(
      { scenario, ...(warnings.length > 0 ? { warnings } : {}) },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create scenario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
