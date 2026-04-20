import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getNotificationPreferences } from "@/lib/queries/notifications";
import { normalizeConfig } from "@/lib/notifications/config";
import { SectionHeader } from "@/components/app/settings/SectionHeader";
import { AlertsClient } from "@/components/app/settings/AlertsClient";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function AlertsSettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const preferences = await getNotificationPreferences(
    supabase,
    user.id,
    workspace.id
  );

  const mutedIdSet = new Set<string>();
  for (const row of preferences) {
    normalizeConfig(row.config).muted_profile_ids.forEach((id) =>
      mutedIdSet.add(id)
    );
  }
  const mutedIds = Array.from(mutedIdSet);

  let mutedProfileMap: Record<string, string> = {};
  if (mutedIds.length > 0) {
    const { data: profiles } = await supabase
      .from("automation_profiles")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .in("id", mutedIds);
    if (profiles) {
      mutedProfileMap = Object.fromEntries(
        profiles.map((p) => [p.id, p.name])
      );
    }
  }

  const storedPreferences = preferences.map((p) => ({
    channel: p.channel,
    is_enabled: p.is_enabled,
    config: p.config,
  }));

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Alerts"
        description="How Runmend reaches you when something breaks. Defaults are tuned for critical and warning events — tune them per channel."
      />
      <AlertsClient
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        userEmail={user.email ?? ""}
        storedPreferences={storedPreferences}
        mutedProfileMap={mutedProfileMap}
      />
    </section>
  );
}
