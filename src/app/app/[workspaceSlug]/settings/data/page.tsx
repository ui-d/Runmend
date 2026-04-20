import { notFound, redirect } from "next/navigation";
import { Download, FileArchive, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { SectionHeader } from "@/components/app/settings/SectionHeader";
import { ComingSoonInline } from "@/components/app/settings/ComingSoonInline";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function DataSettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Data"
        description="Export workspace data and control how long Runmend keeps your history."
      />

      <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-muted/60 p-2">
              <Download className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Export workspace data</p>
                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Coming soon
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Download profiles, connections, issues, and diagnostic reports
                as JSON. Useful for migrations, audits, or offline analysis.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="h-8 shrink-0 rounded-lg border border-border/60 bg-muted/30 px-3 text-xs font-medium text-muted-foreground disabled:cursor-not-allowed"
          >
            Request export
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <ComingSoonInline
          icon={FileArchive}
          title="Data retention"
          description="Choose how long execution history and diagnostic reports are kept. Defaults to 90 days on all plans."
        />
        <ComingSoonInline
          icon={ShieldCheck}
          title="GDPR / DPA requests"
          description="Submit access or deletion requests for personal data. For now, email privacy@runmend.app and we'll handle it within 72 hours."
        />
      </div>
    </section>
  );
}
