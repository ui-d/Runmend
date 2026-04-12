import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug, getUserWorkspaces } from "@/lib/queries/workspaces";
import { Sidebar } from "@/components/app/Sidebar";
import { WorkspaceSelector } from "@/components/app/WorkspaceSelector";
import { UserMenu } from "@/components/auth/UserMenu";
import { NotificationBell } from "@/components/app/NotificationBell";
import { ErrorBoundary } from "@/components/app/ErrorBoundary";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";

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

  const allWorkspaces = await getUserWorkspaces(supabase);

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const subscription = await getWorkspaceSubscription(supabase, workspace.id);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} plan={subscription?.plan ?? "free"} />
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
