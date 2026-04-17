import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/queries/profiles";
import { getProfileSchedule } from "@/lib/queries/schedules";
import { normalizeProfile, type NormalizeContext } from "@/lib/normalize";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { Platform } from "@/lib/types";

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

  // Parallel fetch: connection, schedule, and profile automations are independent after profile load
  const [{ data: connection }, schedule, { data: automations }] = await Promise.all([
    supabase
      .from("platform_connections")
      .select("id, status, last_synced_at, platform, zone, instance_url")
      .eq("workspace_id", dbProfile.workspace_id)
      .eq("platform", dbProfile.platform)
      .eq("status", "active")
      .maybeSingle(),
    getProfileSchedule(supabase, profileId),
    supabase
      .from("automations")
      .select("external_id, name")
      .eq("profile_id", profileId),
  ]);

  const normalizeContext: NormalizeContext | undefined = connection
    ? {
        connection: {
          platform: connection.platform as Platform,
          zone: connection.zone,
          instanceUrl: connection.instance_url,
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

  return (
    <DashboardShell
      profile={profile}
      hasConnection={!!connection}
      lastSyncedAt={connection?.last_synced_at}
      isAuthenticatedView
      diagnosticsHistoryUrl={`/app/${workspaceSlug}/profiles/${profileId}/diagnostics`}
      scheduleActive={schedule?.is_active ?? false}
    />
  );
}
