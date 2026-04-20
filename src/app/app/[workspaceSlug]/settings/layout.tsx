import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { SettingsNav } from "@/components/app/settings/SettingsNav";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}

function formatRelativeCreated(iso: string): string {
  const now = Date.now();
  const created = new Date(iso).getTime();
  const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export default async function SettingsLayout({ children, params }: LayoutProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const { count: memberCount } = await supabase
    .from("workspace_members")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  const members = memberCount ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspace.name} · {members} {members === 1 ? "member" : "members"} · created{" "}
          {formatRelativeCreated(workspace.created_at)}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <SettingsNav workspaceSlug={workspaceSlug} />
        <div className="min-w-0 space-y-8">{children}</div>
      </div>
    </div>
  );
}
