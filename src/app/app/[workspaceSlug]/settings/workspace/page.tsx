import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { SectionHeader } from "@/components/app/settings/SectionHeader";
import { WorkspaceForm } from "@/components/app/settings/WorkspaceForm";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspaceSettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const membership = await getWorkspaceMembership(supabase, workspace.id);
  const canEdit =
    membership?.role === "owner" || membership?.role === "admin";

  const { data: owner } = await supabase
    .from("users")
    .select("email")
    .eq("id", workspace.owner_id)
    .single();

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Workspace"
        description="General information about this workspace — visible to every member."
      />
      <WorkspaceForm
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
        initialName={workspace.name}
        canEdit={canEdit}
        ownerEmail={owner?.email ?? "—"}
        createdAt={workspace.created_at}
      />
    </section>
  );
}
