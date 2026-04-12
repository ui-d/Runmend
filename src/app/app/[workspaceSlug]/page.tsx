import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceProfiles } from "@/lib/queries/profiles";
import { getHealthStatus, getHealthColorClasses, getPlatformLabel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, BarChart3, AlertTriangle, Activity } from "lucide-react";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspaceDashboard({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) redirect("/app");

  const profiles = await getWorkspaceProfiles(supabase, workspace.id);

  const totalProfiles = profiles.length;
  const avgHealth =
    totalProfiles > 0
      ? Math.round(
          profiles.reduce((sum, p) => sum + p.health_score, 0) / totalProfiles
        )
      : 0;
  const criticalIssues = profiles.reduce(
    (sum, p) =>
      sum +
      p.automation_issues.filter((i) => i.severity === "critical").length,
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {workspace.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalProfiles} automation profile{totalProfiles !== 1 ? "s" : ""}
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

      {totalProfiles > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProfiles}</p>
                <p className="text-xs text-muted-foreground">Profiles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgHealth}</p>
                <p className="text-xs text-muted-foreground">Avg Health</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalIssues}</p>
                <p className="text-xs text-muted-foreground">
                  Critical Issues
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {totalProfiles === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No profiles yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Create your first automation profile to start monitoring
            </p>
            <Link
              href={`/app/${workspaceSlug}/profiles/new`}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90 transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Profile
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const status = getHealthStatus(profile.health_score);
            const colors = getHealthColorClasses(status);
            const critCount = profile.automation_issues.filter(
              (i) => i.severity === "critical"
            ).length;

            return (
              <Link
                key={profile.id}
                href={`/app/${workspaceSlug}/profiles/${profile.id}`}
              >
                <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base truncate">
                        {profile.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {getPlatformLabel(profile.platform as "zapier" | "make" | "n8n")}
                      </Badge>
                    </div>
                    {profile.industry && (
                      <p className="text-xs text-muted-foreground">
                        {profile.industry}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${colors.text}`}>
                        {profile.health_score}
                      </span>
                      <div className="text-right text-xs text-muted-foreground">
                        {critCount > 0 && (
                          <span className="text-red-500 font-medium">
                            {critCount} critical
                          </span>
                        )}
                        <p>
                          {profile.automation_issues.length} issue
                          {profile.automation_issues.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
