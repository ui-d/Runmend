import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  deriveFreshness,
  type SyncFreshness,
} from "@/lib/queries/workspace-dashboard";
import { CONNECTION_SYNC_INTERVAL_MINUTES } from "@/lib/connections/catalog";

type Client = SupabaseClient<Database>;
type ConnectionRow = Database["public"]["Tables"]["platform_connections"]["Row"];

export interface LinkedProfile {
  id: string;
  name: string;
}

export interface ConnectionHealth extends ConnectionRow {
  automationCount: number;
  profileCount: number;
  linkedProfiles: LinkedProfile[];
  executions24h: number;
  executions24hFailed: number;
  failureRate24h: number | null;
  lastExecutionAt: string | null;
  lastSuccessfulExecutionAt: string | null;
  sparkline24h: SparklineBucket[];
  freshness: SyncFreshness;
  nextSyncAt: string | null;
}

export interface SparklineBucket {
  hour: number;
  total: number;
  failed: number;
}

export async function getWorkspaceConnections(
  supabase: Client,
  workspaceId: string
): Promise<ConnectionRow[]> {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getConnectionsByPlatform(
  supabase: Client,
  workspaceId: string,
  platform: string,
): Promise<ConnectionRow[]> {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("platform", platform)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getConnectionById(
  supabase: Client,
  connectionId: string
): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function upsertConnection(
  supabase: Client,
  input: Database["public"]["Tables"]["platform_connections"]["Insert"]
): Promise<ConnectionRow> {
  const { data, error } = await supabase
    .from("platform_connections")
    .upsert(input, { onConflict: "workspace_id,platform,display_name" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteConnection(
  supabase: Client,
  connectionId: string
): Promise<void> {
  const { error } = await supabase
    .from("platform_connections")
    .delete()
    .eq("id", connectionId);

  if (error) throw error;
}

export async function updateConnectionStatus(
  supabase: Client,
  connectionId: string,
  status: string,
  errorMessage?: string | null
): Promise<void> {
  const { error } = await supabase
    .from("platform_connections")
    .update({
      status: status as ConnectionRow["status"],
      error_message: errorMessage ?? null,
      last_tested_at: new Date().toISOString(),
      ...(status === "active" ? { last_synced_at: new Date().toISOString() } : {}),
    })
    .eq("id", connectionId);

  if (error) throw error;
}

/**
 * Enriched connection rows for the catalog page: base row fields plus
 * per-connection counts (automations, profiles using), last-24h execution
 * rollups (total, failed, hourly sparkline), and a freshness/next-sync
 * derivation. Aggregation is done in JS over two bounded queries to avoid
 * N+1 and to stay inside RLS without stored functions.
 */
export async function getConnectionsWithHealth(
  supabase: Client,
  workspaceId: string
): Promise<ConnectionHealth[]> {
  const { data: connections, error: connErr } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (connErr) throw connErr;

  const rows = connections ?? [];
  if (rows.length === 0) return [];

  const connIds = rows.map((r) => r.id);

  const [automationsRes, boundProfilesRes] = await Promise.all([
    supabase
      .from("automations")
      .select("id, connection_id, profile_id")
      .in("connection_id", connIds),
    supabase
      .from("automation_profiles")
      .select("id, name, connection_id")
      .eq("workspace_id", workspaceId)
      .in("connection_id", connIds),
  ]);
  if (automationsRes.error) throw automationsRes.error;
  if (boundProfilesRes.error) throw boundProfilesRes.error;

  const automationRows = automationsRes.data ?? [];
  const automationIds = automationRows.map((a) => a.id);

  const automationsByConnection = new Map<string, string[]>();
  const connectionIdByAutomation = new Map<string, string>();
  const profilesByConnection = new Map<string, Set<string>>();
  for (const a of automationRows) {
    const list = automationsByConnection.get(a.connection_id) ?? [];
    list.push(a.id);
    automationsByConnection.set(a.connection_id, list);
    connectionIdByAutomation.set(a.id, a.connection_id);
    const profiles = profilesByConnection.get(a.connection_id) ?? new Set<string>();
    profiles.add(a.profile_id);
    profilesByConnection.set(a.connection_id, profiles);
  }

  const boundProfiles = boundProfilesRes.data;

  const profileNameById = new Map<string, string>();
  for (const p of boundProfiles ?? []) {
    if (!p.connection_id) continue;
    profileNameById.set(p.id, p.name);
    const profiles = profilesByConnection.get(p.connection_id) ?? new Set<string>();
    profiles.add(p.id);
    profilesByConnection.set(p.connection_id, profiles);
  }

  const profileIdsNeedingName = new Set<string>();
  for (const set of Array.from(profilesByConnection.values())) {
    for (const id of Array.from(set)) {
      if (!profileNameById.has(id)) profileIdsNeedingName.add(id);
    }
  }
  if (profileIdsNeedingName.size > 0) {
    const { data: legacyProfiles, error: legacyErr } = await supabase
      .from("automation_profiles")
      .select("id, name")
      .in("id", Array.from(profileIdsNeedingName));
    if (legacyErr) throw legacyErr;
    for (const p of legacyProfiles ?? []) profileNameById.set(p.id, p.name);
  }

  const nowMs = Date.now();
  const windowStart = new Date(nowMs - 24 * 60 * 60 * 1000);

  const executionsByConnection = new Map<
    string,
    {
      total: number;
      failed: number;
      last: string | null;
      lastSuccess: string | null;
      buckets: Map<number, { total: number; failed: number }>;
    }
  >();

  if (automationIds.length > 0) {
    const { data: executions, error: execErr } = await supabase
      .from("execution_logs")
      .select("automation_id, status, started_at")
      .in("automation_id", automationIds)
      .gte("started_at", windowStart.toISOString());
    if (execErr) throw execErr;

    for (const row of executions ?? []) {
      const connectionId = connectionIdByAutomation.get(row.automation_id);
      if (!connectionId) continue;
      const bucket = executionsByConnection.get(connectionId) ?? {
        total: 0,
        failed: 0,
        last: null,
        lastSuccess: null,
        buckets: new Map<number, { total: number; failed: number }>(),
      };
      bucket.total += 1;
      const isFailed = row.status === "error" || row.status === "failed";
      if (isFailed) bucket.failed += 1;
      if (!bucket.last || row.started_at > bucket.last) bucket.last = row.started_at;
      if (!isFailed && (!bucket.lastSuccess || row.started_at > bucket.lastSuccess)) {
        bucket.lastSuccess = row.started_at;
      }
      const hourIndex = Math.max(
        0,
        Math.min(
          23,
          Math.floor((new Date(row.started_at).getTime() - windowStart.getTime()) / (60 * 60 * 1000))
        )
      );
      const perHour = bucket.buckets.get(hourIndex) ?? { total: 0, failed: 0 };
      perHour.total += 1;
      if (isFailed) perHour.failed += 1;
      bucket.buckets.set(hourIndex, perHour);
      executionsByConnection.set(connectionId, bucket);
    }
  }

  return rows.map((row) => {
    const automationIdsForConn = automationsByConnection.get(row.id) ?? [];
    const profileSet = profilesByConnection.get(row.id) ?? new Set<string>();
    const exec = executionsByConnection.get(row.id);

    const sparkline24h: SparklineBucket[] = Array.from({ length: 24 }, (_, hour) => {
      const per = exec?.buckets.get(hour);
      return { hour, total: per?.total ?? 0, failed: per?.failed ?? 0 };
    });

    const failureRate24h =
      exec && exec.total > 0 ? exec.failed / exec.total : null;

    const nextSyncAt = row.last_synced_at
      ? new Date(
          new Date(row.last_synced_at).getTime() +
            CONNECTION_SYNC_INTERVAL_MINUTES * 60 * 1000
        ).toISOString()
      : null;

    const linkedProfiles: LinkedProfile[] = Array.from(profileSet)
      .map((id) => ({ id, name: profileNameById.get(id) ?? "Untitled profile" }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      ...row,
      automationCount: automationIdsForConn.length,
      profileCount: profileSet.size,
      linkedProfiles,
      executions24h: exec?.total ?? 0,
      executions24hFailed: exec?.failed ?? 0,
      failureRate24h,
      lastExecutionAt: exec?.last ?? null,
      lastSuccessfulExecutionAt: exec?.lastSuccess ?? null,
      sparkline24h,
      freshness: deriveFreshness(row.last_synced_at),
      nextSyncAt,
    };
  });
}

/**
 * Vote counts by platform slug for the coming-soon tiles. Returns 0 for
 * slugs with no votes so the UI can render a uniform pill without a
 * null-check per tile.
 */
export async function getInterestVoteCounts(
  supabase: Client,
  workspaceId: string,
  platformSlugs: string[]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const slug of platformSlugs) result[slug] = 0;
  if (platformSlugs.length === 0) return result;

  const { data, error } = await supabase
    .from("connection_interest")
    .select("platform_slug")
    .eq("workspace_id", workspaceId)
    .in("platform_slug", platformSlugs);
  if (error) throw error;

  for (const row of data ?? []) {
    result[row.platform_slug] = (result[row.platform_slug] ?? 0) + 1;
  }
  return result;
}

/**
 * Slugs the current user has already voted on, so the UI can toggle the
 * "Notify me" button between its vote / unvote states.
 */
export async function getUserVotes(
  supabase: Client,
  workspaceId: string,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("connection_interest")
    .select("platform_slug")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) throw error;

  const set = new Set<string>();
  for (const row of data ?? []) set.add(row.platform_slug);
  return set;
}
