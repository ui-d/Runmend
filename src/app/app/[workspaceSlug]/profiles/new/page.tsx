import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceProfiles } from "@/lib/queries/profiles";
import { getWorkspaceConnections } from "@/lib/queries/connections";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
import { checkPlanLimit, resolveEffectivePlan } from "@/lib/stripe";
import { ProfileForm } from "@/components/app/ProfileForm";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ connectionId?: string | string[] }>;
}

export default async function NewProfilePage({
  params,
  searchParams,
}: PageProps) {
  const { workspaceSlug } = await params;
  const { connectionId: rawConnectionId } = await searchParams;
  const initialConnectionId = Array.isArray(rawConnectionId)
    ? rawConnectionId[0]
    : rawConnectionId;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const [profiles, connections, subscription] = await Promise.all([
    getWorkspaceProfiles(supabase, workspace.id),
    getWorkspaceConnections(supabase, workspace.id),
    getWorkspaceSubscription(supabase, workspace.id),
  ]);
  const plan = resolveEffectivePlan(subscription);
  const limitCheck = checkPlanLimit(plan, "profiles", profiles.length);

  const connectionOptions = connections.map((c) => ({
    id: c.id,
    platform: c.platform,
    displayName: c.display_name,
    status: c.status,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        Create Profile
      </h1>
      <ProfileForm
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        currentProfileCount={profiles.length}
        plan={plan}
        profileLimit={limitCheck.limit}
        connections={connectionOptions}
        initialConnectionId={initialConnectionId}
      />
    </div>
  );
}
