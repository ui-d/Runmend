import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import {
  archiveScenario,
  getScenarioWithDetails,
  updateScenario,
} from "@/lib/queries/preflight";
import { scenarioUpdateSchema } from "@/lib/validation/preflight-schemas";
import { formatZodErrors } from "@/lib/validation/schemas";

interface RouteParams {
  params: { id: string };
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

    const details = await getScenarioWithDetails(supabase, params.id);
    if (!details) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }
    const membership = await getWorkspaceMembership(
      supabase,
      details.scenario.workspace_id,
    );
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 },
      );
    }
    return NextResponse.json(details);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load scenario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = scenarioUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 },
      );
    }

    const details = await getScenarioWithDetails(supabase, params.id);
    if (!details) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }
    const membership = await getWorkspaceMembership(
      supabase,
      details.scenario.workspace_id,
    );
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json(
        { error: "Admin role required" },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const patch = parsed.data;
    const scenario = await updateScenario(admin, params.id, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.workflowName !== undefined ? { workflow_name: patch.workflowName } : {}),
      ...(patch.scheduleCron !== undefined ? { schedule_cron: patch.scheduleCron } : {}),
      ...(patch.costCapCents !== undefined ? { cost_cap_cents: patch.costCapCents } : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    });
    return NextResponse.json({ scenario });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update scenario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const details = await getScenarioWithDetails(supabase, params.id);
    if (!details) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }
    const membership = await getWorkspaceMembership(
      supabase,
      details.scenario.workspace_id,
    );
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json(
        { error: "Admin role required" },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    await archiveScenario(admin, params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to archive scenario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
