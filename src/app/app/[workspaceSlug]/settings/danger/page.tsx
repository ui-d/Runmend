import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { SectionHeader } from "@/components/app/settings/SectionHeader";
import { DangerZone } from "@/components/app/settings/DangerZone";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function DangerSettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const membership = await getWorkspaceMembership(supabase, workspace.id);
  const canDelete = membership?.role === "owner";

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Danger zone"
        description="Irreversible actions. Make sure you've exported anything you want to keep."
      />
      <DangerZone workspaceSlug={workspace.slug} canDelete={canDelete} />
    </section>
  );
}
