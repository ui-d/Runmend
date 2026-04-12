import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/queries/profiles";
import { getProfileDiagnostics } from "@/lib/queries/diagnostics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ workspaceSlug: string; profileId: string }>;
}

export default async function DiagnosticsHistoryPage({ params }: PageProps) {
  const { workspaceSlug, profileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfileById(supabase, profileId);
  if (!profile) notFound();

  const reports = await getProfileDiagnostics(supabase, profileId, 50);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/${workspaceSlug}/profiles/${profileId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Diagnostic History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile.name} — {reports.length} report
          {reports.length !== 1 ? "s" : ""}
        </p>
      </div>

      {reports.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No diagnostic reports yet. Generate one from the profile dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {new Date(report.created_at).toLocaleString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {report.triggered_by}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {report.model_used}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider mb-1">
                    Overall Assessment
                  </p>
                  <p className="text-sm leading-relaxed">
                    {report.overall_health}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-500/70 uppercase tracking-wider mb-1">
                    Critical Finding
                  </p>
                  <p className="text-sm leading-relaxed">
                    {report.most_dangerous}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider mb-1">
                    Recommendations
                  </p>
                  <p className="text-sm leading-relaxed">
                    {report.recommendations}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
