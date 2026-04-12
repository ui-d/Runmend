import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaces, createWorkspace } from "@/lib/queries/workspaces";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspaces = await getUserWorkspaces(supabase);

  if (workspaces.length > 0) {
    redirect(`/app/${workspaces[0].slug}`);
  }

  // No workspaces — auto-create a default one
  const slug = user.email
    ? user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-")
    : `workspace-${user.id.slice(0, 8)}`;

  const workspace = await createWorkspace(supabase, {
    name: "My Workspace",
    slug,
    ownerId: user.id,
  });

  redirect(`/app/${workspace.slug}`);
}
