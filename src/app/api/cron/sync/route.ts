import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncProfile } from "@/lib/sync/engine";
import { getDueSchedules, updateScheduleAfterRun } from "@/lib/queries/schedules";

export const maxDuration = 60;

// Budget for the whole cron tick. If we're within 5s of the hard timeout,
// stop picking up new profiles and let the next tick handle them. The
// remaining profiles' next_run_at is still due, so they'll be picked up
// on the next 15-minute cycle.
const WALL_CLOCK_BUDGET_MS = 50_000;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const schedules = await getDueSchedules(admin);

  const results: Array<{
    profileId: string;
    status: "success" | "error" | "deferred";
    healthScore?: number;
    error?: string;
  }> = [];

  for (const schedule of schedules) {
    if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) {
      results.push({ profileId: schedule.profile_id, status: "deferred" });
      continue;
    }

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
      Sentry.captureException(err, {
        tags: { route: "cron/sync", profile_id: schedule.profile_id },
      });
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
    deferred: results.filter((r) => r.status === "deferred").length,
    total: schedules.length,
    results,
  });
}
