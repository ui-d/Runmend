import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { ProfileForm } from "@/components/app/ProfileForm";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewProfilePage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        Create Profile
      </h1>
      <ProfileForm workspaceId={workspace.id} workspaceSlug={workspaceSlug} />
    </div>
  );
}
