import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceConnections } from "@/lib/queries/connections";
import {
  getWorkspacePulse,
  getWorkspaceOpenIssues,
  getWorkspaceActivity,
  getWorkspaceProfileCards,
} from "@/lib/queries/workspace-dashboard";
import { rollupDetectorStates } from "@/lib/dashboard/derivations";
import { OnboardingWizard } from "@/components/app/OnboardingWizard";
import { WorkspacePulse } from "@/components/app/dashboard/WorkspacePulse";
import { WorkspaceDetectorStrip } from "@/components/app/dashboard/WorkspaceDetectorStrip";
import { ActivityFeed } from "@/components/app/dashboard/ActivityFeed";
import { ProfilePulseCard } from "@/components/app/dashboard/ProfilePulseCard";
import { NextStepsStrip } from "@/components/app/dashboard/NextStepsStrip";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

const PROFILE_PREVIEW_COUNT = 4;

export default async function WorkspaceDashboard({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) redirect("/app");

  const [
    pulse,
    rollupIssues,
    activity,
    profileCards,
    connections,
    memberCount,
  ] = await Promise.all([
    getWorkspacePulse(supabase, workspace.id),
    getWorkspaceOpenIssues(supabase, workspace.id),
    getWorkspaceActivity(supabase, workspace.id, 12),
    getWorkspaceProfileCards(supabase, workspace.id),
    getWorkspaceConnections(supabase, workspace.id),
    getMemberCount(supabase, workspace.id),
  ]);

  const detectorRollup = rollupDetectorStates(rollupIssues);
  const hasAnyProfiles = profileCards.length > 0;
  const hasActiveConnection = connections.some((c) => c.status === "active");
  // `getWorkspacePulse` already computes nextSyncAt from active schedules,
  // so a non-null value is proof at least one schedule is active.
  const hasSchedule = pulse.nextSyncAt !== null;

  // Show onboarding wizard only when the workspace is effectively empty.
  const showOnboarding = !hasAnyProfiles;

  // Profile preview: worst-first (criticals desc, then score asc). At scale,
  // the full list lives on /profiles.
  const orderedProfiles = [...profileCards].sort((a, b) => {
    if (b.criticalIssueCount !== a.criticalIssueCount) {
      return b.criticalIssueCount - a.criticalIssueCount;
    }
    return a.healthScore - b.healthScore;
  });
  const previewProfiles = orderedProfiles.slice(0, PROFILE_PREVIEW_COUNT);
  const extraProfileCount = Math.max(0, orderedProfiles.length - PROFILE_PREVIEW_COUNT);
  const nextStepsState = {
    hasConnection: hasActiveConnection,
    hasProfile: hasAnyProfiles,
    hasSchedule,
    hasAlerts: false, // Alerts config not yet wired — always remind.
    hasTeammates: memberCount > 1,
  };

  return (
    <div className="space-y-6">
      {showOnboarding && (
        <OnboardingWizard
          workspaceSlug={workspaceSlug}
          hasConnections={hasActiveConnection}
          hasProfiles={hasAnyProfiles}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automation health</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace.name}
            {hasAnyProfiles
              ? ` · ${pulse.totalProfiles} profile${pulse.totalProfiles === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <Link
          href={`/app/${workspaceSlug}/profiles/new`}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Profile
        </Link>
      </div>

      <WorkspacePulse
        pulse={pulse}
        workspaceSlug={workspaceSlug}
        hasAnyProfiles={hasAnyProfiles}
      />

      {hasAnyProfiles && <WorkspaceDetectorStrip rollup={detectorRollup} />}

      {hasAnyProfiles && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Profiles</h2>
              {extraProfileCount > 0 && (
                <Link
                  href={`/app/${workspaceSlug}/profiles`}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all {orderedProfiles.length} profiles →
                </Link>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {previewProfiles.map((profile) => (
                <ProfilePulseCard
                  key={profile.id}
                  profile={profile}
                  workspaceSlug={workspaceSlug}
                />
              ))}
            </div>
          </div>
          <ActivityFeed events={activity} workspaceSlug={workspaceSlug} />
        </div>
      )}

      <NextStepsStrip workspaceSlug={workspaceSlug} state={nextStepsState} />
    </div>
  );
}

async function getMemberCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
): Promise<number> {
  const { count } = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  return count ?? 0;
}
