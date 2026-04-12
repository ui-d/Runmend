import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceConnections } from "@/lib/queries/connections";
import { ConnectionsClient } from "./connections-client";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function ConnectionsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const connections = await getWorkspaceConnections(supabase, workspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your automation platforms to sync real data
        </p>
      </div>
      <ConnectionsClient
        workspaceId={workspace.id}
        connections={connections}
      />
    </div>
  );
}
