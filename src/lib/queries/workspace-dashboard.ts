import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { isIssueType, type IssueType } from "@/lib/detectors";
import type { IssueSeverity, Platform } from "@/lib/types";
import type { SparklinePoint } from "@/lib/dashboard/derivations";

type Client = SupabaseClient<Database>;

export interface PulseTrendPoint {
  captured_on: string;
  score: number;
}

export interface WorkspacePulse {
  currentScore: number;
  trend: PulseTrendPoint[];
  delta30d: number | null;
  trackingSince: string | null;
  worstProfile: { id: string; name: string; score: number } | null;
  totalProfiles: number;
  totalAutomations: number;
  totalOpenIssues: number;
  totalCriticalIssues: number;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
}

export interface DetectorRollupIssueRef {
  type: IssueType | null;
  severity: IssueSeverity;
  profile_id: string;
}

export type ActivityEventKind =
  | "issue_created"
  | "issue_resolved"
  | "issue_dismissed"
  | "diagnostic_completed"
  | "sync_completed";

export interface ActivityEvent {
  id: string;
  kind: ActivityEventKind;
  occurredAt: string;
  profileId: string | null;
  profileName: string | null;
  detectorType: IssueType | null;
  severity: IssueSeverity | null;
  headline: string;
  subline: string | null;
  platform: Platform | null;
}

export interface WorkspaceProfileCardData {
  id: string;
  name: string;
  platform: Platform;
  industry: string | null;
  healthScore: number;
  openIssueCount: number;
  criticalIssueCount: number;
  automationCount: number;
  lastAuditAt: string | null;
  lastSyncedAt: string | null;
  openIssueTypes: IssueType[];
  sparkline: SparklinePoint[];
  sparklineDelta: number | null;
  platformUrl: string | null;
}

export type SyncFreshness = "fresh" | "recent" | "stale" | "never";

export interface AutomationHealthBuckets {
  green: number;
  amber: number;
  red: number;
  total: number;
}

export interface SeverityCounts {
  critical: number;
  warning: number;
  info: number;
}

export interface WorkspaceProfileTriageRow extends WorkspaceProfileCardData {
  severityCounts: SeverityCounts;
  automationHealth: AutomationHealthBuckets;
  snoozedUntil: string | null;
  freshness: SyncFreshness;
}

/**
 * Core dashboard pulse: current rolled-up score, 30-day workspace-avg trend,
 * delta vs. oldest snapshot in that window, worst profile, and roll-up totals.
 * Missing days are carry-forward so the line stays continuous.
 */
export async function getWorkspacePulse(
  supabase: Client,
  workspaceId: string,
): Promise<WorkspacePulse> {
  const { data: profiles, error: profilesError } = await supabase
    .from("automation_profiles")
    .select("id, name, health_score")
    .eq("workspace_id", workspaceId);

  if (profilesError) throw profilesError;
  const profileRows = profiles ?? [];
  const profileIds = profileRows.map((p) => p.id);

  if (profileIds.length === 0) {
    return {
      currentScore: 0,
      trend: [],
      delta30d: null,
      trackingSince: null,
      worstProfile: null,
      totalProfiles: 0,
      totalAutomations: 0,
      totalOpenIssues: 0,
      totalCriticalIssues: 0,
      lastSyncAt: null,
      nextSyncAt: null,
    };
  }

  const currentScore = Math.round(
    profileRows.reduce((sum, p) => sum + (p.health_score ?? 0), 0) /
      profileRows.length,
  );

  const worstProfile = profileRows.reduce<{ id: string; name: string; score: number } | null>(
    (min, p) =>
      !min || (p.health_score ?? 0) < min.score
        ? { id: p.id, name: p.name, score: p.health_score ?? 0 }
        : min,
    null,
  );

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data: snapshots, error: snapError } = await supabase
    .from("profile_health_snapshots")
    .select("profile_id, captured_on, health_score")
    .in("profile_id", profileIds)
    .gte("captured_on", sinceDate)
    .order("captured_on", { ascending: true });

  if (snapError) throw snapError;
  const snapRows = snapshots ?? [];

  const trend = buildWorkspaceTrend(snapRows, profileIds);
  const trackingSince = trend[0]?.captured_on ?? null;
  const delta30d =
    trend.length >= 2 ? currentScore - trend[0].score : null;

  const { data: connections, error: connError } = await supabase
    .from("platform_connections")
    .select("last_synced_at")
    .eq("workspace_id", workspaceId);
  if (connError) throw connError;

  const lastSyncAt =
    (connections ?? [])
      .map((c) => c.last_synced_at)
      .filter((t): t is string => !!t)
      .sort()
      .reverse()[0] ?? null;

  const { data: schedules, error: schedError } = await supabase
    .from("audit_schedules")
    .select("next_run_at, is_active, profile_id")
    .eq("is_active", true)
    .in("profile_id", profileIds);
  if (schedError) throw schedError;

  const nextSyncAt =
    (schedules ?? [])
      .map((s) => s.next_run_at)
      .filter((t): t is string => !!t)
      .sort()[0] ?? null;

  const { data: issueRows, error: issuesError } = await supabase
    .from("automation_issues")
    .select("id, severity, status")
    .in("profile_id", profileIds)
    .eq("status", "open");
  if (issuesError) throw issuesError;

  const totalOpenIssues = issueRows?.length ?? 0;
  const totalCriticalIssues =
    issueRows?.filter((i) => i.severity === "critical").length ?? 0;

  const { count: automationCount, error: autoError } = await supabase
    .from("automations")
    .select("id", { count: "exact", head: true })
    .in("profile_id", profileIds);
  if (autoError) throw autoError;

  return {
    currentScore,
    trend,
    delta30d,
    trackingSince,
    worstProfile,
    totalProfiles: profileRows.length,
    totalAutomations: automationCount ?? 0,
    totalOpenIssues,
    totalCriticalIssues,
    lastSyncAt,
    nextSyncAt,
  };
}

/**
 * Workspace-wide open-issue rows, ready to feed rollupDetectorStates().
 * Returned raw so the caller owns the derivation.
 */
export async function getWorkspaceOpenIssues(
  supabase: Client,
  workspaceId: string,
): Promise<DetectorRollupIssueRef[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from("automation_profiles")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (profilesError) throw profilesError;

  const profileIds = (profiles ?? []).map((p) => p.id);
  if (profileIds.length === 0) return [];

  const { data, error } = await supabase
    .from("automation_issues")
    .select("type, severity, profile_id")
    .in("profile_id", profileIds)
    .eq("status", "open");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    type: isIssueType(row.type) ? row.type : null,
    severity: row.severity as IssueSeverity,
    profile_id: row.profile_id,
  }));
}

/**
 * Unified activity feed derived from existing tables. Combines issue
 * lifecycle events, diagnostic runs, and sync events; sorted newest first.
 */
export async function getWorkspaceActivity(
  supabase: Client,
  workspaceId: string,
  limit = 12,
): Promise<ActivityEvent[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from("automation_profiles")
    .select("id, name, platform")
    .eq("workspace_id", workspaceId);
  if (profilesError) throw profilesError;

  const profileRows = profiles ?? [];
  if (profileRows.length === 0) return [];

  const profileById = new Map(
    profileRows.map((p) => [
      p.id,
      { name: p.name, platform: p.platform as Platform },
    ]),
  );
  const profileIds = profileRows.map((p) => p.id);
  const fetchLimit = Math.max(limit * 2, 20);

  const [issuesRes, reportsRes, connectionsRes] = await Promise.all([
    supabase
      .from("automation_issues")
      .select(
        "id, type, severity, name, automation_name, status, created_at, resolved_at, updated_at, profile_id",
      )
      .in("profile_id", profileIds)
      .order("updated_at", { ascending: false })
      .limit(fetchLimit),
    supabase
      .from("diagnostic_reports")
      .select("id, triggered_by, created_at, profile_id")
      .in("profile_id", profileIds)
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
    supabase
      .from("platform_connections")
      .select("id, platform, last_synced_at")
      .eq("workspace_id", workspaceId)
      .not("last_synced_at", "is", null)
      .order("last_synced_at", { ascending: false })
      .limit(fetchLimit),
  ]);

  if (issuesRes.error) throw issuesRes.error;
  if (reportsRes.error) throw reportsRes.error;
  if (connectionsRes.error) throw connectionsRes.error;

  const events: ActivityEvent[] = [];

  for (const row of issuesRes.data ?? []) {
    const profile = profileById.get(row.profile_id);
    const detectorType = isIssueType(row.type) ? row.type : null;
    const severity = row.severity as IssueSeverity;
    events.push({
      id: `issue-created:${row.id}`,
      kind: "issue_created",
      occurredAt: row.created_at,
      profileId: row.profile_id,
      profileName: profile?.name ?? null,
      detectorType,
      severity,
      headline: `${row.name} on ${row.automation_name}`,
      subline: profile ? `Detected on ${profile.name}` : null,
      platform: profile?.platform ?? null,
    });
    if (row.resolved_at && row.status !== "open") {
      events.push({
        id: `issue-${row.status}:${row.id}`,
        kind: row.status === "dismissed" ? "issue_dismissed" : "issue_resolved",
        occurredAt: row.resolved_at,
        profileId: row.profile_id,
        profileName: profile?.name ?? null,
        detectorType,
        severity,
        headline:
          row.status === "dismissed"
            ? `Marked intentional: ${row.name}`
            : `Resolved: ${row.name}`,
        subline: profile ? `on ${profile.name}` : null,
        platform: profile?.platform ?? null,
      });
    }
  }

  for (const row of reportsRes.data ?? []) {
    const profile = profileById.get(row.profile_id);
    events.push({
      id: `diag:${row.id}`,
      kind: "diagnostic_completed",
      occurredAt: row.created_at,
      profileId: row.profile_id,
      profileName: profile?.name ?? null,
      detectorType: null,
      severity: null,
      headline: "AI diagnostic completed",
      subline: profile ? `on ${profile.name}` : null,
      platform: profile?.platform ?? null,
    });
  }

  for (const row of connectionsRes.data ?? []) {
    if (!row.last_synced_at) continue;
    events.push({
      id: `sync:${row.id}:${row.last_synced_at}`,
      kind: "sync_completed",
      occurredAt: row.last_synced_at,
      profileId: null,
      profileName: null,
      detectorType: null,
      severity: null,
      headline: `${platformLabel(row.platform as Platform)} synced`,
      subline: null,
      platform: row.platform as Platform,
    });
  }

  events.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
  return events.slice(0, limit);
}

/**
 * Batch fetch last-N-day snapshots for every workspace profile. Returned as a
 * map keyed by profile id so cards can render sparklines without N+1 queries.
 */
export async function getProfileSparklines(
  supabase: Client,
  workspaceId: string,
  days = 14,
): Promise<Record<string, SparklinePoint[]>> {
  const { data: profiles, error: profilesError } = await supabase
    .from("automation_profiles")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (profilesError) throw profilesError;

  const profileIds = (profiles ?? []).map((p) => p.id);
  if (profileIds.length === 0) return {};

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("profile_health_snapshots")
    .select("profile_id, captured_on, health_score")
    .in("profile_id", profileIds)
    .gte("captured_on", sinceDate)
    .order("captured_on", { ascending: true });
  if (error) throw error;

  const byProfile: Record<string, SparklinePoint[]> = {};
  for (const row of data ?? []) {
    const list = byProfile[row.profile_id] ?? [];
    list.push({ captured_on: row.captured_on, score: row.health_score });
    byProfile[row.profile_id] = list;
  }
  return byProfile;
}

/**
 * Dense profile cards with everything needed for the dashboard grid:
 * score, counts, last sync, distinct open detector types, and sparkline.
 */
export async function getWorkspaceProfileCards(
  supabase: Client,
  workspaceId: string,
): Promise<WorkspaceProfileCardData[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from("automation_profiles")
    .select(
      "id, name, platform, industry, health_score, last_audit_at, scenario_count, automation_issues(id, type, severity, status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("automation_issues.status", "open")
    .order("created_at", { ascending: false });
  if (profilesError) throw profilesError;

  const profileRows = (profiles ?? []) as Array<{
    id: string;
    name: string;
    platform: string;
    industry: string | null;
    health_score: number;
    last_audit_at: string | null;
    scenario_count: number;
    automation_issues: Array<{
      id: string;
      type: string | null;
      severity: string;
      status: string;
    }>;
  }>;
  if (profileRows.length === 0) return [];

  const sparklines = await getProfileSparklines(supabase, workspaceId, 14);

  const { data: connections, error: connError } = await supabase
    .from("platform_connections")
    .select("platform, last_synced_at, zone, team_id, instance_url, status")
    .eq("workspace_id", workspaceId);
  if (connError) throw connError;

  const syncByPlatform = new Map<Platform, string>();
  const urlByPlatform = new Map<Platform, string>();
  for (const row of connections ?? []) {
    const platform = row.platform as Platform;
    if (row.last_synced_at) {
      const existing = syncByPlatform.get(platform);
      if (!existing || row.last_synced_at > existing) {
        syncByPlatform.set(platform, row.last_synced_at);
      }
    }
    if (!urlByPlatform.has(platform)) {
      const url = buildPlatformDashboardUrl(
        platform,
        row.zone,
        row.team_id,
        row.instance_url,
      );
      if (url) urlByPlatform.set(platform, url);
    }
  }

  return profileRows.map((profile) => {
    const openIssues = profile.automation_issues ?? [];
    const criticalIssueCount = openIssues.filter(
      (i) => i.severity === "critical",
    ).length;

    const types = new Set<IssueType>();
    for (const issue of openIssues) {
      if (isIssueType(issue.type)) types.add(issue.type);
    }

    const sparkline = sparklines[profile.id] ?? [];
    const sparklineDelta =
      sparkline.length >= 2
        ? profile.health_score - sparkline[0].score
        : null;

    return {
      id: profile.id,
      name: profile.name,
      platform: profile.platform as Platform,
      industry: profile.industry,
      healthScore: profile.health_score,
      openIssueCount: openIssues.length,
      criticalIssueCount,
      automationCount: profile.scenario_count ?? 0,
      lastAuditAt: profile.last_audit_at,
      lastSyncedAt: syncByPlatform.get(profile.platform as Platform) ?? null,
      openIssueTypes: Array.from(types),
      sparkline,
      sparklineDelta,
      platformUrl: urlByPlatform.get(profile.platform as Platform) ?? null,
    };
  });
}

function buildPlatformDashboardUrl(
  platform: Platform,
  zone: string | null,
  teamId: number | null,
  instanceUrl: string | null,
): string | null {
  if (platform === "make" && zone && teamId) {
    return `https://${zone}.make.com/${teamId}/scenarios`;
  }
  if (platform === "n8n" && instanceUrl) {
    return `${instanceUrl.replace(/\/$/, "")}/workflows`;
  }
  return null;
}

interface RawSnapshotRow {
  profile_id: string;
  captured_on: string;
  health_score: number;
}

/**
 * Build a continuous 30-day trend by averaging per-day snapshots across
 * profiles and carrying forward the last-known score for gaps so the line
 * stays connected even when sync cadences vary between profiles.
 */
export function buildWorkspaceTrend(
  snapshots: RawSnapshotRow[],
  profileIds: string[],
): PulseTrendPoint[] {
  if (snapshots.length === 0 || profileIds.length === 0) return [];

  const byDate = new Map<string, Map<string, number>>();
  const allDates = new Set<string>();
  for (const row of snapshots) {
    const perProfile = byDate.get(row.captured_on) ?? new Map<string, number>();
    perProfile.set(row.profile_id, row.health_score);
    byDate.set(row.captured_on, perProfile);
    allDates.add(row.captured_on);
  }

  if (allDates.size === 0) return [];

  const sortedDates = Array.from(allDates).sort();
  const firstDate = sortedDates[0];
  const lastDate = new Date().toISOString().slice(0, 10);

  const days = enumerateDates(firstDate, lastDate);
  const lastKnown = new Map<string, number>();
  const result: PulseTrendPoint[] = [];

  for (const day of days) {
    const perProfile = byDate.get(day);
    if (perProfile) {
      perProfile.forEach((score, pid) => {
        lastKnown.set(pid, score);
      });
    }
    if (lastKnown.size === 0) continue;
    let sum = 0;
    let count = 0;
    for (const pid of profileIds) {
      const score = lastKnown.get(pid);
      if (score !== undefined) {
        sum += score;
        count += 1;
      }
    }
    if (count > 0) {
      result.push({ captured_on: day, score: Math.round(sum / count) });
    }
  }
  return result;
}

function enumerateDates(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const start = new Date(`${fromISO}T00:00:00Z`);
  const end = new Date(`${toISO}T00:00:00Z`);
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function platformLabel(platform: Platform): string {
  return platform === "make" ? "Make.com" : "n8n";
}

/**
 * Triage table data: dashboard card data + per-automation health buckets,
 * severity-split issue counts, snooze state, and sync-freshness label.
 * One extra round-trip vs. card query (automations.status aggregation).
 */
export async function getWorkspaceProfileTriage(
  supabase: Client,
  workspaceId: string,
): Promise<WorkspaceProfileTriageRow[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from("automation_profiles")
    .select(
      "id, name, platform, industry, health_score, last_audit_at, scenario_count, snoozed_until, automation_issues(id, type, severity, status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("automation_issues.status", "open")
    .order("created_at", { ascending: false });
  if (profilesError) throw profilesError;

  const profileRows = (profiles ?? []) as Array<{
    id: string;
    name: string;
    platform: string;
    industry: string | null;
    health_score: number;
    last_audit_at: string | null;
    scenario_count: number;
    snoozed_until: string | null;
    automation_issues: Array<{
      id: string;
      type: string | null;
      severity: string;
      status: string;
    }>;
  }>;
  if (profileRows.length === 0) return [];

  const profileIds = profileRows.map((p) => p.id);

  const [sparklines, connectionsRes, automationsRes] = await Promise.all([
    getProfileSparklines(supabase, workspaceId, 14),
    supabase
      .from("platform_connections")
      .select("platform, last_synced_at, zone, team_id, instance_url")
      .eq("workspace_id", workspaceId),
    supabase
      .from("automations")
      .select("profile_id, status, total_runs, failed_runs")
      .in("profile_id", profileIds),
  ]);
  if (connectionsRes.error) throw connectionsRes.error;
  if (automationsRes.error) throw automationsRes.error;

  const syncByPlatform = new Map<Platform, string>();
  const urlByPlatform = new Map<Platform, string>();
  for (const row of connectionsRes.data ?? []) {
    const platform = row.platform as Platform;
    if (row.last_synced_at) {
      const existing = syncByPlatform.get(platform);
      if (!existing || row.last_synced_at > existing) {
        syncByPlatform.set(platform, row.last_synced_at);
      }
    }
    if (!urlByPlatform.has(platform)) {
      const url = buildPlatformDashboardUrl(
        platform,
        row.zone,
        row.team_id,
        row.instance_url,
      );
      if (url) urlByPlatform.set(platform, url);
    }
  }

  const automationHealthByProfile = new Map<string, AutomationHealthBuckets>();
  for (const row of automationsRes.data ?? []) {
    const bucket = automationHealthByProfile.get(row.profile_id) ?? {
      green: 0,
      amber: 0,
      red: 0,
      total: 0,
    };
    bucket.total += 1;
    bucket[bucketAutomation(row.status, row.total_runs, row.failed_runs)] += 1;
    automationHealthByProfile.set(row.profile_id, bucket);
  }

  return profileRows.map((profile) => {
    const openIssues = profile.automation_issues ?? [];
    const severityCounts: SeverityCounts = { critical: 0, warning: 0, info: 0 };
    const types = new Set<IssueType>();
    for (const issue of openIssues) {
      if (issue.severity === "critical") severityCounts.critical += 1;
      else if (issue.severity === "warning") severityCounts.warning += 1;
      else if (issue.severity === "info") severityCounts.info += 1;
      if (isIssueType(issue.type)) types.add(issue.type);
    }

    const sparkline = sparklines[profile.id] ?? [];
    const sparklineDelta =
      sparkline.length >= 2 ? profile.health_score - sparkline[0].score : null;

    const lastSyncedAt = syncByPlatform.get(profile.platform as Platform) ?? null;

    return {
      id: profile.id,
      name: profile.name,
      platform: profile.platform as Platform,
      industry: profile.industry,
      healthScore: profile.health_score,
      openIssueCount: openIssues.length,
      criticalIssueCount: severityCounts.critical,
      automationCount: profile.scenario_count ?? 0,
      lastAuditAt: profile.last_audit_at,
      lastSyncedAt,
      openIssueTypes: Array.from(types),
      sparkline,
      sparklineDelta,
      platformUrl: urlByPlatform.get(profile.platform as Platform) ?? null,
      severityCounts,
      automationHealth:
        automationHealthByProfile.get(profile.id) ?? {
          green: 0,
          amber: 0,
          red: 0,
          total: profile.scenario_count ?? 0,
        },
      snoozedUntil: profile.snoozed_until,
      freshness: deriveFreshness(lastSyncedAt),
    };
  });
}

function bucketAutomation(
  status: string,
  totalRuns: number,
  failedRuns: number,
): "green" | "amber" | "red" {
  const inactive =
    status === "disabled" ||
    status === "inactive" ||
    status === "paused" ||
    status === "off";
  if (inactive) return "red";
  if (totalRuns > 0 && failedRuns / totalRuns > 0.1) return "amber";
  return "green";
}

/**
 * Sync freshness buckets used by the table dot indicator and "Stale sync"
 * filter chip. Thresholds: <1h fresh, <24h recent, >7d stale; null = never.
 */
export function deriveFreshness(
  lastSyncedAt: string | null,
  now: Date = new Date(),
): SyncFreshness {
  if (!lastSyncedAt) return "never";
  const diff = now.getTime() - new Date(lastSyncedAt).getTime();
  if (Number.isNaN(diff)) return "never";
  const hour = 60 * 60 * 1000;
  if (diff < hour) return "fresh";
  if (diff < 7 * 24 * hour) return "recent";
  return "stale";
}
