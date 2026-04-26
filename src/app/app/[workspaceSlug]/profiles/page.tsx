import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceProfiles } from "@/lib/queries/profiles";
import { getWorkspaceConnections } from "@/lib/queries/connections";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
import { checkPlanLimit, resolveEffectivePlan } from "@/lib/stripe";
import {
  getWorkspaceProfileTriage,
  getWorkspacePulse,
} from "@/lib/queries/workspace-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { TriageTable } from "@/components/app/profiles/TriageTable";
import { WorkspaceSummaryHeader } from "@/components/app/profiles/WorkspaceSummaryHeader";
import { NewProfileButton } from "@/components/app/profiles/NewProfileButton";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ new?: string; connectionId?: string | string[] }>;
}

export default async function ProfilesPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const { new: newParam, connectionId: rawConnectionId } = await searchParams;
  const initialConnectionId = Array.isArray(rawConnectionId)
    ? rawConnectionId[0]
    : rawConnectionId;
  const initialOpen = newParam === "1" || newParam === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) redirect("/app");

  const [rows, pulse, profiles, connections, subscription] = await Promise.all([
    getWorkspaceProfileTriage(supabase, workspace.id),
    getWorkspacePulse(supabase, workspace.id),
    getWorkspaceProfiles(supabase, workspace.id),
    getWorkspaceConnections(supabase, workspace.id),
    getWorkspaceSubscription(supabase, workspace.id),
  ]);

  const plan = resolveEffectivePlan(subscription);
  const limitCheck = checkPlanLimit(plan, "profiles", profiles.length);
  const connectionOptions = connections.map((c) => ({
    id: c.id,
    platform: c.platform,
    displayName: c.display_name,
    status: c.status,
  }));

  let warning = 0;
  let info = 0;
  for (const r of rows) {
    warning += r.severityCounts.warning;
    info += r.severityCounts.info;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Profiles</h1>
          {rows.length > 0 ? (
            <WorkspaceSummaryHeader
              pulse={pulse}
              totalCriticalIssues={pulse.totalCriticalIssues}
              totalWarningIssues={warning}
              totalInfoIssues={info}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No client profiles yet. Create one to start auditing.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NewProfileButton
            workspaceId={workspace.id}
            workspaceSlug={workspaceSlug}
            currentProfileCount={profiles.length}
            plan={plan}
            profileLimit={limitCheck.limit}
            connections={connectionOptions}
            initialConnectionId={initialConnectionId}
            initialOpen={initialOpen}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <div>
              <h3 className="text-lg font-medium">No client profiles yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Each profile is one client backed by one connection. Create your first to begin.
              </p>
            </div>
            <div className="flex justify-center">
              <NewProfileButton
                workspaceId={workspace.id}
                workspaceSlug={workspaceSlug}
                currentProfileCount={profiles.length}
                plan={plan}
                profileLimit={limitCheck.limit}
                connections={connectionOptions}
                initialConnectionId={initialConnectionId}
                label="Create profile"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <TriageTable workspaceSlug={workspaceSlug} rows={rows} />
      )}
    </div>
  );
}
