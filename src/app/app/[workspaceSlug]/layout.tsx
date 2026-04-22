import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug, getUserWorkspaces } from "@/lib/queries/workspaces";
import { Sidebar } from "@/components/app/Sidebar";
import { WorkspaceSelector } from "@/components/app/WorkspaceSelector";
import { UserMenu } from "@/components/auth/UserMenu";
import { NotificationBell } from "@/components/app/NotificationBell";
import { ErrorBoundary } from "@/components/app/ErrorBoundary";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
import { getUserNotifications } from "@/lib/queries/notifications";
import { resolveEffectivePlan } from "@/lib/stripe";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspaceLayout({ children, params }: LayoutProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const [
    allWorkspaces,
    profileRes,
    subscription,
    profileCountRes,
    initialNotifications,
  ] = await Promise.all([
    getUserWorkspaces(supabase),
    supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single(),
    getWorkspaceSubscription(supabase, workspace.id),
    supabase
      .from("automation_profiles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    getUserNotifications(supabase, user.id, {
      workspaceId: workspace.id,
      limit: 20,
    }),
  ]);

  const profile = profileRes.data;
  const profileCount = profileCountRes.count;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        workspaceSlug={workspaceSlug}
        plan={resolveEffectivePlan(subscription)}
        isLtd={subscription?.is_ltd ?? false}
        profileCount={profileCount ?? 0}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <WorkspaceSelector
            workspaces={allWorkspaces.map((w) => ({
              id: w.id,
              name: w.name,
              slug: w.slug,
            }))}
            currentSlug={workspaceSlug}
          />
          <div className="flex items-center gap-2">
            <NotificationBell
              userId={user.id}
              workspaceId={workspace.id}
              workspaceSlug={workspaceSlug}
              initialNotifications={initialNotifications}
            />
            <UserMenu
              email={user.email ?? ""}
              fullName={profile?.full_name ?? null}
            />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
