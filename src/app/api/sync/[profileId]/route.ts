import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProfile } from "@/lib/sync/engine";
import { checkPlanLimit, resolveEffectivePlan } from "@/lib/stripe";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { uuidParamSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ profileId: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { profileId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idCheck = uuidParamSchema.safeParse(profileId);
    if (!idCheck.success) {
      return NextResponse.json(
        { error: "Invalid profile id" },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("automation_profiles")
      .select("id, workspace_id")
      .eq("id", profileId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const membership = await getWorkspaceMembership(
      supabase,
      profile.workspace_id,
    );
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan, is_ltd")
      .eq("workspace_id", profile.workspace_id)
      .maybeSingle();

    const plan = resolveEffectivePlan(subscription);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { count: syncsToday } = await supabase
      .from("platform_connections")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", profile.workspace_id)
      .gte("last_synced_at", today.toISOString());

    const limitCheck = checkPlanLimit(plan, "syncsPerDay", syncsToday ?? 0);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Sync limit reached",
          limit: limitCheck.limit,
          plan,
          upgrade: true,
        },
        { status: 403 },
      );
    }

    const result = await syncProfile(profileId);

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
