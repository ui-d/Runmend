import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import {
  getConnectionsWithHealth,
  getInterestVoteCounts,
  getUserVotes,
} from "@/lib/queries/connections";
import {
  AVAILABLE_CONNECTORS,
  COMING_SOON_CONNECTORS,
} from "@/lib/connections/catalog";
import { ConnectionsCatalog } from "@/components/app/connections/ConnectionsCatalog";

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

  const votableSlugs = [
    ...AVAILABLE_CONNECTORS.filter((e) => e.comingSoon).map((e) => e.slug),
    ...COMING_SOON_CONNECTORS.map((e) => e.slug),
  ];

  const [connections, voteCounts, userVotes] = await Promise.all([
    getConnectionsWithHealth(supabase, workspace.id),
    getInterestVoteCounts(supabase, workspace.id, votableSlugs),
    getUserVotes(supabase, workspace.id, user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect the platforms Runmend should monitor. Connections sync every
          15 min by default.
        </p>
      </div>
      <ConnectionsCatalog
        workspaceId={workspace.id}
        connections={connections}
        voteCounts={voteCounts}
        userVotedSlugs={Array.from(userVotes)}
      />
    </div>
  );
}
