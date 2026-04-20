import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, BarChart3, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import {
  getWorkspaceProfileTriage,
  getWorkspacePulse,
} from "@/lib/queries/workspace-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { TriageTable } from "@/components/app/profiles/TriageTable";
import { WorkspaceSummaryHeader } from "@/components/app/profiles/WorkspaceSummaryHeader";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function ProfilesPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) redirect("/app");

  const [rows, pulse] = await Promise.all([
    getWorkspaceProfileTriage(supabase, workspace.id),
    getWorkspacePulse(supabase, workspace.id),
  ]);

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
              No profiles yet. Create one to start monitoring.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/app/${workspaceSlug}/profiles/new`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            New profile
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <div>
              <h3 className="text-lg font-medium">No profiles yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first automation profile to start monitoring.
              </p>
            </div>
            <Link
              href={`/app/${workspaceSlug}/profiles/new`}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Create profile
            </Link>
          </CardContent>
        </Card>
      ) : (
        <TriageTable workspaceSlug={workspaceSlug} rows={rows} />
      )}
    </div>
  );
}
