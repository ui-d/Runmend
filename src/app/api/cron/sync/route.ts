import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProfile } from "@/lib/sync/engine";
import { getDueSchedules, updateScheduleAfterRun } from "@/lib/queries/schedules";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const schedules = await getDueSchedules(admin);

  const results: Array<{
    profileId: string;
    status: "success" | "error";
    healthScore?: number;
    error?: string;
  }> = [];

  for (const schedule of schedules) {
    try {
      const syncResult = await syncProfile(schedule.profile_id);
      await updateScheduleAfterRun(admin, schedule.id, schedule.cron_expression);
      results.push({
        profileId: schedule.profile_id,
        status: "success",
        healthScore: syncResult.healthScore,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      // Still update next_run_at so we don't retry endlessly on broken profiles
      try {
        await updateScheduleAfterRun(admin, schedule.id, schedule.cron_expression);
      } catch {
        // If schedule update also fails, continue to next profile
      }
      results.push({
        profileId: schedule.profile_id,
        status: "error",
        error: message,
      });
    }
  }

  return NextResponse.json({
    synced: results.filter((r) => r.status === "success").length,
    failed: results.filter((r) => r.status === "error").length,
    total: schedules.length,
    results,
  });
}
