import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/queries/profiles";
import { getProfileSchedule } from "@/lib/queries/schedules";
import { normalizeProfile } from "@/lib/normalize";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

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

  // Check if there's an active connection for this profile's platform
  const { data: connection } = await supabase
    .from("platform_connections")
    .select("id, status, last_synced_at")
    .eq("workspace_id", dbProfile.workspace_id)
    .eq("platform", dbProfile.platform)
    .eq("status", "active")
    .maybeSingle();

  // Check if auto-sync schedule exists
  const schedule = await getProfileSchedule(supabase, profileId);

  const profile = normalizeProfile(dbProfile, dbProfile.automation_issues);

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
