import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import {
  getInterestVoteCounts,
  getUserVotes,
} from "@/lib/queries/connections";
import {
  AVAILABLE_CONNECTORS,
  COMING_SOON_CONNECTORS,
} from "@/lib/connections/catalog";
import { RoadmapCatalog } from "@/components/app/connections/RoadmapCatalog";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function RoadmapPage({ params }: PageProps) {
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

  const [voteCounts, userVotes] = await Promise.all([
    getInterestVoteCounts(supabase, workspace.id, votableSlugs),
    getUserVotes(supabase, workspace.id, user.id),
  ]);

  return (
    <RoadmapCatalog
      workspaceId={workspace.id}
      workspaceSlug={workspaceSlug}
      voteCounts={voteCounts}
      userVotedSlugs={Array.from(userVotes)}
    />
  );
}
