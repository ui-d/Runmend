import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProfile } from "@/lib/sync/engine";
import { checkPlanLimit } from "@/lib/stripe";

interface RouteContext {
  params: Promise<{ profileId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { profileId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this profile's workspace
    const { data: profile } = await supabase
      .from("automation_profiles")
      .select("id, workspace_id")
      .eq("id", profileId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found or access denied" },
        { status: 404 }
      );
    }

    // Check plan limit for syncs per day
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("workspace_id", profile.workspace_id)
      .maybeSingle();

    const plan = subscription?.plan ?? "free";
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
        { status: 403 }
      );
    }

    const result = await syncProfile(profileId);

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
