import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceProfiles } from "@/lib/queries/profiles";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
import { checkPlanLimit, resolveEffectivePlan } from "@/lib/stripe";
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

  const profiles = await getWorkspaceProfiles(supabase, workspace.id);
  const subscription = await getWorkspaceSubscription(supabase, workspace.id);
  const plan = resolveEffectivePlan(subscription);
  const limitCheck = checkPlanLimit(plan, "profiles", profiles.length);

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
      />
    </div>
  );
}
