import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
type ScheduleRow = Database["public"]["Tables"]["audit_schedules"]["Row"];

export interface DueSchedule {
  id: string;
  profile_id: string;
  cron_expression: string;
}

export async function getDueSchedules(supabase: Client): Promise<DueSchedule[]> {
  const { data, error } = await supabase
    .from("audit_schedules")
    .select("id, profile_id, cron_expression")
    .eq("is_active", true)
    .lte("next_run_at", new Date().toISOString());

  if (error) throw error;
  return data ?? [];
}

export async function updateScheduleAfterRun(
  supabase: Client,
  scheduleId: string,
  cronExpression: string
): Promise<void> {
  const { error } = await supabase
    .from("audit_schedules")
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: computeNextRun(cronExpression),
    })
    .eq("id", scheduleId);

  if (error) throw error;
}

export async function getProfileSchedule(
  supabase: Client,
  profileId: string
): Promise<ScheduleRow | null> {
  const { data, error } = await supabase
    .from("audit_schedules")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertSchedule(
  supabase: Client,
  profileId: string,
  cronExpression: string = "0 8 * * *",
  isActive: boolean = true
): Promise<ScheduleRow> {
  const { data, error } = await supabase
    .from("audit_schedules")
    .upsert(
      {
        profile_id: profileId,
        cron_expression: cronExpression,
        is_active: isActive,
        next_run_at: computeNextRun(cronExpression),
      },
      { onConflict: "profile_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleSchedule(
  supabase: Client,
  profileId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("audit_schedules")
    .update({
      is_active: isActive,
      next_run_at: isActive ? computeNextRun("0 8 * * *") : null,
    })
    .eq("profile_id", profileId);

  if (error) throw error;
}

/** Simple next-run computation: tomorrow at the cron hour (UTC). */
function computeNextRun(cron: string): string {
  const parts = cron.split(" ");
  const minute = parseInt(parts[0] ?? "0", 10);
  const hour = parseInt(parts[1] ?? "8", 10);

  const next = new Date();
  next.setUTCHours(hour, minute, 0, 0);
  if (next <= new Date()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}
