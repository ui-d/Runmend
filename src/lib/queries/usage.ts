import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { PLAN_LIMITS, type PlanId } from "@/lib/stripe";

type Client = SupabaseClient<Database>;

export interface UsageMetric {
  used: number;
  limit: number;
}

export interface WorkspaceUsage {
  profiles: UsageMetric;
  diagnosticsThisMonth: UsageMetric;
  /** First day of the current calendar month in UTC — the reset boundary for monthly counters. */
  periodStart: string;
  /** First day of the next calendar month in UTC — when monthly counters reset. */
  periodEnd: string;
}

function currentMonthBoundaries(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/**
 * Aggregates usage counters for the current billing period.
 * Syncs-today is intentionally omitted in Phase 1 — the sync API currently
 * only tracks `last_synced_at` on connections, which is shown as "next allowed
 * in Xh" microcopy rather than an N/limit bar. Revisit when we add a
 * sync_events table.
 */
export async function getWorkspaceUsage(
  supabase: Client,
  workspaceId: string,
  plan: PlanId
): Promise<WorkspaceUsage> {
  const { start, end } = currentMonthBoundaries();
  const limits = PLAN_LIMITS[plan];

  const { data: profileIdsRow, count: profileCount } = await supabase
    .from("automation_profiles")
    .select("id", { count: "exact" })
    .eq("workspace_id", workspaceId);

  const profileIds = (profileIdsRow ?? []).map((p) => p.id);
  let diagnosticsCount = 0;
  if (profileIds.length > 0) {
    const { count } = await supabase
      .from("diagnostic_reports")
      .select("id", { count: "exact", head: true })
      .in("profile_id", profileIds)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
    diagnosticsCount = count ?? 0;
  }

  return {
    profiles: {
      used: profileCount ?? 0,
      limit: limits.profiles,
    },
    diagnosticsThisMonth: {
      used: diagnosticsCount,
      limit: limits.diagnosticsPerMonth,
    },
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

export interface LtdAllocation {
  totalSeats: number;
  seatsSold: number;
  seatsRemaining: number;
  soldOut: boolean;
}

export async function getLtdAllocation(supabase: Client): Promise<LtdAllocation> {
  const { data } = await supabase
    .from("ltd_allocations")
    .select("total_seats, seats_sold")
    .eq("id", 1)
    .maybeSingle();

  const totalSeats = data?.total_seats ?? 20;
  const seatsSold = data?.seats_sold ?? 0;
  const seatsRemaining = Math.max(0, totalSeats - seatsSold);

  return {
    totalSeats,
    seatsSold,
    seatsRemaining,
    soldOut: seatsRemaining === 0,
  };
}
