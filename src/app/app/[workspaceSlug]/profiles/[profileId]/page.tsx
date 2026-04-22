import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/queries/profiles";
import { getProfileSchedule } from "@/lib/queries/schedules";
import { normalizeProfile, type NormalizeContext } from "@/lib/normalize";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { AutomationTile } from "@/components/dashboard/AutomationTileGrid";
import type { Platform } from "@/lib/types";
import {
  ProfileConnectionWidget,
  type ProfileConnectionSummary,
} from "@/components/app/profiles/ProfileConnectionWidget";

interface PageProps {
  params: Promise<{ workspaceSlug: string; profileId: string }>;
}

export default async function ProfileDetailPage({ params }: PageProps) {
  const { workspaceSlug, profileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbProfile = await getProfileById(supabase, profileId);
  if (!dbProfile) notFound();

  const connectionColumns =
    "id, display_name, status, last_synced_at, platform, zone, instance_url, team_id, error_message";

  const [
    { data: boundConnection },
    { data: samePlatformConnections },
    schedule,
    { data: automations },
  ] = await Promise.all([
    dbProfile.connection_id
      ? supabase
          .from("platform_connections")
          .select(connectionColumns)
          .eq("id", dbProfile.connection_id)
          .maybeSingle()
      : Promise.resolve({ data: null as null }),
    supabase
      .from("platform_connections")
      .select(connectionColumns)
      .eq("workspace_id", dbProfile.workspace_id)
      .eq("platform", dbProfile.platform)
      .order("display_name", { ascending: true }),
    getProfileSchedule(supabase, profileId),
    supabase
      .from("automations")
      .select("id, external_id, name, status, last_run_at, total_runs, failed_runs")
      .eq("profile_id", profileId)
      .order("name", { ascending: true }),
  ]);

  const connection =
    boundConnection ??
    (samePlatformConnections ?? []).find((c) => c.status === "active") ??
    (samePlatformConnections ?? [])[0] ??
    null;

  const platformLabel =
    dbProfile.platform === "n8n" ? "n8n" : "Make.com";

  const connectionSummary: ProfileConnectionSummary | null = connection
    ? {
        id: connection.id,
        display_name: connection.display_name,
        platform: connection.platform,
        status: connection.status,
        zone: connection.zone,
        instance_url: connection.instance_url,
        last_synced_at: connection.last_synced_at,
        error_message: connection.error_message,
      }
    : null;

  const availableConnections: ProfileConnectionSummary[] = (
    samePlatformConnections ?? []
  ).map((c) => ({
    id: c.id,
    display_name: c.display_name,
    platform: c.platform,
    status: c.status,
    zone: c.zone,
    instance_url: c.instance_url,
    last_synced_at: c.last_synced_at,
    error_message: c.error_message,
  }));

  const normalizeContext: NormalizeContext | undefined = connection
    ? {
        connection: {
          platform: connection.platform as Platform,
          zone: connection.zone,
          instanceUrl: connection.instance_url,
          teamId: connection.team_id,
        },
        automationExternalIdByName: new Map(
          (automations ?? [])
            .filter((a) => a.external_id && a.name)
            .map((a) => [a.name, a.external_id as string])
        ),
      }
    : undefined;

  const profile = normalizeProfile(
    dbProfile,
    dbProfile.automation_issues,
    normalizeContext
  );

  const automationTiles: AutomationTile[] = (automations ?? []).map((a) => ({
    id: a.id,
    externalId: a.external_id,
    name: a.name,
    status: a.status,
    lastRunAt: a.last_run_at,
    totalRuns: a.total_runs,
    failedRuns: a.failed_runs,
  }));

  return (
    <DashboardShell
      profile={profile}
      hasConnection={!!connection}
      lastSyncedAt={connection?.last_synced_at}
      isAuthenticatedView
      diagnosticsHistoryUrl={`/app/${workspaceSlug}/profiles/${profileId}/diagnostics`}
      scheduleActive={schedule?.is_active ?? false}
      backHref={`/app/${workspaceSlug}/profiles`}
      backLabel="Profiles"
      automations={automationTiles}
      connectionContext={normalizeContext?.connection ?? null}
      connectionSlot={
        <ProfileConnectionWidget
          profileId={profileId}
          profileName={dbProfile.name}
          workspaceSlug={workspaceSlug}
          connection={connectionSummary}
          platformLabel={platformLabel}
          availableConnections={availableConnections}
        />
      }
    />
  );
}
