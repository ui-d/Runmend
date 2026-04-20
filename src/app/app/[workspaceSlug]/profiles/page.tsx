import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceProfiles } from "@/lib/queries/profiles";
import {
  getHealthStatus,
  getHealthColorClasses,
  getHealthLabel,
  getPlatformLabel,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  BarChart3,
  AlertTriangle,
  Search,
} from "lucide-react";
import { ProfilesFilter } from "@/components/app/ProfilesFilter";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{
    q?: string;
    platform?: string;
    status?: string;
    sort?: string;
  }>;
}

export default async function ProfilesPage({
  params,
  searchParams,
}: PageProps) {
  const { workspaceSlug } = await params;
  const filters = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) redirect("/app");

  const allProfiles = await getWorkspaceProfiles(supabase, workspace.id);

  // Apply filters
  let profiles = allProfiles;

  if (filters.q) {
    const q = filters.q.toLowerCase();
    profiles = profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.industry && p.industry.toLowerCase().includes(q))
    );
  }

  if (filters.platform && filters.platform !== "all") {
    profiles = profiles.filter((p) => p.platform === filters.platform);
  }

  if (filters.status && filters.status !== "all") {
    profiles = profiles.filter(
      (p) => getHealthStatus(p.health_score) === filters.status
    );
  }

  // Sort
  const sortKey = filters.sort ?? "name";
  profiles = [...profiles].sort((a, b) => {
    switch (sortKey) {
      case "health-asc":
        return a.health_score - b.health_score;
      case "health-desc":
        return b.health_score - a.health_score;
      case "issues":
        return b.automation_issues.length - a.automation_issues.length;
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const totalIssues = allProfiles.reduce(
    (sum, p) => sum + p.automation_issues.length,
    0
  );
  const criticalCount = allProfiles.reduce(
    (sum, p) =>
      sum +
      p.automation_issues.filter((i) => i.severity === "critical").length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allProfiles.length} profile{allProfiles.length !== 1 ? "s" : ""}
            {totalIssues > 0 && (
              <span>
                {" "}
                &middot; {totalIssues} issue{totalIssues !== 1 ? "s" : ""}
                {criticalCount > 0 && (
                  <span className="text-red-500">
                    {" "}
                    ({criticalCount} critical)
                  </span>
                )}
              </span>
            )}
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

      <ProfilesFilter
        workspaceSlug={workspaceSlug}
        currentFilters={filters}
      />

      {profiles.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            {allProfiles.length === 0 ? (
              <>
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
              </>
            ) : (
              <>
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No matching profiles</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Platform</th>
                <th className="text-left font-medium px-4 py-3">Health</th>
                <th className="text-left font-medium px-4 py-3">
                  Automations
                </th>
                <th className="text-left font-medium px-4 py-3">Issues</th>
                <th className="text-left font-medium px-4 py-3">Last Sync</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const status = getHealthStatus(profile.health_score);
                const colors = getHealthColorClasses(status);
                const critCount = profile.automation_issues.filter(
                  (i) => i.severity === "critical"
                ).length;
                const warnCount = profile.automation_issues.filter(
                  (i) => i.severity === "warning"
                ).length;

                return (
                  <tr
                    key={profile.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/${workspaceSlug}/profiles/${profile.id}`}
                        className="font-medium hover:underline"
                      >
                        {profile.name}
                      </Link>
                      {profile.industry && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {profile.industry}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {getPlatformLabel(
                          profile.platform as "make" | "n8n"
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-lg font-bold ${colors.text}`}
                        >
                          {profile.health_score}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${colors.text}`}
                        >
                          {getHealthLabel(status)}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {profile.scenario_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {profile.automation_issues.length === 0 ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          {critCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              {critCount}
                            </span>
                          )}
                          {warnCount > 0 && (
                            <span className="text-yellow-500 text-xs font-medium">
                              {warnCount} warn
                            </span>
                          )}
                          {profile.automation_issues.length -
                            critCount -
                            warnCount >
                            0 && (
                            <span className="text-muted-foreground text-xs">
                              {profile.automation_issues.length -
                                critCount -
                                warnCount}{" "}
                              info
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {profile.last_audit_at
                        ? new Date(
                            profile.last_audit_at
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
